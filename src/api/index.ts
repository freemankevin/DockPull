import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

export const imagesApi = {
  list: () => api.get('/images'),
  create: (data: any) => api.post('/images', data),
  delete: (id: number) => api.delete(`/images/${id}`),
  pull: (id: number) => api.post(`/images/${id}/pull`),
  export: (id: number) => api.post(`/images/${id}/export`),
  logs: (id: number) => api.get(`/images/${id}/logs`),
}

export const configApi = {
  get: () => api.get('/config'),
  update: (data: any) => api.put('/config', data),
}

export const webhookApi = {
  test: () => api.post('/webhook/test'),
}

export const statsApi = {
  get: () => api.get('/stats'),
}

export default api
