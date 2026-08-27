import { Bindings, ShareRecord } from '@/types'
import { generateToken } from '@/utils/token'
import { CustomError } from '@/utils/error'

export const uploadFileService = async (
  env: Bindings,
  file: File,
  expiresInHours: number,
  maxDownloads: number,
) => {
  const id = crypto.randomUUID()
  const shareToken = generateToken()
  const objectKey = `uploads/${id}-${file.name}`

  const now = Math.floor(Date.now() / 1000)
  const expiresAt = now + expiresInHours * 60 * 60

  try {
    await env.FILE_BUCKET.put(objectKey, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type },
    })
  } catch (_error) {
    throw new CustomError('Lỗi khi lưu file lên R2', 500)
  }

  try {
    await env.DB.prepare(
      `INSERT INTO shares (id, object_key, original_name, content_type, size, share_token, expires_at, max_downloads, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        id,
        objectKey,
        file.name,
        file.type || 'application/octet-stream',
        file.size,
        shareToken,
        expiresAt,
        maxDownloads,
        now,
      )
      .run()

    return shareToken
  } catch (_error) {
    await env.FILE_BUCKET.delete(objectKey)
    throw new CustomError('Lỗi khi lưu thông tin vào database', 500)
  }
}

export const getFileInfoService = async (env: Bindings, token: string) => {
  const share = await env.DB.prepare(
    `SELECT original_name, size, expires_at, max_downloads, download_count 
     FROM shares WHERE share_token = ?`,
  )
    .bind(token)
    .first<ShareRecord>()

  if (!share) {
    throw new CustomError('Link không tồn tại', 404)
  }

  const now = Math.floor(Date.now() / 1000)
  if (now > share.expires_at) {
    throw new CustomError('Link đã hết hạn', 410)
  }

  if (share.download_count >= share.max_downloads) {
    throw new CustomError('Đã hết lượt download', 410)
  }

  return share
}

export const downloadFileService = async (env: Bindings, token: string) => {
  const now = Math.floor(Date.now() / 1000)

  // Download thành công thì trả về thông tin liệt kê trong phần RETURNING, thất bại thì trả về null
    const updateResult = await env.DB.prepare(
    `UPDATE shares 
     SET download_count = download_count + 1 
     WHERE share_token = ? 
       AND download_count < max_downloads 
       AND expires_at > ?
     RETURNING object_key, original_name, content_type`,
  )
    .bind(token, now)
    .first<ShareRecord>()

  // Nếu ko down được, kiểm tra tại sao
  if (!updateResult) {
    const share = await env.DB.prepare(
      `SELECT expires_at, max_downloads, download_count FROM shares WHERE share_token = ?`,
    )
      .bind(token)
      .first<ShareRecord>()

    if (!share) throw new CustomError('Link không tồn tại', 404)
    if (now > share.expires_at)
      throw new CustomError('File không được download (Đã hết hạn)', 410)
    throw new CustomError('File không được download (Đã hết lượt)', 410)
  }

  const objectKey = updateResult.object_key
  const object = await env.FILE_BUCKET.get(objectKey)

  if (!object) {
    throw new CustomError('File data is missing', 404)
  }

  return {
    object,
    originalName: updateResult.original_name,
  }
}
