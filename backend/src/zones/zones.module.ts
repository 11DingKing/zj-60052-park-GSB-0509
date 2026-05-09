import { Module } from '@nestjs/common';
import { ZonesService } from './zones.service';
import { ZonesController } from './zones.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ParkingModule } from '../parking/parking.module';

@Module({
  imports: [PrismaModule, ParkingModule],
  controllers: [ZonesController],
  providers: [ZonesService],
  exports: [ZonesService],
})
export class ZonesModule {}
