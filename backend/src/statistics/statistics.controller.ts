import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { StatisticsService } from './statistics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('数据报表')
@ApiBearerAuth()
@Controller('statistics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StatisticsController {
  constructor(private statisticsService: StatisticsService) {}

  @Get('daily-revenue')
  @ApiOperation({ summary: '每日营收柱状图数据' })
  @ApiQuery({ name: 'days', required: false, example: 30, description: '天数' })
  async getDailyRevenue(@Query('days') days?: string) {
    const d = days ? parseInt(days, 10) : 30;
    return this.statisticsService.getDailyRevenue(d);
  }

  @Get('zone-utilization')
  @ApiOperation({ summary: '各区域车位利用率对比' })
  async getZoneUtilization() {
    return this.statisticsService.getZoneUtilization();
  }

  @Get('peak-hours')
  @ApiOperation({ summary: '高峰时段分析折线图数据' })
  async getPeakHourAnalysis() {
    return this.statisticsService.getPeakHourAnalysis();
  }

  @Get('vehicle-ratio')
  @ApiOperation({ summary: '月卡与临时车占比饼图数据' })
  async getVehicleTypeRatio() {
    return this.statisticsService.getVehicleTypeRatio();
  }

  @Get('monthly-summary')
  @ApiOperation({ summary: '月度营收汇总表格' })
  @ApiQuery({ name: 'year', required: false, description: '年份' })
  @ApiQuery({ name: 'month', required: false, description: '月份' })
  async getMonthlySummary(
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    const y = year ? parseInt(year, 10) : new Date().getFullYear();
    const m = month ? parseInt(month, 10) : new Date().getMonth() + 1;
    return this.statisticsService.getMonthlySummary(y, m);
  }
}
