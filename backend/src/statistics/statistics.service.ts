import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { ParkingRecordStatus, ZoneType } from '@prisma/client';

@Injectable()
export class StatisticsService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  async getDailyRevenue(days: number = 30): Promise<any[]> {
    const cacheKey = `stats:daily_revenue:${days}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - (days - 1));
    startDate.setHours(0, 0, 0, 0);

    const records = await this.prisma.parkingRecord.findMany({
      where: {
        status: ParkingRecordStatus.COMPLETED,
        exitTime: {
          gte: startDate,
          lte: endDate,
        },
        isMonthly: false,
      },
      orderBy: { exitTime: 'asc' },
    });

    const dailyData: Map<string, number> = new Map();
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateKey = date.toISOString().split('T')[0];
      dailyData.set(dateKey, 0);
    }

    records.forEach(record => {
      if (record.exitTime) {
        const dateKey = record.exitTime.toISOString().split('T')[0];
        const current = dailyData.get(dateKey) || 0;
        dailyData.set(dateKey, current + (record.amount || 0));
      }
    });

    const result = Array.from(dailyData.entries()).map(([date, revenue]) => ({
      date,
      revenue,
    }));

    await this.redisService.set(cacheKey, JSON.stringify(result), 300);
    return result;
  }

  async getZoneUtilization(): Promise<any[]> {
    const cacheKey = 'stats:zone_utilization';
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const zones = await this.prisma.zone.findMany({
      include: {
        spots: true,
      },
    });

    const result = zones.map(zone => {
      const total = zone.spots.length;
      const occupied = zone.spots.filter(s => s.status === 'OCCUPIED').length;
      const utilization = total > 0 ? occupied / total : 0;

      return {
        id: zone.id,
        code: zone.code,
        zoneName: zone.name,
        type: zone.type,
        total,
        occupied,
        available: total - occupied,
        utilization,
      };
    });

    await this.redisService.set(cacheKey, JSON.stringify(result), 60);
    return result;
  }

  async getPeakHourAnalysis(): Promise<any[]> {
    const cacheKey = 'stats:peak_hour';
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 7);

    const records = await this.prisma.parkingRecord.findMany({
      where: {
        entryTime: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const hourData: Map<number, { count: number; total: number }> = new Map();
    for (let i = 0; i < 24; i++) {
      hourData.set(i, { count: 0, total: 7 });
    }

    records.forEach(record => {
      const hour = record.entryTime.getHours();
      const data = hourData.get(hour) || { count: 0, total: 7 };
      data.count++;
    });

    const result = Array.from(hourData.entries()).map(([hour, data]) => ({
      hour,
      hourLabel: `${hour}:00`,
      avgCars: Math.round(data.count / data.total),
      averageCount: Math.round(data.count / data.total),
      totalCount: data.count,
    }));

    await this.redisService.set(cacheKey, JSON.stringify(result), 600);
    return result;
  }

  async getVehicleTypeRatio(): Promise<any> {
    const cacheKey = 'stats:vehicle_ratio';
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const monthlyCards = await this.prisma.monthlyCard.count({
      where: {
        isActive: true,
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
    });

    const recentRecords = await this.prisma.parkingRecord.findMany({
      where: {
        entryTime: {
          gte: new Date(new Date().setDate(new Date().getDate() - 7)),
        },
      },
    });

    const monthlyEntries = recentRecords.filter(r => r.isMonthly).length;
    const tempEntries = recentRecords.filter(r => !r.isMonthly).length;

    const total = monthlyEntries + tempEntries;
    const monthlyPercentage = total > 0 ? Math.round((monthlyEntries / total) * 100) : 0;
    const tempPercentage = total > 0 ? Math.round((tempEntries / total) * 100) : 0;

    const result = {
      monthly: monthlyPercentage,
      temporary: tempPercentage,
      monthlyCards,
      recentMonthlyEntries: monthlyEntries,
      recentTempEntries: tempEntries,
      monthlyPercentage,
      tempPercentage,
      breakdown: [
        { name: '月卡车辆', value: monthlyPercentage },
        { name: '临时车辆', value: tempPercentage },
      ],
    };

    await this.redisService.set(cacheKey, JSON.stringify(result), 300);
    return result;
  }

  async getMonthlySummary(year: number, month: number): Promise<any[]> {
    const cacheKey = `stats:monthly_summary:${year}:${month}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const records = await this.prisma.parkingRecord.findMany({
      where: {
        status: ParkingRecordStatus.COMPLETED,
        exitTime: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        spot: {
          include: { zone: true },
        },
      },
    });

    const dailyData: Map<string, {
      totalRecords: number;
      monthlyCount: number;
      temporaryCount: number;
      totalRevenue: number;
      temporaryRecords: number;
    }> = new Map();

    const daysInMonth = new Date(year, month, 0).getDate();

    for (let i = 1; i <= daysInMonth; i++) {
      const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      dailyData.set(dateKey, {
        totalRecords: 0,
        monthlyCount: 0,
        temporaryCount: 0,
        totalRevenue: 0,
        temporaryRecords: 0,
      });
    }

    records.forEach(record => {
      if (record.exitTime) {
        const dateKey = record.exitTime.toISOString().split('T')[0];
        const data = dailyData.get(dateKey) || {
          totalRecords: 0,
          monthlyCount: 0,
          temporaryCount: 0,
          totalRevenue: 0,
          temporaryRecords: 0,
        };
        data.totalRecords++;
        if (record.isMonthly) {
          data.monthlyCount++;
        } else {
          data.temporaryCount++;
          data.totalRevenue += record.amount || 0;
          data.temporaryRecords++;
        }
        dailyData.set(dateKey, data);
      }
    });

    const result = Array.from(dailyData.entries()).map(([date, data]) => ({
      date,
      totalRecords: data.totalRecords,
      monthlyCount: data.monthlyCount,
      temporaryCount: data.temporaryCount,
      totalRevenue: data.totalRevenue,
      avgFee: data.temporaryRecords > 0 ? Math.round((data.totalRevenue / data.temporaryRecords) * 100) / 100 : 0,
    }));

    await this.redisService.set(cacheKey, JSON.stringify(result), 1800);
    return result;
  }
}
