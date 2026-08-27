'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Copy, Check, ExternalLink, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export default function SuccessPage() {
  const { token } = useParams()
  const [copied, setCopied] = useState(false)
  const [shareLink, setShareLink] = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setShareLink(`${window.location.origin}/share/${token}`)
    }
  }, [token])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl p-8 border border-slate-100 text-center">
        <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <Check className="w-10 h-10" strokeWidth={3} />
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-2">
          Upload thành công!
        </h1>
        <p className="text-slate-500 mb-8">
          File của bạn đã được mã hóa và lưu trữ an toàn. Hãy chia sẻ link bên
          dưới cho người nhận.
        </p>

        <div className="flex items-center space-x-2 bg-slate-50 p-2 rounded-xl border border-slate-200 mb-8">
          <input
            type="text"
            readOnly
            value={shareLink}
            className="flex-1 bg-transparent border-none text-slate-700 text-sm font-medium px-3 outline-none"
          />
          <button
            onClick={handleCopy}
            className={cn(
              'flex items-center px-4 py-2 rounded-lg font-medium text-sm transition-all',
              copied
                ? 'bg-green-500 text-white'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 shadow-sm',
            )}
          >
            {copied ? (
              <Check className="w-4 h-4 mr-1.5" />
            ) : (
              <Copy className="w-4 h-4 mr-1.5" />
            )}
            {copied ? 'Đã copy' : 'Copy'}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/"
            className="flex-1 flex items-center justify-center px-6 py-3 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-all"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Về trang chủ
          </Link>
          <button
            onClick={() => window.open(shareLink, '_blank')}
            className="flex-1 flex items-center justify-center px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-md hover:shadow-lg transition-all"
          >
            Mở link
            <ExternalLink className="w-4 h-4 ml-2" />
          </button>
        </div>
      </div>
    </main>
  )
}
