import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ParkingService } from './parking.service';
import { CreateParkingDto } from './dto/create-parking.dto';
import { UpdateParkingDto } from './dto/update-parking.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('停车场管理')
@ApiBearerAuth()
@Controller('parking')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ParkingController {
  constructor(private parkingService: ParkingService) {}

  @Get('dashboard')
  @ApiOperation({ summary: '获取实时看板数据' })
  async getDashboard() {
    return this.parkingService.getDashboard();
  }

  @Get()
  @ApiOperation({ summary: '获取所有停车场列表' })
  @Roles(UserRole.ADMIN)
  async findAll() {
    return this.parkingService.findAll();
  }

  @Post()
  @ApiOperation({ summary: '创建停车场' })
  @Roles(UserRole.ADMIN)
  async create(@Body() createParkingDto: CreateParkingDto) {
    const result = await this.parkingService.create(createParkingDto);
    await this.parkingService.invalidateCache();
    return result;
  }

  @Get(':id')
  @ApiOperation({ summary: '获取单个停车场详情' })
  @Roles(UserRole.ADMIN)
  async findOne(@Param('id') id: string) {
    return this.parkingService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新停车场信息' })
  @Roles(UserRole.ADMIN)
  async update(@Param('id') id: string, @Body() updateParkingDto: UpdateParkingDto) {
    const result = await this.parkingService.update(id, updateParkingDto);
    await this.parkingService.invalidateCache();
    return result;
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除停车场' })
  @Roles(UserRole.ADMIN)
  async delete(@Param('id') id: string) {
    await this.parkingService.delete(id);
    await this.parkingService.invalidateCache();
    return { message: '停车场删除成功' };
  }
}
