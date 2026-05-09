import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EntryDto {
  @ApiProperty({ example: '京A12345', description: '车牌号' })
  @IsString()
  plateNumber: string;

  @ApiProperty({ example: 'zone-a', description: '目标区域ID（可选，月卡车辆自动绑定）', required: false })
  @IsOptional()
  @IsString()
  zoneId?: string;
}
