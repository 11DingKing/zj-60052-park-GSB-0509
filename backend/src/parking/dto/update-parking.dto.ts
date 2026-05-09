import { IsString, IsInt, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateParkingDto {
  @ApiProperty({ example: '阳光花园停车场', description: '停车场名称', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: '北京市朝阳区阳光路88号', description: '停车场地址', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ example: 100, description: '总车位数量', required: false })
  @IsOptional()
  @IsInt()
  totalSpots?: number;

  @ApiProperty({ example: '大型商业停车场', description: '描述', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: true, description: '是否启用', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
