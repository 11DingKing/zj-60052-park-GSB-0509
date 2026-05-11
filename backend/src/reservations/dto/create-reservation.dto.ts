import { IsNotEmpty, IsString, IsDateString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReservationDto {
  @ApiProperty({ description: '车位ID' })
  @IsNotEmpty()
  @IsUUID()
  spotId: string;

  @ApiProperty({ description: '车牌号' })
  @IsNotEmpty()
  @IsString()
  plateNumber: string;

  @ApiProperty({ description: '开始时间（ISO格式）' })
  @IsNotEmpty()
  @IsDateString()
  startTime: string;

  @ApiProperty({ description: '结束时间（ISO格式）' })
  @IsNotEmpty()
  @IsDateString()
  endTime: string;
}
