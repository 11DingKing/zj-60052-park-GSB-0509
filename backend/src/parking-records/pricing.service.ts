import { Injectable } from '@nestjs/common';

export interface PricingResult {
  amount: number;
  rateDetail: string;
}

@Injectable()
export class PricingService {
  private readonly FIRST_HOUR_RATE = 5;
  private readonly HOUR_1_TO_3_RATE = 8;
  private readonly HOUR_3_TO_6_RATE = 6;
  private readonly OVER_6_HOUR_RATE = 4;

  calculate(durationMinutes: number, isMonthlyCardUser: boolean): PricingResult {
    if (isMonthlyCardUser) {
      return {
        amount: 0,
        rateDetail: '月卡免费',
      };
    }

    if (durationMinutes <= 0) {
      return {
        amount: 0,
        rateDetail: '免费',
      };
    }

    const totalHours = Math.ceil(durationMinutes / 60);
    let amount = 0;
    const rateParts: string[] = [];

    if (totalHours <= 1) {
      amount = this.FIRST_HOUR_RATE;
      rateParts.push(`第1小时 ${this.FIRST_HOUR_RATE}元`);
    } else if (totalHours <= 3) {
      amount = this.FIRST_HOUR_RATE + (totalHours - 1) * this.HOUR_1_TO_3_RATE;
      rateParts.push(`第1小时 ${this.FIRST_HOUR_RATE}元`);
      rateParts.push(`第2-${totalHours}小时 ${totalHours - 1}×${this.HOUR_1_TO_3_RATE}元`);
    } else if (totalHours <= 6) {
      amount = this.FIRST_HOUR_RATE + 2 * this.HOUR_1_TO_3_RATE + (totalHours - 3) * this.HOUR_3_TO_6_RATE;
      rateParts.push(`第1小时 ${this.FIRST_HOUR_RATE}元`);
      rateParts.push(`第2-3小时 2×${this.HOUR_1_TO_3_RATE}元`);
      rateParts.push(`第4-${totalHours}小时 ${totalHours - 3}×${this.HOUR_3_TO_6_RATE}元`);
    } else {
      amount = this.FIRST_HOUR_RATE + 2 * this.HOUR_1_TO_3_RATE + 3 * this.HOUR_3_TO_6_RATE + (totalHours - 6) * this.OVER_6_HOUR_RATE;
      rateParts.push(`第1小时 ${this.FIRST_HOUR_RATE}元`);
      rateParts.push(`第2-3小时 2×${this.HOUR_1_TO_3_RATE}元`);
      rateParts.push(`第4-6小时 3×${this.HOUR_3_TO_6_RATE}元`);
      rateParts.push(`第7-${totalHours}小时 ${totalHours - 6}×${this.OVER_6_HOUR_RATE}元`);
    }

    return {
      amount,
      rateDetail: `${rateParts.join(' + ')} = ${amount}元`,
    };
  }
}
