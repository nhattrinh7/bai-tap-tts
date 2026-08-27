import { FileInfo } from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL

export const uploadFileAPI = async (
  file: File,
  expiresInHours: string,
  maxDownloads: number,
): Promise<string> => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('expires_in_hours', expiresInHours)
  formData.append('max_downloads', maxDownloads.toString())

  const res = await fetch(`${API_URL}/upload`, {
    method: 'POST',
    body: formData,
  })
  const data = await res.json()
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Có lỗi xảy ra khi upload')
  }
  return data.data.share_token
}

export const getFileInfoAPI = async (token: string): Promise<FileInfo> => {
  const res = await fetch(`${API_URL}/share/${token}`)
  const data = await res.json()
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Link không hợp lệ hoặc đã hết hạn.')
  }
  return data.data as FileInfo
}

export const downloadFileAPI = async (
  token: string,
  originalName: string,
): Promise<void> => {
  const res = await fetch(`${API_URL}/share/${token}/download`)
  if (!res.ok) {
    let errorData
    try {
      errorData = await res.json()
    } catch (e) {
      // Bỏ qua nếu response không phải JSON
    }
    throw new Error(errorData?.error || 'Có lỗi xảy ra khi tải file')
  }

  const blob = await res.blob()
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = originalName || 'download'
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
}
