import { get, post, put, del } from './request'
import type {
  DashboardData,
  Parking,
  Zone,
  ZoneStats,
  Spot,
  CurrentVehicle,
} from '@/types'

export const parkingApi = {
  getDashboard: () => {
    return get<DashboardData>({
      url: '/parking/dashboard',
    })
  },

  getParkings: () => {
    return get<Parking[]>({
      url: '/parking',
    })
  },

  createParking: (data: Partial<Parking>) => {
    return post<Parking>({
      url: '/parking',
      data,
    })
  },

  updateParking: (id: string, data: Partial<Parking>) => {
    return put<Parking>({
      url: `/parking/${id}`,
      data,
    })
  },

  deleteParking: (id: string) => {
    return del({
      url: `/parking/${id}`,
    })
  },

  getZones: (parkingId?: string) => {
    const params = parkingId ? { parkingId } : {}
    return get<Zone[]>({
      url: '/zones',
      params,
    })
  },

  getZoneStats: () => {
    return get<ZoneStats[]>({
      url: '/zones/stats',
    })
  },

  createZone: (data: any) => {
    return post<Zone>({
      url: '/zones',
      data,
    })
  },

  updateZone: (id: string, data: any) => {
    return put<Zone>({
      url: `/zones/${id}`,
      data,
    })
  },

  deleteZone: (id: string) => {
    return del({
      url: `/zones/${id}`,
    })
  },

  getSpots: (zoneId?: string, status?: string) => {
    const params: any = {}
    if (zoneId) params.zoneId = zoneId
    if (status) params.status = status
    return get<Spot[]>({
      url: '/spots',
      params,
    })
  },

  updateSpot: (id: string, data: any) => {
    return put<Spot>({
      url: `/spots/${id}`,
      data,
    })
  },

  getCurrentVehicles: (plateNumber?: string) => {
    const params = plateNumber ? { plateNumber } : {}
    return get<CurrentVehicle[]>({
      url: '/parking-records/current',
      params,
    })
  },
}
