import { useState, useEffect, useCallback } from 'react'
import { imagesApi } from '../api'
import type { Image } from '../types'

export function useImages() {
  const [images, setImages] = useState<Image[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      await imagesApi.create(data)
      await fetchImages()
      return true
    } catch (err: any) {
      setError(err.message)
      return false
    }
  }

  const deleteImage = async (id: number) => {
    try {
      await imagesApi.delete(id)
      await fetchImages()
      return true
    } catch (err: any) {
      setError(err.message)
      return false
    }
  }

  const pullImage = async (id: number) => {
    try {
      await imagesApi.pull(id)
      return true
    } catch (err: any) {
      setError(err.message)
      return false
    }
  }

  const exportImage = async (id: number) => {
    try {
      const res = await imagesApi.export(id)
      await fetchImages()
      return res.data.path
    } catch (err: any) {
      setError(err.message)
      return null
    }
  }

  return {
    images,
    loading,
    error,
    createImage,
    deleteImage,
    pullImage,
    exportImage,
    refresh: fetchImages,
  }
}
