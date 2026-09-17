export interface HealthResponse {
  status: string;
  app: string;
  version: string;
  env: string;
  database: string;
}

export interface BackendValidationResult {
  filename: string;
  is_valid: boolean;
  size_bytes: number;
  format?: string | null;
  width: number;
  height: number;
  aspect_ratio: string;
  is_nine_sixteen: boolean;
  needs_cropping: boolean;
  error_message?: string | null;
}

export type JobStatus =
  | 'RECEIVED'
  | 'VALIDATING'
  | 'PROCESSING'
  | 'UPLOADING'
  | 'VERIFYING_URLS'
  | 'READY'
  | 'PUBLISHING'
  | 'PUBLISHED'
  | 'FAILED'
  | 'CLEANUP';

export interface ImageItem {
  id: string;
  file: File;
  previewUrl: string;
  filename: string;
  sizeBytes: number;
  width: number;
  height: number;
  aspectRatio: string;
  isNineSixteen: boolean;
  isValid: boolean;
  validationError?: string;
  orderIndex: number;
}

export interface JobImageResponse {
  order_index: number;
  original_filename: string;
  original_width: number;
  original_height: number;
  processed_width: number;
  processed_height: number;
  public_url: string;
  status: string;
}

export interface JobResponse {
  job_id: string;
  status: JobStatus;
  is_duplicate: boolean;
  caption?: string | null;
  hashtags?: string | null;
  final_caption?: string | null;
  image_count: number;
  instagram_post_id?: string | null;
  error_message?: string | null;
  created_at?: string | null;
  images: JobImageResponse[];
}

export interface PublishResponse {
  job_id: string;
  status: JobStatus;
  instagram_post_id?: string | null;
  make_execution_id?: string | null;
  published_at?: string | null;
  message: string;
}
