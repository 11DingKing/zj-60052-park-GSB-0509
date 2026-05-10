import { Module } from "@nestjs/common";
import { ParkingRecordsService } from "./parking-records.service";
import { ParkingRecordsController } from "./parking-records.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { SpotsModule } from "../spots/spots.module";
import { MonthlyCardsModule } from "../monthly-cards/monthly-cards.module";
import { ParkingModule } from "../parking/parking.module";
import { PricingService } from "./pricing.service";

@Module({
  imports: [PrismaModule, SpotsModule, MonthlyCardsModule, ParkingModule],
  controllers: [ParkingRecordsController],
  providers: [ParkingRecordsService, PricingService],
  exports: [ParkingRecordsService, PricingService],
})
export class ParkingRecordsModule {}
