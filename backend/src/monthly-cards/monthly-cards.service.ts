import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MonthlyCard } from '@prisma/client';
import { CreateMonthlyCardDto } from './dto/create-monthly-card.dto';
import { UpdateMonthlyCardDto } from './dto/update-monthly-card.dto';

@Injectable()
export class MonthlyCardsService {
  constructor(private prisma: PrismaService) {}

  async findAll(activeOnly?: boolean): Promise<MonthlyCard[]> {
    const where: any = {};
    if (activeOnly) {
      where.isActive = true;
      where.endDate = { gte: new Date() };
    }

    return this.prisma.monthlyCard.findMany({
      where,
      include: {
        zone: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string): Promise<MonthlyCard> {
    const card = await this.prisma.monthlyCard.findUnique({
      where: { id },
      include: {
        zone: true,
      },
    });
    if (!card) {
      throw new NotFoundException('月卡不存在');
    }
    return card;
  }

  async findByPlateNumber(plateNumber: string): Promise<MonthlyCard | null> {
    const today = new Date();
    return this.prisma.monthlyCard.findFirst({
      where: {
        plateNumber: { equals: plateNumber, mode: 'insensitive' },
        isActive: true,
        startDate: { lte: today },
        endDate: { gte: today },
      },
      include: {
        zone: true,
      },
    });
  }

  async create(createMonthlyCardDto: CreateMonthlyCardDto): Promise<MonthlyCard> {
    const existingCard = await this.prisma.monthlyCard.findFirst({
      where: {
        plateNumber: { equals: createMonthlyCardDto.plateNumber, mode: 'insensitive' },
      },
    });

    if (existingCard) {
      if (existingCard.isActive && existingCard.endDate > new Date()) {
        throw new ConflictException('该车牌号已有有效的月卡');
      }
    }

    const zone = await this.prisma.zone.findUnique({
      where: { id: createMonthlyCardDto.zoneId },
    });
    if (!zone) {
      throw new NotFoundException('区域不存在');
    }

    return this.prisma.monthlyCard.create({
      data: {
        ...createMonthlyCardDto,
        startDate: new Date(createMonthlyCardDto.startDate),
        endDate: new Date(createMonthlyCardDto.endDate),
      },
      include: {
        zone: true,
      },
    });
  }

  async update(id: string, updateMonthlyCardDto: UpdateMonthlyCardDto): Promise<MonthlyCard> {
    const card = await this.prisma.monthlyCard.findUnique({
      where: { id },
    });
    if (!card) {
      throw new NotFoundException('月卡不存在');
    }

    if (updateMonthlyCardDto.plateNumber && updateMonthlyCardDto.plateNumber !== card.plateNumber) {
      const existingCard = await this.prisma.monthlyCard.findFirst({
        where: {
          plateNumber: { equals: updateMonthlyCardDto.plateNumber, mode: 'insensitive' },
          id: { not: id },
        },
      });
      if (existingCard) {
        throw new ConflictException('该车牌号已被其他月卡使用');
      }
    }

    const data: any = { ...updateMonthlyCardDto };
    if (updateMonthlyCardDto.startDate) {
      data.startDate = new Date(updateMonthlyCardDto.startDate);
    }
    if (updateMonthlyCardDto.endDate) {
      data.endDate = new Date(updateMonthlyCardDto.endDate);
    }

    return this.prisma.monthlyCard.update({
      where: { id },
      data,
      include: {
        zone: true,
      },
    });
  }

  async delete(id: string): Promise<void> {
    const card = await this.prisma.monthlyCard.findUnique({
      where: { id },
    });
    if (!card) {
      throw new NotFoundException('月卡不存在');
    }

    await this.prisma.monthlyCard.delete({
      where: { id },
    });
  }

  async renew(id: string, months: number): Promise<MonthlyCard> {
    const card = await this.prisma.monthlyCard.findUnique({
      where: { id },
    });
    if (!card) {
      throw new NotFoundException('月卡不存在');
    }

    const today = new Date();
    let newEndDate: Date;
    if (card.endDate < today) {
      newEndDate = new Date(today);
      newEndDate.setMonth(newEndDate.getMonth() + months);
    } else {
      newEndDate = new Date(card.endDate);
      newEndDate.setMonth(newEndDate.getMonth() + months);
    }

    return this.prisma.monthlyCard.update({
      where: { id },
      data: {
        endDate: newEndDate,
        isActive: true,
      },
      include: {
        zone: true,
      },
    });
  }

  async getMonthlyCardStats(): Promise<any> {
    const today = new Date();
    
    const totalCards = await this.prisma.monthlyCard.count();
    const activeCards = await this.prisma.monthlyCard.count({
      where: {
        isActive: true,
        startDate: { lte: today },
        endDate: { gte: today },
      },
    });
    const expiredCards = await this.prisma.monthlyCard.count({
      where: {
        OR: [
          { isActive: false },
          { endDate: { lt: today } },
        ],
      },
    });

    return {
      totalCards,
      activeCards,
      expiredCards,
    };
  }
}
