import { z } from 'zod'

export const uploadSchema = z.object({
  file: z
    .any()
    .refine((file) => file instanceof File, 'Vui lòng chọn file')
    .refine(
      (file) => file?.size <= 25 * 1024 * 1024,
      'Kích thước file không được vượt quá 25MB',
    ),
  expires_in_hours: z.string().min(1, 'Vui lòng chọn thời gian'),
  max_downloads: z.number().min(1, 'Số lượt tải tối thiểu là 1'),
})

export type UploadFormType = z.infer<typeof uploadSchema>
