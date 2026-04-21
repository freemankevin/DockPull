import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { configApi } from '../api'
import type { Config } from '../types'

interface ConfigContextType {
  config: Config | null
  loading: boolean
  error: string | null
  updateConfig: (data: Partial<Config>) => Promise<void>
  refresh: () => Promise<void>
}

const ConfigContext = createContext<ConfigContextType | null>(null)

export function useConfig() {
  const context = useContext(ConfigContext)
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider')
  }
  return context
}

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<Config | null>(() => {
    const cached = localStorage.getItem('dockpull_config')
    if (cached) {
      try {
        return JSON.parse(cached)
      } catch {
        return null
      }
    }
    return null
  })
  const [loading, setLoading] = useState(!config)
  const [error, setError] = useState<string | null>(null)

  const fetchConfig = useCallback(async () => {
    try {
      const res = await configApi.get()
      setConfig(res.data)
      setError(null)
      localStorage.setItem('dockpull_config', JSON.stringify(res.data))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!config) {
      fetchConfig()
    }
  }, [config, fetchConfig])

  useEffect(() => {
    if (config) {
      localStorage.setItem('dockpull_config', JSON.stringify(config))
    }
  }, [config])

  const updateConfig = async (data: Partial<Config>) => {
    setLoading(true)
    try {
      await configApi.update(data)
      await fetchConfig()
    } finally {
      setLoading(false)
    }
  }

  const refresh = async () => {
    setLoading(true)
    await fetchConfig()
  }

  return (
    <ConfigContext.Provider value={{ config, loading, error, updateConfig, refresh }}>
      {children}
    </ConfigContext.Provider>
  )
}