'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { UploadCloud, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { uploadFileAPI } from '@/lib/api'

import { uploadSchema, UploadFormType } from '@/schemas/upload.schema'

export function UploadForm() {
  const router = useRouter()
  const [isDragging, setIsDragging] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<UploadFormType>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      expires_in_hours: '24',
      max_downloads: 1,
    },
  })

  const selectedFile = watch('file')

  const onSubmit = async (data: UploadFormType) => {
    setErrorMsg('')
    try {
      const shareToken = await uploadFileAPI(
        data.file,
        data.expires_in_hours,
        data.max_downloads,
      )
      // Upload thành công, chuyển hướng sang trang success
      router.push(`/success/${shareToken}`)
    } catch (err: any) {
      setErrorMsg(err.message)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setValue('file', e.dataTransfer.files[0], { shouldValidate: true })
    }
  }

  return (
    <>
      {errorMsg && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium text-center">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* File Upload Area */}
        <div
          className={cn(
            'relative group border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-200 ease-in-out cursor-pointer',
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-slate-300 hover:border-slate-400 bg-slate-50 hover:bg-slate-100',
            errors.file ? 'border-red-400 bg-red-50' : '',
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <input
            id="file-input"
            type="file"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0])
                setValue('file', e.target.files[0], { shouldValidate: true })
            }}
          />

          <div className="flex flex-col items-center justify-center space-y-4 pointer-events-none">
            <div className="p-4 bg-white rounded-full shadow-sm">
              <UploadCloud
                className={cn(
                  'w-8 h-8',
                  isDragging ? 'text-blue-500' : 'text-slate-400',
                )}
              />
            </div>
            <div>
              {selectedFile ? (
                <p className="font-semibold text-slate-700 truncate max-w-xs">
                  {selectedFile.name}
                </p>
              ) : (
                <>
                  <p className="text-base font-medium text-slate-700">
                    Kéo thả file vào đây hoặc{' '}
                    <span className="text-blue-600 font-semibold">Chọn file</span>
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    Giới hạn tối đa 25MB
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
        {errors.file && (
          <p className="text-red-500 text-sm mt-1 font-medium">
            {errors.file.message as string}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Hết hạn */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">
              Thời gian tồn tại
            </label>
            <select
              {...register('expires_in_hours')}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block p-3 outline-none transition-all"
            >
              <option value="1">1 giờ</option>
              <option value="24">24 giờ (1 ngày)</option>
              <option value="168">168 giờ (7 ngày)</option>
            </select>
            {errors.expires_in_hours && (
              <p className="text-red-500 text-sm font-medium">
                {errors.expires_in_hours.message}
              </p>
            )}
          </div>

          {/* Giới hạn tải */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">
              Giới hạn lượt tải
            </label>
            <input
              type="number"
              {...register('max_downloads', { valueAsNumber: true })}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block p-3 outline-none transition-all"
              placeholder="VD: 5"
            />
            {errors.max_downloads && (
              <p className="text-red-500 text-sm font-medium">
                {errors.max_downloads.message}
              </p>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center py-3.5 px-4 rounded-xl text-white font-semibold text-base transition-all bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Đang xử lý...
            </>
          ) : (
            'Tạo link chia sẻ'
          )}
        </button>
      </form>
    </>
  )
}
