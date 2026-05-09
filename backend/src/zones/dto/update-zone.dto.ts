import { IsString, IsInt, IsEnum, IsNumber, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ZoneType } from '@prisma/client';

export class UpdateZoneDto {
  @ApiProperty({ example: 'A', description: '区域代码', required: false })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ example: 'A区', description: '区域名称', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ enum: ZoneType, example: ZoneType.SMALL, description: '区域类型', required: false })
  @IsOptional()
  @IsEnum(ZoneType)
  type?: ZoneType;

  @ApiProperty({ example: 20, description: '车位数量', required: false })
  @IsOptional()
  @IsInt()
  totalSpots?: number;

  @ApiProperty({ example: 5, description: '首小时费率', required: false })
  @IsOptional()
  @IsNumber()
  firstHourRate?: number;

  @ApiProperty({ example: 3, description: '后续每小时费率', required: false })
  @IsOptional()
  @IsNumber()
  subsequentRate?: number;

  @ApiProperty({ example: '小型车区域', description: '描述', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: true, description: '是否启用', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
