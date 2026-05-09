import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ParkingModule } from './parking/parking.module';
import { ZonesModule } from './zones/zones.module';
import { SpotsModule } from './spots/spots.module';
import { MonthlyCardsModule } from './monthly-cards/monthly-cards.module';
import { ParkingRecordsModule } from './parking-records/parking-records.module';
import { StatisticsModule } from './statistics/statistics.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    RedisModule,
    AuthModule,
    UsersModule,
    ParkingModule,
    ZonesModule,
    SpotsModule,
    MonthlyCardsModule,
    ParkingRecordsModule,
    StatisticsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
