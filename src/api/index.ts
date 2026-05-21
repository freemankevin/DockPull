import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

const longTimeoutApi = axios.create({
  baseURL: '/api',
  timeout: 180000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cove_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

longTimeoutApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('cove_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('cove_token')
      localStorage.removeItem('cove_user')
      localStorage.removeItem('cove_config')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

longTimeoutApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('cove_token')
      localStorage.removeItem('cove_user')
      localStorage.removeItem('cove_config')
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
  checkAuth: (name: string) => api.get('/images/check-auth', { params: { name } }),
}

export const configApi = {
  get: () => api.get('/config'),
  update: (data: any) => api.put('/config', data),
  detectRuntime: () => api.get('/config/detect-runtime'),
  testDockerHost: (dockerHost: string, dockerHostTimeout?: number) => api.post('/config/test-docker-host', { docker_host: dockerHost, docker_host_timeout: dockerHostTimeout }),
}

export const browseApi = {
  list: (path?: string) => api.get('/browse', { params: { path } }),
}

export const webhookApi = {
  test: () => api.post('/webhook/test'),
}

export const tokenApi = {
  test: (registry: string, credentials?: { username?: string; password?: string; token?: string; cert?: string; region?: string; url?: string }) => api.post('/tokens/test', { registry, ...credentials }, { timeout: 30000 }),
}

export const statsApi = {
  get: () => api.get('/stats'),
}

export const localImagesApi = {
  list: () => longTimeoutApi.get('/local-images'),
  delete: (id: string, force?: boolean) => longTimeoutApi.delete(`/local-images/${id}`, { params: { force } }),
  export: (id: string, exportPath?: string) => longTimeoutApi.post(`/local-images/${id}/export`, { export_path: exportPath }),
}

export const operationsApi = {
  status: () => api.get('/operations/status'),
}

export const buildsApi = {
  list: () => longTimeoutApi.get('/builds'),
  build: (data: any) => longTimeoutApi.post('/builds', data),
  delete: (id: string, force?: boolean) => longTimeoutApi.delete(`/builds/${id}`, { params: { force } }),
}

export const composeApi = {
  list: (path?: string) => api.get('/compose', { params: { path } }),
  up: (path: string) => api.post('/compose/up', null, { params: { path } }),
  down: (path: string) => api.post('/compose/down', null, { params: { path } }),
  status: (path: string) => api.get('/compose/status', { params: { path } }),
}

export const containersApi = {
  list: (all?: boolean) => api.get('/containers', { params: { all } }),
  start: (id: string) => api.post(`/containers/${id}/start`),
  stop: (id: string, timeout?: number) => api.post(`/containers/${id}/stop`, null, { params: { timeout } }),
  restart: (id: string, timeout?: number) => api.post(`/containers/${id}/restart`, null, { params: { timeout } }),
  remove: (id: string, force?: boolean) => api.delete(`/containers/${id}`, { params: { force } }),
  logs: (id: string, tail?: number) => api.get(`/containers/${id}/logs`, { params: { tail } }),
}

export default api
