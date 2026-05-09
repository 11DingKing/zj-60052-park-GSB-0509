import { get, post, put, del } from './request'
import type { MonthlyCard } from '@/types'

export const monthlyCardsApi = {
  getAll: (activeOnly?: boolean) => {
    const params = activeOnly ? { activeOnly: 'true' } : {}
    return get<MonthlyCard[]>({
      url: '/monthly-cards',
      params,
    })
  },

  getStats: () => {
    return get({
      url: '/monthly-cards/stats',
    })
  },

  getByPlateNumber: (plateNumber: string) => {
    return get<MonthlyCard | null>({
      url: `/monthly-cards/plate/${plateNumber}`,
    })
  },

  create: (data: any) => {
    return post<MonthlyCard>({
      url: '/monthly-cards',
      data,
    })
  },

  update: (id: string, data: any) => {
    return put<MonthlyCard>({
      url: `/monthly-cards/${id}`,
      data,
    })
  },

  delete: (id: string) => {
    return del({
      url: `/monthly-cards/${id}`,
    })
  },

  renew: (id: string, months: number) => {
    return put<MonthlyCard>({
      url: `/monthly-cards/${id}/renew`,
      data: { months },
    })
  },
}
