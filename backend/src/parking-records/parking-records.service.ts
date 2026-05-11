import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SpotStatus, ParkingRecordStatus, Zone, MonthlyCard } from '@prisma/client';
import { EntryDto } from './dto/entry.dto';
import { ExitDto } from './dto/exit.dto';
import { SpotsService } from '../spots/spots.service';
import { MonthlyCardsService } from '../monthly-cards/monthly-cards.service';
import { ParkingService } from '../parking/parking.service';
import { PricingService } from './pricing.service';

@Injectable()
export class ParkingRecordsService {
  constructor(
    private prisma: PrismaService,
    private spotsService: SpotsService,
    private monthlyCardsService: MonthlyCardsService,
    private parkingService: ParkingService,
    private pricingService: PricingService,
  ) {}

  async findAll(status?: ParkingRecordStatus, plateNumber?: string): Promise<any[]> {
    const where: any = {};
    if (status) where.status = status;
    if (plateNumber) {
      where.plateNumber = {
        contains: plateNumber,
        mode: 'insensitive',
      };
    }

    return this.prisma.parkingRecord.findMany({
      where,
      include: {
        spot: {
          include: { zone: true },
        },
      },
      orderBy: { entryTime: 'desc' },
      take: 100,
    });
  }

  async findById(id: string): Promise<any> {
    const record = await this.prisma.parkingRecord.findUnique({
      where: { id },
      include: {
        spot: {
          include: { zone: true },
        },
      },
    });
    if (!record) {
      throw new NotFoundException('停车记录不存在');
    }
    return record;
  }

  async findCurrentParking(plateNumber: string): Promise<any> {
    return this.prisma.parkingRecord.findFirst({
      where: {
        plateNumber: { equals: plateNumber, mode: 'insensitive' },
        status: ParkingRecordStatus.PARKING,
      },
      include: {
        spot: {
          include: { zone: true },
        },
      },
    });
  }

  async entry(entryDto: EntryDto): Promise<any> {
    const { plateNumber, zoneId } = entryDto;

    const existingRecord = await this.findCurrentParking(plateNumber);
    if (existingRecord) {
      throw new BadRequestException('该车辆已在场内，请先出场');
    }

    const monthlyCard = await this.monthlyCardsService.findByPlateNumber(plateNumber);
    const targetZoneId = monthlyCard ? monthlyCard.zoneId : zoneId;

    const spot = await this.spotsService.allocateSpot(targetZoneId);
    if (!spot) {
      throw new BadRequestException('没有可用车位');
    }

    return this.prisma.$transaction(async (prisma) => {
      const record = await prisma.parkingRecord.create({
        data: {
          plateNumber: plateNumber.toUpperCase(),
          spotId: spot.id,
          isMonthly: !!monthlyCard,
          status: ParkingRecordStatus.PARKING,
        },
        include: {
          spot: {
            include: { zone: true },
          },
        },
      });

      await prisma.spot.update({
        where: { id: spot.id },
        data: { status: SpotStatus.OCCUPIED },
      });

      await this.parkingService.invalidateCache();

      return {
        record,
        spot,
        isMonthly: !!monthlyCard,
        message: monthlyCard ? '月卡车辆入场' : '临时车辆入场',
      };
    });
  }

  async exit(exitDto: ExitDto): Promise<any> {
    const { plateNumber } = exitDto;

    const record = await this.findCurrentParking(plateNumber);
    if (!record) {
      throw new NotFoundException('未找到该车辆的停车记录');
    }

    const monthlyCard = await this.monthlyCardsService.findByPlateNumber(plateNumber);
    const entryTime = record.entryTime;
    const exitTime = new Date();
    const durationMs = exitTime.getTime() - entryTime.getTime();
    const durationMinutes = Math.ceil(durationMs / (1000 * 60));

    const isMonthlyFree = !!monthlyCard;
    const pricingResult = this.pricingService.calculate(durationMinutes, isMonthlyFree);
    const amount = pricingResult.amount;

    return this.prisma.$transaction(async (prisma) => {
      const updatedRecord = await prisma.parkingRecord.update({
        where: { id: record.id },
        data: {
          exitTime,
          duration: durationMinutes,
          amount,
          status: ParkingRecordStatus.COMPLETED,
        },
        include: {
          spot: {
            include: { zone: true },
          },
        },
      });

      await prisma.spot.update({
        where: { id: record.spotId },
        data: { status: SpotStatus.AVAILABLE },
      });

      await this.parkingService.invalidateCache();

      const receipt = {
        plateNumber: updatedRecord.plateNumber,
        spotCode: updatedRecord.spot.code,
        zoneName: updatedRecord.spot.zone.name,
        entryTime: updatedRecord.entryTime,
        exitTime: updatedRecord.exitTime,
        durationMinutes: updatedRecord.duration,
        durationHours: Math.ceil(updatedRecord.duration / 60),
        amount: updatedRecord.amount,
        isMonthly: updatedRecord.isMonthly,
        isMonthlyFree,
        rateDetail: pricingResult.rateDetail,
      };

      return receipt;
    });
  }

  async getCurrentParkings(plateNumber?: string): Promise<any[]> {
    const where: any = {
      status: ParkingRecordStatus.PARKING,
    };
    if (plateNumber) {
      where.plateNumber = {
        contains: plateNumber,
        mode: 'insensitive',
      };
    }

    const records = await this.prisma.parkingRecord.findMany({
      where,
      include: {
        spot: {
          include: { zone: true },
        },
      },
      orderBy: { entryTime: 'asc' },
    });

    return records.map(record => {
      const now = new Date();
      const durationMs = now.getTime() - record.entryTime.getTime();
      const durationMinutes = Math.floor(durationMs / (1000 * 60));

      return {
        ...record,
        currentDurationMinutes: durationMinutes,
        currentDurationHours: Math.ceil(durationMinutes / 60),
      };
    });
  }

  async getTodayStats(): Promise<any> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const entries = await this.prisma.parkingRecord.count({
      where: {
        entryTime: { gte: today, lt: tomorrow },
      },
    });

    const exits = await this.prisma.parkingRecord.count({
      where: {
        exitTime: { gte: today, lt: tomorrow },
        status: ParkingRecordStatus.COMPLETED,
      },
    });

    const currentParkings = await this.prisma.parkingRecord.count({
      where: {
        status: ParkingRecordStatus.PARKING,
      },
    });

    const todayRevenue = await this.prisma.parkingRecord.aggregate({
      where: {
        exitTime: { gte: today, lt: tomorrow },
        status: ParkingRecordStatus.COMPLETED,
        isMonthly: false,
      },
      _sum: {
        amount: true,
      },
    });

    return {
      todayEntries: entries,
      todayExits: exits,
      currentParkings,
      todayRevenue: todayRevenue._sum.amount || 0,
    };
  }
}
