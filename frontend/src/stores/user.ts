import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api/auth'
import type { User, LoginResponse } from '@/types'

export const useUserStore = defineStore('user', () => {
  const token = ref<string>(localStorage.getItem('token') || '')
  const userInfo = ref<Omit<User, 'password'> | null>(null)

  const isLoggedIn = computed(() => !!token.value)
  const isAdmin = computed(() => userInfo.value?.role === 'ADMIN')
  const isAttendant = computed(() => userInfo.value?.role === 'PARKING_ATTENDANT')

  const setToken = (newToken: string) => {
    token.value = newToken
    localStorage.setItem('token', newToken)
  }

  const setUserInfo = (info: Omit<User, 'password'> | null) => {
    userInfo.value = info
    if (info) {
      localStorage.setItem('userInfo', JSON.stringify(info))
    } else {
      localStorage.removeItem('userInfo')
    }
  }

  const login = async (username: string, password: string) => {
    const result: LoginResponse = await authApi.login(username, password)
    setToken(result.accessToken)
    setUserInfo(result.user)
    return result
  }

  const logout = () => {
    token.value = ''
    userInfo.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('userInfo')
  }

  const fetchProfile = async () => {
    try {
      const user = await authApi.getProfile()
      setUserInfo(user)
      return user
    } catch (error) {
      logout()
      throw error
    }
  }

  const initFromStorage = () => {
    const storedToken = localStorage.getItem('token')
    if (storedToken) {
      token.value = storedToken
    }
    const storedUserInfo = localStorage.getItem('userInfo')
    if (storedUserInfo) {
      try {
        userInfo.value = JSON.parse(storedUserInfo)
      } catch {
        userInfo.value = null
      }
    }
  }

  return {
    token,
    userInfo,
    isLoggedIn,
    isAdmin,
    isAttendant,
    setToken,
    setUserInfo,
    login,
    logout,
    fetchProfile,
    initFromStorage,
  }
})
