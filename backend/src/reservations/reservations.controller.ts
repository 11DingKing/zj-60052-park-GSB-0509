import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { ReservationsService } from "./reservations.service";
import { CreateReservationDto } from "./dto/create-reservation.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@ApiTags("车位预约")
@ApiBearerAuth()
@Controller("reservations")
@UseGuards(JwtAuthGuard)
export class ReservationsController {
  constructor(private reservationsService: ReservationsService) {}

  @Post()
  @ApiOperation({ summary: "创建车位预约" })
  async create(@Req() req: any, @Body() dto: CreateReservationDto) {
    const userId = req.user.userId;
    return this.reservationsService.create(userId, dto);
  }

  @Get("mine")
  @ApiOperation({ summary: "获取我的预约列表" })
  async findMine(@Req() req: any) {
    const userId = req.user.userId;
    return this.reservationsService.findMine(userId);
  }

  @Delete(":id")
  @ApiOperation({ summary: "取消预约" })
  async remove(@Req() req: any, @Param("id") id: string) {
    const userId = req.user.userId;
    return this.reservationsService.remove(userId, id);
  }
}
