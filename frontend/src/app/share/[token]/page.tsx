'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { FileIcon, Download, AlertCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { formatSize, formatTime } from '@/lib/utils'
import { getFileInfoAPI, downloadFileAPI } from '@/lib/api'
import { FileInfo } from '@/types'

export default function SharePage() {
  const { token } = useParams()
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    const fetchFileInfo = async () => {
      try {
        const data = await getFileInfoAPI(token as string)
        setFileInfo(data)
      } catch (err: any) {
        setErrorMsg(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchFileInfo()
  }, [token])

  const handleDownload = async () => {
    if (!fileInfo || downloading) return
    if (fileInfo.download_count >= fileInfo.max_downloads) {
      setErrorMsg('Đã hết lượt tải.')
      return
    }

    setDownloading(true)
    try {
      await downloadFileAPI(token as string, fileInfo.original_name)

      // Cập nhật số lượt tải trực tiếp trên UI
      setFileInfo({
        ...fileInfo,
        download_count: fileInfo.download_count + 1
      })
    } catch (err: any) {
      setErrorMsg('Lỗi kết nối tới máy chủ')
    } finally {
      setDownloading(false)
    }
  }
  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
      </main>
    )
  }

  if (errorMsg) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 border border-slate-100 text-center">
          <div className="w-20 h-20 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Không thể tải file
          </h1>
          <p className="text-slate-600 mb-8">{errorMsg}</p>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-all"
          >
            Về trang chủ
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-blue-100">
            <FileIcon className="w-10 h-10" strokeWidth={2} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-1 line-clamp-2">
            {fileInfo?.original_name}
          </h1>
          <p className="text-slate-500 font-medium">
            {fileInfo?.size ? formatSize(fileInfo.size) : 'Unknown size'}
          </p>
        </div>

        <div className="space-y-4 mb-8">
          <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-sm font-semibold text-slate-600">
              Hết hạn vào
            </span>
            <span className="text-sm font-medium text-slate-900 text-right">
              {fileInfo?.expires_at
                ? formatTime(fileInfo.expires_at)
                : 'Không xác định'}
            </span>
          </div>
          <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-sm font-semibold text-slate-600">
              Lượt tải còn lại
            </span>
            <span className="text-sm font-medium text-slate-900">
              {fileInfo ? fileInfo.max_downloads - fileInfo.download_count : 0}{' '}
              / {fileInfo?.max_downloads}
            </span>
          </div>
        </div>

        <button
          onClick={handleDownload}
          disabled={downloading || (fileInfo ? fileInfo.download_count >= fileInfo.max_downloads : false)}
          className={`w-full flex items-center justify-center py-4 px-4 rounded-xl text-white font-semibold text-lg transition-all shadow-md ${fileInfo && fileInfo.download_count >= fileInfo.max_downloads
              ? 'bg-slate-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0'
            }`}
        >
          {downloading ? (
            <Loader2 className="w-6 h-6 mr-2 animate-spin" />
          ) : (
            <Download className="w-6 h-6 mr-2" />
          )}
          {fileInfo && fileInfo.download_count >= fileInfo.max_downloads ? 'Đã Hết Lượt Tải' : (downloading ? 'Đang Tải...' : 'Tải File Xuống')}
        </button>
      </div>
    </main>
  )
}
