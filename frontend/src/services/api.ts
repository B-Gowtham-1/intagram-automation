import type { HealthResponse, BackendValidationResult, JobResponse, PublishResponse } from '../types';

const API_BASE = (import.meta.env.VITE_API_URL ? String(import.meta.env.VITE_API_URL).replace(/\/+$/, '') : '') + '/api';

export async function getHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE}/health`, {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Health check failed with status: ${response.status}`);
  }

  return response.json();
}

export async function validateImagesWithBackend(files: File[]): Promise<BackendValidationResult[]> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });

  const response = await fetch(`${API_BASE}/images/validate`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Validation failed' }));
    throw new Error(err.detail || `Validation request failed with status ${response.status}`);
  }

  return response.json();
}

export async function createJob(
  files: File[],
  orderIndices: number[],
  caption: string,
  hashtags: string
): Promise<JobResponse> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });
  formData.append('order_indices', JSON.stringify(orderIndices));
  if (caption) formData.append('caption', caption);
  if (hashtags) formData.append('hashtags', hashtags);

  const response = await fetch(`${API_BASE}/jobs`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Job preparation failed' }));
    throw new Error(err.detail || `Job creation failed with status ${response.status}`);
  }

  return response.json();
}

export async function publishJob(jobId: string): Promise<PublishResponse> {
  const response = await fetch(`${API_BASE}/jobs/${jobId}/publish`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Publishing failed' }));
    throw new Error(err.detail || `Publishing request failed with status ${response.status}`);
  }

  return response.json();
}
