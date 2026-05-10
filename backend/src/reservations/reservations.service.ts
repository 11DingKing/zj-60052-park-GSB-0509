import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { SpotsService } from '../spots/spots.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { SpotStatus } from '@prisma/client';

export interface Reservation {
  id: string;
  spotId: string;
  plateNumber: string;
  startTime: string;
  endTime: string;
  createdAt: string;
  spot?: any;
}

const RESERVATION_KEY_PREFIX = 'reservation:';
const BUFFER_MINUTES = 15;

@Injectable()
export class ReservationsService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private spotsService: SpotsService,
  ) {}

  private getKey(id: string): string {
    return `${RESERVATION_KEY_PREFIX}${id}`;
  }

  private parseReservation(data: string | null): Reservation | null {
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  private generateId(): string {
    return `res_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async getSpotReservations(spotId: string): Promise<Reservation[]> {
    const keys = await this.redisService.keys(`${RESERVATION_KEY_PREFIX}*`);
    const reservations: Reservation[] = [];

    for (const key of keys) {
      const data = await this.redisService.get(key);
      const reservation = this.parseReservation(data);
      if (reservation && reservation.spotId === spotId) {
        reservations.push(reservation);
      }
    }

    return reservations;
  }

  private hasTimeConflict(
    existing: Reservation,
    newStart: Date,
    newEnd: Date,
  ): boolean {
    const existingStart = new Date(existing.startTime);
    const existingEnd = new Date(existing.endTime);
    const existingBufferStart = new Date(existingStart.getTime() - BUFFER_MINUTES * 60 * 1000);

    return !(newEnd <= existingBufferStart || newStart >= existingEnd);
  }

  private validateTimeRange(startTime: string, endTime: string): void {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const now = new Date();

    if (start <= now) {
      throw new BadRequestException('预约开始时间必须晚于当前时间');
    }

    if (end <= start) {
      throw new BadRequestException('结束时间必须晚于开始时间');
    }

    const diffMs = end.getTime() - start.getTime();
    const diffMinutes = diffMs / (1000 * 60);

    if (diffMinutes < 30) {
      throw new BadRequestException('预约时长至少为30分钟');
    }

    if (diffMinutes % 30 !== 0) {
      throw new BadRequestException('预约时长必须为30分钟的整数倍');
    }
  }

  async create(createReservationDto: CreateReservationDto): Promise<Reservation> {
    const { spotId, plateNumber, startTime, endTime } = createReservationDto;

    this.validateTimeRange(startTime, endTime);

    const spot = await this.spotsService.findById(spotId);
    if (!spot) {
      throw new NotFoundException('车位不存在');
    }

    if (spot.status === SpotStatus.OCCUPIED) {
      throw new BadRequestException('该车位已被占用');
    }

    if (spot.status === SpotStatus.MAINTENANCE) {
      throw new BadRequestException('该车位正在维修');
    }

    const existingReservations = await this.getSpotReservations(spotId);
    const newStart = new Date(startTime);
    const newEnd = new Date(endTime);

    for (const reservation of existingReservations) {
      if (this.hasTimeConflict(reservation, newStart, newEnd)) {
        throw new BadRequestException('该车位在所选时间段已有预约');
      }
    }

    const id = this.generateId();
    const durationMs = newEnd.getTime() - newStart.getTime();
    const durationMinutes = Math.ceil(durationMs / (1000 * 60));
    const ttlSeconds = (durationMinutes + BUFFER_MINUTES) * 60;

    const spotAny = spot as any;
    const reservation: Reservation = {
      id,
      spotId,
      plateNumber: plateNumber.toUpperCase(),
      startTime,
      endTime,
      createdAt: new Date().toISOString(),
      spot: {
        id: spot.id,
        code: spot.code,
        zone: spotAny.zone ? { name: spotAny.zone.name } : undefined,
      },
    };

    await this.redisService.set(
      this.getKey(id),
      JSON.stringify(reservation),
      ttlSeconds,
    );

    return reservation;
  }

  async findMine(plateNumber?: string): Promise<Reservation[]> {
    if (!plateNumber) {
      throw new BadRequestException('请提供车牌号');
    }

    const keys = await this.redisService.keys(`${RESERVATION_KEY_PREFIX}*`);
    const reservations: Reservation[] = [];

    for (const key of keys) {
      const data = await this.redisService.get(key);
      const reservation = this.parseReservation(data);
      if (reservation && reservation.plateNumber.toUpperCase() === plateNumber.toUpperCase()) {
        reservations.push(reservation);
      }
    }

    return reservations.sort((a, b) =>
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );
  }

  async findAll(): Promise<Reservation[]> {
    const keys = await this.redisService.keys(`${RESERVATION_KEY_PREFIX}*`);
    const reservations: Reservation[] = [];

    for (const key of keys) {
      const data = await this.redisService.get(key);
      const reservation = this.parseReservation(data);
      if (reservation) {
        reservations.push(reservation);
      }
    }

    return reservations;
  }

  async findOne(id: string): Promise<Reservation> {
    const data = await this.redisService.get(this.getKey(id));
    const reservation = this.parseReservation(data);
    if (!reservation) {
      throw new NotFoundException('预约不存在或已过期');
    }
    return reservation;
  }

  async delete(id: string, plateNumber?: string): Promise<void> {
    const reservation = await this.findOne(id);

    if (plateNumber && reservation.plateNumber.toUpperCase() !== plateNumber.toUpperCase()) {
      throw new ForbiddenException('无权取消此预约');
    }

    await this.redisService.del(this.getKey(id));
  }

  async getSpotActiveReservation(spotId: string): Promise<Reservation | null> {
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
}
