import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import router from '@/router'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:13052'

const service: AxiosInstance = axios.create({
  baseURL: apiBaseUrl,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

service.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

service.interceptors.response.use(
  (response: AxiosResponse) => {
    return response.data
  },
  async (error) => {
    const { response } = error
    if (response) {
      switch (response.status) {
        case 401:
          ElMessageBox.confirm('登录状态已过期，请重新登录', '提示', {
            confirmButtonText: '重新登录',
            cancelButtonText: '取消',
            type: 'warning',
          })
            .then(() => {
              localStorage.removeItem('token')
              localStorage.removeItem('userInfo')
              router.push('/login')
            })
            .catch(() => {})
          break
        case 403:
          ElMessage.error('没有权限执行此操作')
          break
        case 404:
          ElMessage.error('请求的资源不存在')
          break
        case 500:
          ElMessage.error('服务器内部错误')
          break
        default:
          ElMessage.error(response.data?.message || '请求失败')
      }
    } else {
      if (error.code === 'ECONNABORTED' && error.message.includes('timeout')) {
        ElMessage.error('请求超时')
      } else {
        ElMessage.error('网络连接失败')
      }
    }
    return Promise.reject(error)
  }
)

export default service

export interface RequestConfig extends AxiosRequestConfig {
  url: string
}

export function get<T>(config: RequestConfig): Promise<T> {
  return service.request({ method: 'GET', ...config })
}

export function post<T>(config: RequestConfig): Promise<T> {
  return service.request({ method: 'POST', ...config })
}

export function put<T>(config: RequestConfig): Promise<T> {
  return service.request({ method: 'PUT', ...config })
}

export function del<T>(config: RequestConfig): Promise<T> {
  return service.request({ method: 'DELETE', ...config })
}
