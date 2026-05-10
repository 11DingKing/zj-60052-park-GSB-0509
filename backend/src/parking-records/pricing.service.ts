import { Injectable } from "@nestjs/common";

@Injectable()
export class PricingService {
  calculate(
    durationMinutes: number,
    isMonthlyCardUser: boolean,
  ): { amount: number; detail: string } {
    if (isMonthlyCardUser) {
      return { amount: 0, detail: "月卡免费" };
    }

    if (durationMinutes <= 0) {
      return { amount: 0, detail: "无需缴费" };
    }

    const hours = Math.ceil(durationMinutes / 60);
    let amount = 0;
    const tiers: string[] = [];

    const firstTierHours = Math.min(hours, 1);
    amount += firstTierHours * 5;
    if (firstTierHours > 0) tiers.push(`前1小时 ${firstTierHours}×5元`);

    if (hours > 1) {
      const secondTierHours = Math.min(hours - 1, 2);
      amount += secondTierHours * 8;
      if (secondTierHours > 0) tiers.push(`1-3小时 ${secondTierHours}×8元`);
    }

    if (hours > 3) {
      const thirdTierHours = Math.min(hours - 3, 3);
      amount += thirdTierHours * 6;
      if (thirdTierHours > 0) tiers.push(`3-6小时 ${thirdTierHours}×6元`);
    }

    if (hours > 6) {
      const fourthTierHours = hours - 6;
      amount += fourthTierHours * 4;
      if (fourthTierHours > 0) tiers.push(`6小时以上 ${fourthTierHours}×4元`);
    }

    const detail = `共${hours}小时，${tiers.join(" + ")} = ${amount}元`;

    return { amount, detail };
  }
}
