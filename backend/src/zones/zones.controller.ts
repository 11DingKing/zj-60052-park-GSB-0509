import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ZonesService } from './zones.service';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('区域管理')
@ApiBearerAuth()
@Controller('zones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ZonesController {
  constructor(private zonesService: ZonesService) {}

  @Get()
  @ApiOperation({ summary: '获取区域列表' })
  @ApiQuery({ name: 'parkingId', required: false, description: '停车场ID' })
  async findAll(@Query('parkingId') parkingId?: string) {
    return this.zonesService.findAll(parkingId);
  }

  @Get('stats')
  @ApiOperation({ summary: '获取区域统计数据' })
  async getZoneStats() {
    return this.zonesService.getZoneStats();
  }

  @Post()
  @ApiOperation({ summary: '创建区域' })
  @Roles(UserRole.ADMIN)
  async create(@Body() createZoneDto: CreateZoneDto) {
    return this.zonesService.create(createZoneDto);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取单个区域详情' })
  async findOne(@Param('id') id: string) {
    return this.zonesService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新区域信息' })
  @Roles(UserRole.ADMIN)
  async update(@Param('id') id: string, @Body() updateZoneDto: UpdateZoneDto) {
    return this.zonesService.update(id, updateZoneDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除区域' })
  @Roles(UserRole.ADMIN)
  async delete(@Param('id') id: string) {
    await this.zonesService.delete(id);
    return { message: '区域删除成功' };
  }
}
