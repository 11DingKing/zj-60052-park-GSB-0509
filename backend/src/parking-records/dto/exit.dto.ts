import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ExitDto {
  @ApiProperty({ example: '京A12345', description: '车牌号' })
  @IsString()
  plateNumber: string;
}
