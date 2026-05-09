import { get } from './request'
import type {
  DailyRevenue,
  ZoneUtilization,
  PeakHourData,
  VehicleTypeData,
  MonthlyRevenueItem,
} from '@/types'

export const statisticsApi = {
  getDailyRevenue: (days: number = 30) => {
    return get<DailyRevenue[]>({
      url: '/statistics/daily-revenue',
      params: { days },
    })
  },

  getZoneUtilization: () => {
    return get<ZoneUtilization[]>({
      url: '/statistics/zone-utilization',
    })
  },

  getPeakHours: () => {
    return get<PeakHourData[]>({
      url: '/statistics/peak-hours',
    })
  },

  getVehicleTypeRatio: () => {
    return get<VehicleTypeData>({
      url: '/statistics/vehicle-ratio',
    })
  },

  getMonthlyRevenue: (monthStr: string) => {
    const [year, month] = monthStr.split('-').map(Number)
    return get<MonthlyRevenueItem[]>({
      url: '/statistics/monthly-summary',
      params: { year, month },
    })
  },
}
