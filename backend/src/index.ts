import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { Bindings } from '@/types'
import shareRoutes from '@/routes/share.route'
import { CustomError } from '@/utils/error'
import { errorResponse } from '@/utils/response'

const app = new Hono<{ Bindings: Bindings }>()

// Cho phép CORS để Frontend gọi được API
app.use(
  '/api/*',
  cors({
    origin: [
      // 'http://localhost:3000',
      'https://frontend.trinhminhnhatym.workers.dev'
    ]
  }),
)

// Gắn các routes vào app
app.route('/api', shareRoutes)

// CƠ CHẾ BẮT LỖI TẬP TRUNG (Global Error Handler)
app.onError((err, c) => {
  if (err instanceof CustomError) {
    return c.json(errorResponse(err.message), err.status as any)
  }

  console.error(err)
  return c.json(errorResponse('Lỗi server nội bộ'), 500)
})

export default app
