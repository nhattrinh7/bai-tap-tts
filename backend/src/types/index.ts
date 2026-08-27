export type Bindings = {
  DB: D1Database
  FILE_BUCKET: R2Bucket
}

export interface ShareRecord {
  id: string
  object_key: string
  original_name: string
  content_type: string
  size: number
  share_token: string
  expires_at: number
  max_downloads: number
  download_count: number
  created_at: number
}
