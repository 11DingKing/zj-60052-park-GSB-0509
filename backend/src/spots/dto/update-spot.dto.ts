import { IsEnum, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SpotStatus } from '@prisma/client';

export class UpdateSpotDto {
  @ApiProperty({ enum: SpotStatus, example: SpotStatus.AVAILABLE, description: '车位状态', required: false })
  @IsOptional()
  @IsEnum(SpotStatus)
  status?: SpotStatus;

  @ApiProperty({ example: '车位说明', description: '描述', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}
