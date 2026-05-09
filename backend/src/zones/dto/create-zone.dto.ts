import { IsString, IsInt, IsEnum, IsNumber, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ZoneType } from '@prisma/client';

export class CreateZoneDto {
  @ApiProperty({ example: 'parking-001', description: '停车场ID' })
  @IsString()
  parkingId: string;

  @ApiProperty({ example: 'A', description: '区域代码' })
  @IsString()
  code: string;

  @ApiProperty({ example: 'A区', description: '区域名称' })
  @IsString()
  name: string;

  @ApiProperty({ enum: ZoneType, example: ZoneType.SMALL, description: '区域类型' })
  @IsEnum(ZoneType)
  type: ZoneType;

  @ApiProperty({ example: 20, description: '车位数量' })
  @IsInt()
  totalSpots: number;

  @ApiProperty({ example: 5, description: '首小时费率' })
  @IsNumber()
  firstHourRate: number;

  @ApiProperty({ example: 3, description: '后续每小时费率' })
  @IsNumber()
  subsequentRate: number;

  @ApiProperty({ example: '小型车区域', description: '描述', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: true, description: '是否启用', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
