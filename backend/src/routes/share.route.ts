import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { Bindings } from '@/types'
import { uploadSchema } from '@/schemas/share.schema'
import {
  uploadFile,
  getFileInfo,
  downloadFile,
} from '@/controllers/share.controller'
import { errorResponse } from '@/utils/response'

const router = new Hono<{ Bindings: Bindings }>()

router.post(
  '/upload',
  zValidator('form', uploadSchema, (result, c) => {
    if (!result.success) {
      return c.json(errorResponse(result.error.issues[0].message), 400)
    }
  }),
  uploadFile,
)

router.get('/share/:token', getFileInfo)

router.get('/share/:token/download', downloadFile)

export default router
