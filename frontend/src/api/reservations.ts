import { get, post, del } from './request'
import type { Reservation } from '@/types'

export interface CreateReservationRequest {
  spotId: string
  plateNumber: string
  startTime: string
  endTime: string
}

export const reservationsApi = {
  createReservation: (data: CreateReservationRequest) => {
    return post<Reservation>({
      url: '/reservations',
      data,
    })
  },

  getMyReservations: (plateNumber: string) => {
    return get<Reservation[]>({
      url: '/reservations/mine',
      params: { plateNumber },
    })
  },

  getAllReservations: () => {
    return get<Reservation[]>({
      url: '/reservations',
    })
  },

  cancelReservation: (id: string, plateNumber?: string) => {
    const params: any = {}
    if (plateNumber) params.plateNumber = plateNumber
    return del({
      url: `/reservations/${id}`,
      params,
    })
  },
}
