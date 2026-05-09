import { Controller, Get, Post, Put, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ParkingRecordsService } from './parking-records.service';
import { EntryDto } from './dto/entry.dto';
import { ExitDto } from './dto/exit.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, ParkingRecordStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('车辆进出管理')
@ApiBearerAuth()
@Controller('parking-records')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ParkingRecordsController {
  constructor(private parkingRecordsService: ParkingRecordsService) {}

  @Get()
  @ApiOperation({ summary: '获取停车记录列表' })
  @ApiQuery({ name: 'status', required: false, enum: ParkingRecordStatus, description: '记录状态' })
  @ApiQuery({ name: 'plateNumber', required: false, description: '车牌号搜索' })
  async findAll(
    @Query('status') status?: ParkingRecordStatus,
    @Query('plateNumber') plateNumber?: string,
  ) {
    return this.parkingRecordsService.findAll(status, plateNumber);
  }

  @Get('current')
  @ApiOperation({ summary: '获取当前在场车辆列表' })
  @ApiQuery({ name: 'plateNumber', required: false, description: '车牌号搜索' })
  async getCurrentParkings(@Query('plateNumber') plateNumber?: string) {
    return this.parkingRecordsService.getCurrentParkings(plateNumber);
  }

  @Get('today-stats')
  @ApiOperation({ summary: '获取今日统计' })
  async getTodayStats() {
    return this.parkingRecordsService.getTodayStats();
  }

  @Post('entry')
  @ApiOperation({ summary: '车辆入场登记' })
  async entry(@Body() entryDto: EntryDto) {
    return this.parkingRecordsService.entry(entryDto);
  }

  @Post('exit')
  @ApiOperation({ summary: '车辆出场结算' })
  async exit(@Body() exitDto: ExitDto) {
    return this.parkingRecordsService.exit(exitDto);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取单个停车记录详情' })
  async findOne(@Param('id') id: string) {
    return this.parkingRecordsService.findById(id);
  }

  @Get('plate/:plateNumber/current')
  @ApiOperation({ summary: '根据车牌号查找当前停车记录' })
  async findCurrentParking(@Param('plateNumber') plateNumber: string) {
    return this.parkingRecordsService.findCurrentParking(plateNumber);
  }
}
