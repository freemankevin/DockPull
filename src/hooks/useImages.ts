import { useState, useEffect, useCallback } from 'react'
import { imagesApi } from '../api'
import type { Image } from '../types'

export function useImages(
  onNotification?: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void
) {
  const [images, setImages] = useState<Image[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const notify = useCallback((type: 'success' | 'error' | 'info' | 'warning', message: string) => {
    if (onNotification) {
      onNotification(type, message)
    }
  }, [onNotification])

  const fetchImages = useCallback(async () => {
    setLoading(true)
    try {
      const res = await imagesApi.list()
      setImages(res.data || [])
      setError(null)
    } catch (err: any) {
      setError(err.message)
      setImages([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchImages()
    const interval = setInterval(fetchImages, 5000)
    return () => clearInterval(interval)
  }, [fetchImages])

  const createImage = async (data: any) => {
    try {
      // Check for duplicates in local state first (fast feedback)
      const existingImage = images.find(
        img => img.name === data.name && img.tag === data.tag && img.platform === data.platform && 
        (img.status === 'pending' || img.status === 'pulling')
      )
      
      if (existingImage) {
        return { success: false, duplicate: true }
      }
      
      await imagesApi.create(data)
      await fetchImages()
      return { success: true, duplicate: false }
    } catch (err: any) {
      setError(err.message)
      // Check if error is due to duplicate (409 status)
      if (err.response?.status === 409) {
        return { success: false, duplicate: true }
      }
      return { success: false, duplicate: false }
    }
  }

  const deleteImage = async (id: number) => {
    const image = images.find(img => img.id === id)
    try {
      await imagesApi.delete(id)
      await fetchImages()
      notify('success', `Deleted ${image?.full_name || 'image'}`)
      return true
    } catch (err: any) {
      setError(err.message)
      notify('error', `Failed to delete ${image?.full_name || 'image'}: ${err.message}`)
      return false
    }
  }

  const updateImage = async (id: number, data: any) => {
    try {
      await imagesApi.update(id, data)
      await fetchImages()
      return true
    } catch (err: any) {
      setError(err.message)
      return false
    }
  }

  const pullImage = async (id: number) => {
    const image = images.find(img => img.id === id)
    try {
      await imagesApi.pull(id)
      notify('info', `Retrying ${image?.full_name || 'image'} (${image?.platform || 'unknown'})`)
      return true
    } catch (err: any) {
      setError(err.message)
      notify('error', `Failed to retry ${image?.full_name || 'image'}: ${err.message}`)
      return false
    }
  }

  const exportImage = async (id: number) => {
    const image = images.find(img => img.id === id)
    try {
      const res = await imagesApi.export(id)
      await fetchImages()
      notify('success', `Exported ${image?.full_name || 'image'} to ${res.data.path}`)
      return res.data.path
    } catch (err: any) {
      setError(err.message)
      notify('error', `Failed to export ${image?.full_name || 'image'}: ${err.message}`)
      return null
    }
  }

  return {
    images,
    loading,
    error,
    createImage,
    updateImage,
    deleteImage,
    pullImage,
    exportImage,
    refresh: fetchImages,
  }
}
