import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Spot, SpotStatus } from "@prisma/client";
import { UpdateSpotDto } from "./dto/update-spot.dto";
import { ParkingService } from "../parking/parking.service";
import { ReservationsService } from "../reservations/reservations.service";

@Injectable()
export class SpotsService {
  constructor(
    private prisma: PrismaService,
    private parkingService: ParkingService,
    private reservationsService: ReservationsService,
  ) {}

  async findAll(zoneId?: string, status?: SpotStatus): Promise<any[]> {
    const where: any = {};
    if (zoneId) where.zoneId = zoneId;
    if (status) where.status = status;

    const spots = await this.prisma.spot.findMany({
      where,
      include: {
        zone: true,
        records: {
          where: { status: "PARKING" },
        },
      },
      orderBy: { code: "asc" },
    });

    const now = new Date();
    const bufferedNow = new Date(now.getTime() + 15 * 60 * 1000);

    const enrichedSpots = await Promise.all(
      spots.map(async (spot) => {
        if (spot.status === SpotStatus.AVAILABLE) {
          const activeReservations = await this.prisma.reservation.findMany({
            where: {
              spotId: spot.id,
              status: "ACTIVE",
              startTime: { lte: bufferedNow },
              endTime: { gt: now },
            },
            orderBy: { startTime: "asc" },
          });

          if (activeReservations.length > 0) {
            return {
              ...spot,
              isReserved: true,
              reservations: activeReservations,
            };
          }
        }
        return { ...spot, isReserved: false, reservations: [] };
      }),
    );

    return enrichedSpots;
  }

  async findById(id: string): Promise<Spot> {
    const spot = await this.prisma.spot.findUnique({
      where: { id },
      include: {
        zone: true,
        records: {
          include: {
            spot: { include: { zone: true } },
          },
          orderBy: { entryTime: "desc" },
          take: 10,
        },
      },
    });
    if (!spot) {
      throw new NotFoundException("车位不存在");
    }
    return spot;
  }

  async findAvailableSpots(zoneId?: string): Promise<Spot[]> {
    const where: any = {
      status: SpotStatus.AVAILABLE,
    };
    if (zoneId) where.zoneId = zoneId;

    return this.prisma.spot.findMany({
      where,
      include: {
        zone: true,
      },
      orderBy: { number: "asc" },
    });
  }

  async allocateSpot(zoneId?: string): Promise<Spot | null> {
    const where: any = {
      status: SpotStatus.AVAILABLE,
    };
    if (zoneId) where.zoneId = zoneId;

    const spots = await this.prisma.spot.findMany({
      where,
      include: { zone: true },
      orderBy: { number: "asc" },
      take: 1,
    });

    return spots.length > 0 ? spots[0] : null;
  }

  async update(id: string, updateSpotDto: UpdateSpotDto): Promise<Spot> {
    const spot = await this.prisma.spot.findUnique({
      where: { id },
      include: {
        zone: true,
        records: {
          where: { status: "PARKING" },
        },
      },
    });
    if (!spot) {
      throw new NotFoundException("车位不存在");
    }

    if (
      updateSpotDto.status === SpotStatus.MAINTENANCE &&
      spot.records.length > 0
    ) {
      throw new ConflictException("车位当前有车辆停放，无法设置为维修状态");
    }

    const updatedSpot = await this.prisma.spot.update({
      where: { id },
      data: {
        status: updateSpotDto.status,
        description: updateSpotDto.description,
      },
      include: {
        zone: true,
      },
    });

    await this.parkingService.invalidateCache();
    return updatedSpot;
  }

  async updateSpotStatus(id: string, status: SpotStatus): Promise<Spot> {
    const spot = await this.prisma.spot.update({
      where: { id },
      data: { status },
      include: { zone: true },
    });
    await this.parkingService.invalidateCache();
    return spot;
  }

  async getSpotStatusCounts(): Promise<any> {
    const spots = await this.prisma.spot.findMany({
      include: { zone: true },
    });

    const result = {
      total: spots.length,
      available: spots.filter((s) => s.status === SpotStatus.AVAILABLE).length,
      occupied: spots.filter((s) => s.status === SpotStatus.OCCUPIED).length,
      maintenance: spots.filter((s) => s.status === SpotStatus.MAINTENANCE)
        .length,
    };

    return result;
  }
}
