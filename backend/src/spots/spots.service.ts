import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Spot, SpotStatus } from '@prisma/client';
import { UpdateSpotDto } from './dto/update-spot.dto';
import { ParkingService } from '../parking/parking.service';
import { RedisService } from '../redis/redis.service';

const RESERVATION_KEY_PREFIX = 'reservation:';
const BUFFER_MINUTES = 15;

interface ReservationInfo {
  id: string;
  spotId: string;
  plateNumber: string;
  startTime: string;
  endTime: string;
}

@Injectable()
export class SpotsService {
  constructor(
    private prisma: PrismaService,
    private parkingService: ParkingService,
    private redisService: RedisService,
  ) {}

  async findAll(zoneId?: string, status?: SpotStatus): Promise<Spot[]> {
    const where: any = {};
    if (zoneId) where.zoneId = zoneId;
    if (status) where.status = status;

    return this.prisma.spot.findMany({
      where,
      include: {
        zone: true,
        records: {
          where: { status: 'PARKING' },
        },
      },
      orderBy: { code: 'asc' },
    });
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
          orderBy: { entryTime: 'desc' },
          take: 10,
        },
      },
    });
    if (!spot) {
      throw new NotFoundException('车位不存在');
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
      orderBy: { number: 'asc' },
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
      orderBy: { number: 'asc' },
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
          where: { status: 'PARKING' },
        },
      },
    });
    if (!spot) {
      throw new NotFoundException('车位不存在');
    }

    if (updateSpotDto.status === SpotStatus.MAINTENANCE && spot.records.length > 0) {
      throw new ConflictException('车位当前有车辆停放，无法设置为维修状态');
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
      available: spots.filter(s => s.status === SpotStatus.AVAILABLE).length,
      occupied: spots.filter(s => s.status === SpotStatus.OCCUPIED).length,
      maintenance: spots.filter(s => s.status === SpotStatus.MAINTENANCE).length,
    };

    return result;
  }

  private async getSpotReservations(spotId: string): Promise<ReservationInfo[]> {
    const keys = await this.redisService.keys(`${RESERVATION_KEY_PREFIX}*`);
    const reservations: ReservationInfo[] = [];

    for (const key of keys) {
      const data = await this.redisService.get(key);
      if (data) {
        try {
          const reservation = JSON.parse(data) as ReservationInfo;
          if (reservation.spotId === spotId) {
            reservations.push(reservation);
          }
        } catch {
          // 忽略解析错误
        }
      }
    }

    return reservations;
  }

  async getSpotActiveReservation(spotId: string): Promise<ReservationInfo | null> {
    const reservations = await this.getSpotReservations(spotId);
    const now = new Date();

    for (const reservation of reservations) {
      const start = new Date(reservation.startTime);
      const bufferStart = new Date(start.getTime() - BUFFER_MINUTES * 60 * 1000);
      const end = new Date(reservation.endTime);

      if (now >= bufferStart && now <= end) {
        return reservation;
      }
    }

    return null;
  }

  async findAllWithReservations(zoneId?: string, status?: SpotStatus): Promise<any[]> {
    const spots = await this.findAll(zoneId, status);
    const result = [];

    for (const spot of spots) {
      const reservation = await this.getSpotActiveReservation(spot.id);
      result.push({
        ...spot,
        activeReservation: reservation,
        effectiveStatus: reservation ? 'RESERVED' : spot.status,
      });
    }

    return result;
  }
}
