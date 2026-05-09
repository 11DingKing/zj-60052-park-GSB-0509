import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { Parking, Zone, Spot, SpotStatus, UserRole } from '@prisma/client';
import { CreateParkingDto } from './dto/create-parking.dto';
import { UpdateParkingDto } from './dto/update-parking.dto';

@Injectable()
export class ParkingService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  async findAll(): Promise<Parking[]> {
    return this.prisma.parking.findMany({
      include: {
        _count: {
          select: { zones: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string): Promise<Parking & { zones: Zone[] }> {
    const parking = await this.prisma.parking.findUnique({
      where: { id },
      include: {
        zones: {
          include: {
            _count: {
              select: { spots: true },
            },
          },
        },
      },
    });
    if (!parking) {
      throw new NotFoundException('停车场不存在');
    }
    return parking;
  }

  async getDashboard(): Promise<any> {
    const cacheKey = 'parking:dashboard';
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const parkings = await this.prisma.parking.findMany({
      include: {
        zones: {
          include: {
            spots: true,
          },
        },
      },
    });

    const allSpots = await this.prisma.spot.findMany({
      include: {
        zone: true,
        records: {
          where: { status: 'PARKING' },
          include: {
            spot: {
              include: { zone: true },
            },
          },
        },
      },
    });

    const parkingRecords = await this.prisma.parkingRecord.findMany({
      where: { status: 'PARKING' },
      include: {
        spot: {
          include: { zone: true },
        },
      },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayRecords = await this.prisma.parkingRecord.findMany({
      where: {
        OR: [
          { entryTime: { gte: today, lt: tomorrow } },
          { exitTime: { gte: today, lt: tomorrow } },
        ],
      },
    });

    const totalSpots = allSpots.length;
    const occupiedSpots = allSpots.filter(s => s.status === SpotStatus.OCCUPIED).length;
    const availableSpots = allSpots.filter(s => s.status === SpotStatus.AVAILABLE).length;
    const maintenanceSpots = allSpots.filter(s => s.status === SpotStatus.MAINTENANCE).length;

    const zones = await this.prisma.zone.findMany({
      include: {
        spots: true,
      },
    });

    const zoneStats = zones.map(zone => {
      const zoneSpots = zone.spots;
      const zoneOccupied = zoneSpots.filter(s => s.status === SpotStatus.OCCUPIED).length;
      const zoneAvailable = zoneSpots.filter(s => s.status === SpotStatus.AVAILABLE).length;
      const zoneMaintenance = zoneSpots.filter(s => s.status === SpotStatus.MAINTENANCE).length;
      
      return {
        id: zone.id,
        code: zone.code,
        name: zone.name,
        type: zone.type,
        total: zoneSpots.length,
        occupied: zoneOccupied,
        available: zoneAvailable,
        maintenance: zoneMaintenance,
        spots: zoneSpots,
      };
    });

    const todayEntries = todayRecords.filter(r => 
      r.entryTime >= today && r.entryTime < tomorrow
    ).length;
    
    const todayExits = todayRecords.filter(r => 
      r.exitTime && r.exitTime >= today && r.exitTime < tomorrow
    ).length;

    const currentVehicles = parkingRecords.map(record => ({
      id: record.id,
      plateNumber: record.plateNumber,
      spotCode: record.spot.code,
      zoneCode: record.spot.zone.code,
      zoneName: record.spot.zone.name,
      entryTime: record.entryTime,
      isMonthly: record.isMonthly,
    }));

    const result = {
      summary: {
        totalSpots,
        occupiedSpots,
        availableSpots,
        maintenanceSpots,
        todayEntries,
        todayExits,
      },
      zones: zoneStats,
      currentVehicles,
    };

    await this.redisService.set(cacheKey, JSON.stringify(result), 30);
    return result;
  }

  async create(createParkingDto: CreateParkingDto): Promise<Parking> {
    return this.prisma.parking.create({
      data: createParkingDto,
    });
  }

  async update(id: string, updateParkingDto: UpdateParkingDto): Promise<Parking> {
    const parking = await this.prisma.parking.findUnique({
      where: { id },
    });
    if (!parking) {
      throw new NotFoundException('停车场不存在');
    }
    return this.prisma.parking.update({
      where: { id },
      data: updateParkingDto,
    });
  }

  async delete(id: string): Promise<void> {
    const parking = await this.prisma.parking.findUnique({
      where: { id },
    });
    if (!parking) {
      throw new NotFoundException('停车场不存在');
    }
    
    const zones = await this.prisma.zone.findMany({
      where: { parkingId: id },
      include: {
        spots: {
          where: { status: SpotStatus.OCCUPIED },
        },
      },
    });

    const hasOccupiedSpots = zones.some(z => z.spots.length > 0);
    if (hasOccupiedSpots) {
      throw new ConflictException('停车场内有车辆正在停放，无法删除');
    }

    await this.prisma.parking.delete({
      where: { id },
    });
  }

  async invalidateCache(): Promise<void> {
    const keys = await this.redisService.keys('parking:*');
    for (const key of keys) {
      await this.redisService.del(key);
    }
  }
}
