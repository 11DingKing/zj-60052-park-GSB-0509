import { Module } from '@nestjs/common';
import { MonthlyCardsService } from './monthly-cards.service';
import { MonthlyCardsController } from './monthly-cards.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MonthlyCardsController],
  providers: [MonthlyCardsService],
  exports: [MonthlyCardsService],
})
export class MonthlyCardsModule {}
