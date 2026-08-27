import { env } from 'cloudflare:workers'
import { describe, it, expect, beforeAll } from 'vitest'
import app from '@/index'

describe('Share File API Tests', () => {
  let savedToken = ''

  beforeAll(async () => {
    // Tự động setup schema cho DB test
    await env.DB.prepare(
      `
      CREATE TABLE IF NOT EXISTS shares (
        id TEXT PRIMARY KEY,
        object_key TEXT NOT NULL,
        original_name TEXT NOT NULL,
        content_type TEXT NOT NULL,
        size INTEGER NOT NULL,
        share_token TEXT UNIQUE NOT NULL,
        expires_at INTEGER NOT NULL,
        max_downloads INTEGER NOT NULL,
        download_count INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      )
    `,
    ).run()
  })

  it('(1) Tạo share thành công (Upload)', async () => {
    const formData = new FormData()
    // Tạo 1 mock file
    const file = new File(['Hello world from R2'], 'test.txt', {
      type: 'text/plain',
    })
    formData.append('file', file)
    formData.append('expires_in_hours', '24')
    formData.append('max_downloads', '5')

    const res = await app.request(
      '/api/upload',
      {
        method: 'POST',
        body: formData,
      },
      env,
    )

    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.success).toBe(true)
    expect(body.data.share_token).toBeDefined()

    savedToken = body.data.share_token // Lưu lại để dùng cho các test sau
  })

  it('(2) Input không hợp lệ bị reject (Zod Validation)', async () => {
    const formData = new FormData()
    const file = new File(['Hello'], 'test.txt', { type: 'text/plain' })
    formData.append('file', file)
    formData.append('expires_in_hours', '24')
    formData.append('max_downloads', '0') // Không hợp lệ, phải > 0

    const res = await app.request(
      '/api/upload',
      {
        method: 'POST',
        body: formData,
      },
      env,
    )

    expect(res.status).toBe(400)
    const body = (await res.json()) as any
    expect(body.error).toBe('Lượt tải phải lớn hơn 0')
  })

  it('(3) Metadata được lưu đúng vào D1', async () => {
    const share = (await env.DB.prepare(
      'SELECT * FROM shares WHERE share_token = ?',
    )
      .bind(savedToken)
      .first()) as any

    expect(share).not.toBeNull()
    expect(share.original_name).toBe('test.txt')
    expect(share.max_downloads).toBe(5)
    expect(share.download_count).toBe(0)
  })

  it('(4) Download file hợp lệ', async () => {
    const res = await app.request(`/api/share/${savedToken}/download`, {}, env)

    expect(res.status).toBe(200)
    const content = await res.text()
    expect(content).toBe('Hello world from R2') // Đảm bảo lấy đúng file từ R2

    // Kiểm tra download_count đã được tăng lên 1
    const share = (await env.DB.prepare(
      'SELECT download_count FROM shares WHERE share_token = ?',
    )
      .bind(savedToken)
      .first()) as any
    expect(share.download_count).toBe(1)
  })

  it('(5) Token không tồn tại', async () => {
    const res = await app.request('/api/share/fake_token123/download', {}, env)
    expect(res.status).toBe(404)
  })

  it('(6) Link đã hết hạn', async () => {
    // Ép thời gian hết hạn về quá khứ
    await env.DB.prepare(
      'UPDATE shares SET expires_at = ? WHERE share_token = ?',
    )
      .bind(0, savedToken)
      .run()

    const res = await app.request(`/api/share/${savedToken}/download`, {}, env)
    expect(res.status).toBe(410)

    // Reset lại thời gian cho các test sau
    const future = Math.floor(Date.now() / 1000) + 3600
    await env.DB.prepare(
      'UPDATE shares SET expires_at = ? WHERE share_token = ?',
    )
      .bind(future, savedToken)
      .run()
  })

  it('(8) Nhiều request đồng thời không vượt quá max_downloads', async () => {
    // Hiện tại download_count = 1, max_downloads = 5.
    // Tức là chỉ còn 4 lượt tải.
    // Ta bắn cùng lúc 6 lượt tải.
    const promises = []
    for (let i = 0; i < 6; i++) {
      promises.push(app.request(`/api/share/${savedToken}/download`, {}, env))
    }

    const responses = await Promise.all(promises)

    let successCount = 0
    let failCount = 0
    for (const r of responses) {
      if (r.status === 200) successCount++
      if (r.status === 410) failCount++
    }

    expect(successCount).toBe(4) // Phải có đúng 4 request thành công
    expect(failCount).toBe(2) // 2 request thừa phải bị từ chối

    // Kiểm tra DB, download_count phải dừng chính xác ở 5
    const share = (await env.DB.prepare(
      'SELECT download_count FROM shares WHERE share_token = ?',
    )
      .bind(savedToken)
      .first()) as any
    expect(share.download_count).toBe(5)
  })

  it('(7) Hết giới hạn download', async () => {
    // Hiện tại download_count đã đạt max là 5.
    const res = await app.request(`/api/share/${savedToken}/download`, {}, env)
    expect(res.status).toBe(410)

    const body = (await res.json()) as any
    expect(body.error).toBe('File không được download (Đã hết lượt)')
  })
})

/**
 * Mặc định: Storage (D1, R2, KV...) bây giờ sẽ được tự động cách ly theo từng file test. 
 * Nghĩa là dữ liệu sinh ra ở file a.test.ts sẽ không bị dính sang file b.test.ts
 * 
 * Trong trường hợp bạn có nhiều file test và muốn tất cả chúng dùng chung một cục D1/R2 
 * (giống y hệt behavior của isolatedStorage: false ngày xưa), bạn không config trong vitest.config.ts nữa. 
 * Thay vào đó, bạn chạy lệnh test với các flag sau của Vitest:
 * npx vitest run --max-workers=1 --no-isolate
 */