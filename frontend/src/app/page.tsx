import { UploadForm } from '@/components/UploadForm'

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Chia sẻ File an toàn
          </h1>
          <p className="text-slate-500 mt-2">
            Nhanh chóng, miễn phí và bảo mật tuyệt đối.
          </p>
        </div>

        <UploadForm />
      </div>
    </main>
  )
}
