import { z } from 'zod'

export const uploadSchema = z.object({
  file: z
    .instanceof(File, { message: 'Upload thiếu file' })
    .refine(
      (file) => file.size <= 25 * 1024 * 1024,
      'File không được vượt quá 25MB',
    ),
  expires_in_hours: z
    .string()
    .regex(/^\d+$/, 'Thời gian hết hạn không hợp lệ')
    .transform(Number)
    .refine(
      (val) => [1, 24, 7 * 24].includes(val),
      'Chỉ chấp nhận 1, 24 hoặc 168 (7 ngày) giờ',
    ),
  max_downloads: z
    .string()
    .regex(/^\d+$/, 'Lượt tải không hợp lệ')
    .transform(Number)
    .refine((val) => val > 0, 'Lượt tải phải lớn hơn 0'),
})
