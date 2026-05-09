import { IsString, IsNumber, IsDateString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMonthlyCardDto {
  @ApiProperty({ example: '京A12345', description: '车牌号' })
  @IsString()
  plateNumber: string;

  @ApiProperty({ example: '张三', description: '车主姓名' })
  @IsString()
  ownerName: string;

  @ApiProperty({ example: '13800138000', description: '手机号' })
  @IsString()
  phone: string;

  @ApiProperty({ example: 'zone-a', description: '绑定区域ID' })
  @IsString()
  zoneId: string;

  @ApiProperty({ example: '2024-01-01', description: '开始日期' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2024-12-31', description: '结束日期' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ example: 300, description: '月卡费用' })
  @IsNumber()
  fee: number;

  @ApiProperty({ example: true, description: '是否启用', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
