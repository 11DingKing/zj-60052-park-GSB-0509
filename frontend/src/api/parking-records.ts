import { get, post } from './request'
import type { ParkingRecord, ExitReceipt } from '@/types'

export const parkingRecordsApi = {
  getAll: (status?: string, plateNumber?: string) => {
    const params: any = {}
    if (status) params.status = status
    if (plateNumber) params.plateNumber = plateNumber
    return get<ParkingRecord[]>({
      url: '/parking-records',
      params,
    })
  },

  getActive: (plateNumber?: string) => {
    const params: any = { status: 'PARKING' }
    if (plateNumber) params.plateNumber = plateNumber
    return get<ParkingRecord[]>({
      url: '/parking-records',
      params,
    })
  },

  entry: (plateNumber: string, zoneId?: string) => {
    const data: any = { plateNumber }
    if (zoneId) data.zoneId = zoneId
    return post({
      url: '/parking-records/entry',
      data,
    })
  },

  exit: (plateNumber: string) => {
    return post<ExitReceipt>({
      url: '/parking-records/exit',
      data: { plateNumber },
    })
  },

  getTodayStats: () => {
    return get({
      url: '/parking-records/today-stats',
    })
  },

  getByPlateNumber: (plateNumber: string) => {
    return get({
      url: `/parking-records/plate/${plateNumber}/current`,
    })
  },
}
