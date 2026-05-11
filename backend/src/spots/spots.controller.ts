import { Controller, Get, Put, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SpotsService } from './spots.service';
import { UpdateSpotDto } from './dto/update-spot.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, SpotStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('车位管理')
@ApiBearerAuth()
@Controller('spots')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SpotsController {
  constructor(private spotsService: SpotsService) {}

  @Get()
  @ApiOperation({ summary: '获取车位列表（含预约信息）' })
  @ApiQuery({ name: 'zoneId', required: false, description: '区域ID' })
  @ApiQuery({ name: 'status', required: false, enum: SpotStatus, description: '车位状态' })
  async findAll(
    @Query('zoneId') zoneId?: string,
    @Query('status') status?: SpotStatus,
  ) {
    return this.spotsService.findAllWithReservations(zoneId, status);
  }

  @Get('available')
  @ApiOperation({ summary: '获取可用车位' })
  @ApiQuery({ name: 'zoneId', required: false, description: '区域ID' })
  async findAvailableSpots(@Query('zoneId') zoneId?: string) {
    return this.spotsService.findAvailableSpots(zoneId);
  }

  @Get('stats')
  @ApiOperation({ summary: '获取车位状态统计' })
  async getSpotStatusCounts() {
    return this.spotsService.getSpotStatusCounts();
  }

  @Get(':id')
  @ApiOperation({ summary: '获取单个车位详情' })
  async findOne(@Param('id') id: string) {
    return this.spotsService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新车位信息' })
  @Roles(UserRole.ADMIN)
  async update(@Param('id') id: string, @Body() updateSpotDto: UpdateSpotDto) {
    return this.spotsService.update(id, updateSpotDto);
  }
}
