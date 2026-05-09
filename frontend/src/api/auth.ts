import { post, get } from './request'
import type { LoginResponse, User } from '@/types'

export const authApi = {
  login: (username: string, password: string) => {
    return post<LoginResponse>({
      url: '/auth/login',
      data: { username, password },
    })
  },

  getProfile: () => {
    return get<User>({
      url: '/auth/profile',
    })
  },
}
