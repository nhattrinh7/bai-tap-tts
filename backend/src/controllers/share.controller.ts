import { Context } from 'hono'
import { Bindings } from '@/types'
import {
  uploadFileService,
  getFileInfoService,
  downloadFileService,
} from '@/services/share.service'
import { successResponse } from '@/utils/response'
// Removed cleanRegex

export const uploadFile = async (c: Context<{ Bindings: Bindings }>) => {
  const body = await c.req.parseBody()
  const file = body.file as File
  const expiresInHours = Number(body.expires_in_hours)
  const maxDownloads = Number(body.max_downloads)

  const shareToken = await uploadFileService(
    c.env,
    file,
    expiresInHours,
    maxDownloads,
  )
  return c.json(successResponse({ share_token: shareToken }))
}

export const getFileInfo = async (c: Context<{ Bindings: Bindings }>) => {
  const token = c.req.param('token') as string

  const share = await getFileInfoService(c.env, token)
  return c.json(
    successResponse({
      original_name: share.original_name,
      size: share.size,
      expires_at: share.expires_at,
      max_downloads: share.max_downloads,
      download_count: share.download_count,
    }),
  )
}

export const downloadFile = async (c: Context<{ Bindings: Bindings }>) => {
  const token = c.req.param('token') as string

  const { object, originalName } = await downloadFileService(c.env, token)

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set(
    'Content-Disposition',
    `attachment; filename="${originalName}"`,
  )

  return new Response(object.body, { headers })
}
