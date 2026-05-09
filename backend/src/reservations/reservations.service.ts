import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";
import { CreateReservationDto } from "./dto/create-reservation.dto";
import { SpotStatus } from "@prisma/client";

@Injectable()
export class ReservationsService {
  private readonly logger = new Logger(ReservationsService.name);

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  async create(userId: string, dto: CreateReservationDto) {
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    const now = new Date();
    if (startTime <= now) {
      throw new BadRequestException("预约开始时间必须晚于当前时间");
    }

    if (endTime <= startTime) {
      throw new BadRequestException("预约结束时间必须晚于开始时间");
    }

    const durationMs = endTime.getTime() - startTime.getTime();
    const durationMinutes = durationMs / (1000 * 60);
    if (durationMinutes < 30) {
      throw new BadRequestException("预约时长最少为30分钟");
    }

    if (durationMinutes % 30 !== 0) {
      throw new BadRequestException("预约时长必须为30分钟的整数倍");
    }

    const spot = await this.prisma.spot.findUnique({
      where: { id: dto.spotId },
      include: { zone: true },
    });
    if (!spot) {
      throw new NotFoundException("车位不存在");
    }

    if (spot.status === SpotStatus.OCCUPIED) {
      throw new BadRequestException("该车位已被占用，无法预约");
    }

    if (spot.status === SpotStatus.MAINTENANCE) {
      throw new BadRequestException("该车位正在维修，无法预约");
    }

    const conflict = await this.checkConflict(dto.spotId, startTime, endTime);
    if (conflict) {
      throw new ConflictException("该车位在所选时间段内已有预约");
    }

    const reservation = await this.prisma.$transaction(async (prisma) => {
      const result = await prisma.reservation.create({
        data: {
          userId,
          spotId: dto.spotId,
          startTime,
          endTime,
          plateNumber: dto.plateNumber || null,
          status: "ACTIVE",
        },
        include: {
          spot: { include: { zone: true } },
        },
      });

      const bufferMinutes = 15;
      const ttlSeconds = Math.ceil((durationMinutes + bufferMinutes) * 60);
      const redisKey = `reservation:${result.id}`;
      await this.redisService.set(
        redisKey,
        JSON.stringify({
          id: result.id,
          spotId: dto.spotId,
          userId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        }),
        ttlSeconds,
      );

      return result;
    });

    return reservation;
  }

  async findMine(userId: string) {
    const reservations = await this.prisma.reservation.findMany({
      where: { userId },
      include: {
        spot: { include: { zone: true } },
      },
      orderBy: { startTime: "desc" },
    });

    const activeReservations = [];
    const now = new Date();

    for (const res of reservations) {
      if (res.status === "ACTIVE" && res.endTime <= now) {
        await this.expireReservation(res.id);
        const updated = { ...res, status: "EXPIRED" };
        activeReservations.push(updated);
      } else {
        activeReservations.push(res);
      }
    }

    return activeReservations;
  }

  async remove(userId: string, id: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
    });
    if (!reservation) {
      throw new NotFoundException("预约不存在");
    }
    if (reservation.userId !== userId) {
      throw new ForbiddenException("无权取消此预约");
    }
    if (reservation.status !== "ACTIVE") {
      throw new BadRequestException("该预约已失效，无法取消");
    }

    await this.prisma.reservation.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    await this.redisService.del(`reservation:${id}`);

    return { message: "预约已取消" };
  }

  async checkConflict(
    spotId: string,
    startTime: Date,
    endTime: Date,
    excludeId?: string,
  ): Promise<boolean> {
    const activeReservations = await this.getActiveReservationsForSpot(spotId);

    return activeReservations.some((res) => {
      if (excludeId && res.id === excludeId) return false;
      if (res.status !== "ACTIVE") return false;

      const resStart = new Date(res.startTime);
      const resEnd = new Date(res.endTime);

      return startTime < resEnd && endTime > resStart;
    });
  }

  async getActiveReservationsForSpot(spotId: string) {
    const now = new Date();
    const bufferBefore = new Date(now.getTime() - 15 * 60 * 1000);

    return this.prisma.reservation.findMany({
      where: {
        spotId,
        status: "ACTIVE",
        endTime: { gt: bufferBefore },
      },
    });
  }

  async getReservationIdsForSpot(spotId: string): Promise<string[]> {
    const now = new Date();
    const activeReservations = await this.prisma.reservation.findMany({
      where: {
        spotId,
        status: "ACTIVE",
        startTime: { lte: new Date(now.getTime() + 15 * 60 * 1000) },
        endTime: { gt: now },
      },
      select: { id: true },
    });
    return activeReservations.map((r) => r.id);
  }

  private async expireReservation(id: string) {
    try {
      await this.prisma.reservation.update({
        where: { id },
        data: { status: "EXPIRED" },
      });
      await this.redisService.del(`reservation:${id}`);
    } catch (err) {
      this.logger.error(`预约过期处理失败: ${err.message}`);
    }
  }
}
