import { IsString, IsDateString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReservationDto {
  @ApiProperty({ example: 'spot-uuid', description: '车位ID' })
  @IsString()
  spotId: string;

  @ApiProperty({ example: '2025-05-10T10:00:00.000Z', description: '预约开始时间' })
  @IsDateString()
  startTime: string;

  @ApiProperty({ example: '2025-05-10T11:00:00.000Z', description: '预约结束时间' })
  @IsDateString()
  endTime: string;

  @ApiProperty({ example: '京A12345', description: '车牌号', required: false })
  @IsOptional()
  @IsString()
  plateNumber?: string;
}
