import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { MonthlyCardsService } from './monthly-cards.service';
import { CreateMonthlyCardDto } from './dto/create-monthly-card.dto';
import { UpdateMonthlyCardDto } from './dto/update-monthly-card.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('月卡管理')
@ApiBearerAuth()
@Controller('monthly-cards')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MonthlyCardsController {
  constructor(private monthlyCardsService: MonthlyCardsService) {}

  @Get()
  @ApiOperation({ summary: '获取月卡列表' })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean, description: '仅显示有效月卡' })
  async findAll(@Query('activeOnly') activeOnly?: string) {
    return this.monthlyCardsService.findAll(activeOnly === 'true');
  }

  @Get('stats')
  @ApiOperation({ summary: '获取月卡统计' })
  async getMonthlyCardStats() {
    return this.monthlyCardsService.getMonthlyCardStats();
  }

  @Get('plate/:plateNumber')
  @ApiOperation({ summary: '根据车牌号查找有效月卡' })
  async findByPlateNumber(@Param('plateNumber') plateNumber: string) {
    return this.monthlyCardsService.findByPlateNumber(plateNumber);
  }

  @Post()
  @ApiOperation({ summary: '创建月卡' })
  @Roles(UserRole.ADMIN)
  async create(@Body() createMonthlyCardDto: CreateMonthlyCardDto) {
    return this.monthlyCardsService.create(createMonthlyCardDto);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取单个月卡详情' })
  async findOne(@Param('id') id: string) {
    return this.monthlyCardsService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新月卡信息' })
  @Roles(UserRole.ADMIN)
  async update(@Param('id') id: string, @Body() updateMonthlyCardDto: UpdateMonthlyCardDto) {
    return this.monthlyCardsService.update(id, updateMonthlyCardDto);
  }

  @Put(':id/renew')
  @ApiOperation({ summary: '续费月卡' })
  @Roles(UserRole.ADMIN)
  async renew(@Param('id') id: string, @Body() body: { months: number }) {
    return this.monthlyCardsService.renew(id, body.months);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除月卡' })
  @Roles(UserRole.ADMIN)
  async delete(@Param('id') id: string) {
    await this.monthlyCardsService.delete(id);
    return { message: '月卡删除成功' };
  }
}
