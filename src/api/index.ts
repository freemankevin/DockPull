import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('dockpull_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('dockpull_token')
      localStorage.removeItem('dockpull_user')
      localStorage.removeItem('dockpull_config')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const authApi = {
  login: (username: string, password: string) => axios.post('/api/auth/login', { username, password }),
  me: () => api.get('/auth/me'),
  changePassword: (oldPassword: string, newPassword: string) => api.post('/auth/change-password', { old_password: oldPassword, new_password: newPassword }),
}

export const imagesApi = {
  list: () => api.get('/images'),
  create: (data: any) => api.post('/images', data),
  update: (id: number, data: any) => api.put(`/images/${id}`, data),
  delete: (id: number) => api.delete(`/images/${id}`),
  pull: (id: number) => api.post(`/images/${id}/pull`),
  export: (id: number) => api.post(`/images/${id}/export`),
  logs: (id: number) => api.get(`/images/${id}/logs`),
  checkPlatforms: (name: string, tag: string) => api.get('/images/check-platforms', { params: { name, tag } }),
}

export const configApi = {
  get: () => api.get('/config'),
  update: (data: any) => api.put('/config', data),
}

export const browseApi = {
  list: (path?: string) => api.get('/browse', { params: { path } }),
}

export const webhookApi = {
  test: () => api.post('/webhook/test'),
}

export const statsApi = {
  get: () => api.get('/stats'),
}

export default api
