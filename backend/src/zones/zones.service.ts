import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Zone, ZoneType, SpotStatus } from '@prisma/client';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';
import { ParkingService } from '../parking/parking.service';

@Injectable()
export class ZonesService {
  constructor(
    private prisma: PrismaService,
    private parkingService: ParkingService,
  ) {}

  async findAll(parkingId?: string): Promise<Zone[]> {
    const where = parkingId ? { parkingId } : {};
    return this.prisma.zone.findMany({
      where,
      include: {
        parking: true,
        _count: {
          select: { spots: true },
        },
      },
      orderBy: { code: 'asc' },
    });
  }

  async findById(id: string): Promise<Zone & { parking?: any }> {
    const zone = await this.prisma.zone.findUnique({
      where: { id },
      include: {
        parking: true,
        spots: {
          orderBy: { number: 'asc' },
        },
      },
    });
    if (!zone) {
      throw new NotFoundException('区域不存在');
    }
    return zone;
  }

  async create(createZoneDto: CreateZoneDto): Promise<Zone> {
    const parking = await this.prisma.parking.findUnique({
      where: { id: createZoneDto.parkingId },
      include: { zones: true },
    });
    if (!parking) {
      throw new NotFoundException('停车场不存在');
    }

    const existingZone = await this.prisma.zone.findFirst({
      where: {
        parkingId: createZoneDto.parkingId,
        code: createZoneDto.code,
      },
    });
    if (existingZone) {
      throw new ConflictException('该区域代码已存在');
    }

    const zone = await this.prisma.zone.create({
      data: {
        ...createZoneDto,
        type: createZoneDto.type || ZoneType.SMALL,
      },
      include: {
        parking: true,
      },
    });

    for (let i = 1; i <= createZoneDto.totalSpots; i++) {
      const spotCode = `${zone.code}-${i.toString().padStart(3, '0')}`;
      await this.prisma.spot.create({
        data: {
          zoneId: zone.id,
          code: spotCode,
          number: i,
          status: SpotStatus.AVAILABLE,
        },
      });
    }

    await this.parkingService.invalidateCache();
    return zone;
  }

  async update(id: string, updateZoneDto: UpdateZoneDto): Promise<Zone> {
    const zone = await this.prisma.zone.findUnique({
      where: { id },
      include: {
        spots: {
          where: { status: SpotStatus.OCCUPIED },
        },
      },
    });
    if (!zone) {
      throw new NotFoundException('区域不存在');
    }

    if (updateZoneDto.code && updateZoneDto.code !== zone.code) {
      const existingZone = await this.prisma.zone.findFirst({
        where: {
          parkingId: zone.parkingId,
          code: updateZoneDto.code,
          id: { not: id },
        },
      });
      if (existingZone) {
        throw new ConflictException('该区域代码已存在');
      }
    }

    if (updateZoneDto.totalSpots !== undefined) {
      if (updateZoneDto.totalSpots < zone.spots.length) {
        throw new BadRequestException('车位数量不能小于当前已占用的数量');
      }
    }

    const updatedZone = await this.prisma.zone.update({
      where: { id },
      data: {
        name: updateZoneDto.name,
        type: updateZoneDto.type,
        firstHourRate: updateZoneDto.firstHourRate,
        subsequentRate: updateZoneDto.subsequentRate,
        description: updateZoneDto.description,
        isActive: updateZoneDto.isActive,
      },
      include: {
        parking: true,
      },
    });

    if (updateZoneDto.totalSpots !== undefined) {
      const currentSpots = await this.prisma.spot.count({
        where: { zoneId: id },
      });
      
      if (updateZoneDto.totalSpots > currentSpots) {
        for (let i = currentSpots + 1; i <= updateZoneDto.totalSpots; i++) {
          const spotCode = `${zone.code}-${i.toString().padStart(3, '0')}`;
          await this.prisma.spot.create({
            data: {
              zoneId: id,
              code: spotCode,
              number: i,
              status: SpotStatus.AVAILABLE,
            },
          });
        }
      }
    }

    await this.parkingService.invalidateCache();
    return updatedZone;
  }

  async delete(id: string): Promise<void> {
    const zone = await this.prisma.zone.findUnique({
      where: { id },
      include: {
        spots: {
          where: { status: SpotStatus.OCCUPIED },
        },
      },
    });
    if (!zone) {
      throw new NotFoundException('区域不存在');
    }

    if (zone.spots.length > 0) {
      throw new ConflictException('区域内有车辆正在停放，无法删除');
    }

    await this.prisma.zone.delete({
      where: { id },
    });
    await this.parkingService.invalidateCache();
  }

  async getZoneStats(): Promise<any[]> {
    const zones = await this.prisma.zone.findMany({
      include: {
        spots: true,
      },
    });

    return zones.map(zone => {
      const total = zone.spots.length;
      const occupied = zone.spots.filter(s => s.status === SpotStatus.OCCUPIED).length;
      const available = zone.spots.filter(s => s.status === SpotStatus.AVAILABLE).length;
      const maintenance = zone.spots.filter(s => s.status === SpotStatus.MAINTENANCE).length;

      return {
        id: zone.id,
        code: zone.code,
        name: zone.name,
        type: zone.type,
        firstHourRate: zone.firstHourRate,
        subsequentRate: zone.subsequentRate,
        total,
        occupied,
        available,
        maintenance,
        utilization: total > 0 ? Math.round((occupied / total) * 100) : 0,
      };
    });
  }
}
