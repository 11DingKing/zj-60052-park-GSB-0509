import { Module } from '@nestjs/common';
import { SpotsService } from './spots.service';
import { SpotsController } from './spots.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ParkingModule } from '../parking/parking.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [PrismaModule, ParkingModule, RedisModule],
  controllers: [SpotsController],
  providers: [SpotsService],
  exports: [SpotsService],
})
export class SpotsModule {}
