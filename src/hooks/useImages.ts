import { useState, useEffect, useCallback, useRef } from 'react'
import { imagesApi } from '../api'
import type { Image } from '../types'

export function useImages(
  onNotification?: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void
) {
  const [images, setImages] = useState<Image[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const prevImagesRef = useRef<Image[]>([])
  const initialLoadDone = useRef(false)

  const notify = useCallback((type: 'success' | 'error' | 'info' | 'warning', message: string) => {
    if (onNotification) {
      onNotification(type, message)
    }
  }, [onNotification])

  const fetchImages = useCallback(async (isInitialLoad = false) => {
    if (isInitialLoad) {
      setLoading(true)
    }
    try {
      const res = await imagesApi.list()
      const newImages = res.data || []

      // Check for status changes and send notifications
      const prevImages = prevImagesRef.current
      for (const newImg of newImages) {
        const oldImg = prevImages.find(img => img.id === newImg.id)
        if (oldImg) {
          // Pull completed successfully
          if (oldImg.status === 'pulling' && newImg.status === 'success') {
            notify('success', `Pulled ${newImg.full_name} (${newImg.platform})`)
          }
          // Pull failed
          if (oldImg.status === 'pulling' && newImg.status === 'failed') {
            notify('error', `Failed to pull ${newImg.full_name} (${newImg.platform}): ${newImg.error_message || 'Unknown error'}`)
          }
          // Auto-export completed
          if (!oldImg.export_path && newImg.export_path) {
            notify('success', `Auto-exported ${newImg.full_name} to ${newImg.export_path}`)
          }
        }
      }

      prevImagesRef.current = newImages
      setImages(newImages)
      setError(null)
    } catch (err: any) {
      setError(err.message)
      setImages([])
    } finally {
      if (isInitialLoad) {
        setLoading(false)
      }
    }
  }, [notify])

  useEffect(() => {
    if (!initialLoadDone.current) {
      fetchImages(true)
      initialLoadDone.current = true
    }
    const interval = setInterval(() => fetchImages(false), 5000)
    return () => clearInterval(interval)
  }, [fetchImages])

  const createImage = async (data: any) => {
    try {
      // Check for duplicates in local state first (fast feedback) - any status
      const existingImage = images.find(
        img => img.name === data.name && img.tag === data.tag && img.platform === data.platform
      )

      if (existingImage) {
        return { success: false, duplicate: true, existingImage }
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
