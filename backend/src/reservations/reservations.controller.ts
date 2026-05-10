import { Controller, Post, Get, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('预约管理')
@ApiBearerAuth()
@Controller('reservations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReservationsController {
  constructor(private reservationsService: ReservationsService) {}

  @Post()
  @ApiOperation({ summary: '创建车位预约' })
  async create(@Body() createReservationDto: CreateReservationDto) {
    return this.reservationsService.create(createReservationDto);
  }

  @Get('mine')
  @ApiOperation({ summary: '获取我的预约列表' })
  @ApiQuery({ name: 'plateNumber', required: true, description: '车牌号' })
  async findMine(@Query('plateNumber') plateNumber: string) {
    return this.reservationsService.findMine(plateNumber);
  }

  @Get()
  @ApiOperation({ summary: '获取所有预约（管理员）' })
  async findAll() {
    return this.reservationsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '获取预约详情' })
  async findOne(@Param('id') id: string) {
    return this.reservationsService.findOne(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: '取消预约' })
  @ApiQuery({ name: 'plateNumber', required: false, description: '车牌号（用于验证权限）' })
  async delete(@Param('id') id: string, @Query('plateNumber') plateNumber?: string) {
    await this.reservationsService.delete(id, plateNumber);
    return { message: '预约已取消' };
  }
}
