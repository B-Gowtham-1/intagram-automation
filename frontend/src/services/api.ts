import type { HealthResponse, BackendValidationResult, JobResponse, PublishResponse, AccountItem } from '../types';

const API_BASE = (import.meta.env.VITE_API_URL ? String(import.meta.env.VITE_API_URL).replace(/\/+$/, '') : '') + '/api';

export async function getAccounts(): Promise<AccountItem[]> {
  const response = await fetch(`${API_BASE}/accounts`, {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch accounts with status: ${response.status}`);
  }

  return response.json();
}

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
  hashtags: string,
  accountId: string = 'account_1',
  mediaEdits?: Array<Record<string, any>>
): Promise<JobResponse> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });
  formData.append('order_indices', JSON.stringify(orderIndices));
  if (mediaEdits && mediaEdits.length > 0) {
    formData.append('media_edits', JSON.stringify(mediaEdits));
  }
  if (caption) formData.append('caption', caption);
  if (hashtags) formData.append('hashtags', hashtags);
  if (accountId) formData.append('account_id', accountId);

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

export async function publishJob(
  jobId: string,
  provider: string = 'make',
  customWebhookUrl?: string
): Promise<PublishResponse> {
  const query = new URLSearchParams();
  if (provider) query.set('provider', provider);
  if (customWebhookUrl && customWebhookUrl.trim()) {
    query.set('custom_webhook_url', customWebhookUrl.trim());
  }

  const endpoint = `${API_BASE}/jobs/${jobId}/publish?${query.toString()}`;
  const response = await fetch(endpoint, {
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

export async function getJobs(limit: number = 50): Promise<JobResponse[]> {
  const response = await fetch(`${API_BASE}/jobs?limit=${limit}`, {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch jobs with status: ${response.status}`);
  }

  return response.json();
}

export interface ConnectedInstagramPageItem {
  id: number;
  page_id: string;
  page_name: string;
  instagram_business_id: string;
  instagram_username: string;
  instagram_name?: string | null;
  profile_picture_url?: string | null;
  is_selected: boolean;
}

export interface FacebookStatusResponse {
  is_connected: boolean;
  user_name?: string | null;
  user_id?: string | null;
  pages: ConnectedInstagramPageItem[];
  selected_page?: ConnectedInstagramPageItem | null;
}

export async function getFacebookStatus(): Promise<FacebookStatusResponse> {
  const response = await fetch(`${API_BASE}/facebook/status`, {
    headers: { 'Accept': 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch Facebook status with status: ${response.status}`);
  }
  return response.json();
}

export async function connectFacebook(
  accessToken: string,
  appId?: string
): Promise<{ success: boolean; user_name: string; count: number; message: string }> {
  const response = await fetch(`${API_BASE}/facebook/connect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ access_token: accessToken, app_id: appId }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Failed to connect Facebook' }));
    throw new Error(err.detail || `Facebook connection failed with status ${response.status}`);
  }
  return response.json();
}

export async function selectInstagramPage(instagramBusinessId: string): Promise<any> {
  const response = await fetch(`${API_BASE}/facebook/select-page`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ instagram_business_id: instagramBusinessId }),
  });
  if (!response.ok) {
    throw new Error(`Failed to select Instagram page: ${response.status}`);
  }
  return response.json();
}

export interface MetaOAuthConfigResponse {
  app_id: string;
  has_secret: boolean;
  redirect_uri: string;
}

export async function getMetaOAuthConfig(): Promise<MetaOAuthConfigResponse> {
  const response = await fetch(`${API_BASE}/facebook/oauth/config`, {
    headers: { 'Accept': 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch Meta OAuth config: ${response.status}`);
  }
  return response.json();
}

export async function updateMetaOAuthConfig(
  appId: string,
  appSecret?: string,
  redirectUri?: string
): Promise<{ success: boolean; app_id: string; has_secret: boolean; message: string }> {
  const response = await fetch(`${API_BASE}/facebook/oauth/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret, redirect_uri: redirectUri }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Failed to update Meta config' }));
    throw new Error(err.detail || `Update failed with status ${response.status}`);
  }
  return response.json();
}

export async function disconnectFacebook(): Promise<any> {
  const response = await fetch(`${API_BASE}/facebook/disconnect`, {
    method: 'POST',
    headers: { 'Accept': 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Failed to disconnect Facebook: ${response.status}`);
  }
  return response.json();
}

export interface BrowserLoginStatusResponse {
  state: 'idle' | 'running' | 'success' | 'error';
  message: string;
  user_name?: string | null;
  user_id?: string | null;
  detected_pages_count?: number;
}

export async function startFacebookBrowserLogin(): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE}/facebook/browser-login/start`, {
    method: 'POST',
    headers: { 'Accept': 'application/json' },
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Failed to start login' }));
    throw new Error(err.detail || `Start login failed with status ${response.status}`);
  }
  return response.json();
}

export async function getFacebookBrowserLoginStatus(): Promise<BrowserLoginStatusResponse> {
  const response = await fetch(`${API_BASE}/facebook/browser-login/status`, {
    headers: { 'Accept': 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Failed to check browser login status: ${response.status}`);
  }
  return response.json();
}

export async function updatePageInstagram(
  pageId: string,
  instagramUsername: string,
  instagramBusinessId?: string
): Promise<any> {
  const response = await fetch(`${API_BASE}/facebook/update-page-instagram`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({
      page_id: pageId,
      instagram_username: instagramUsername,
      instagram_business_id: instagramBusinessId,
    }),
  });
  if (!response.ok) {
    throw new Error(`Failed to update page Instagram handle: ${response.status}`);
  }
  return response.json();
}

export async function resyncFacebookPages(): Promise<any> {
  const response = await fetch(`${API_BASE}/facebook/resync`, {
    method: 'POST',
    headers: { 'Accept': 'application/json' },
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Resync failed' }));
    throw new Error(err.detail || `Resync failed with status ${response.status}`);
  }
  return response.json();
}

export async function testWebhookUrl(url: string): Promise<{ success: boolean; status_code: number; message: string }> {
  const response = await fetch(`${API_BASE}/jobs/test-webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Failed to test webhook' }));
    throw new Error(err.detail || `Test failed with status ${response.status}`);
  }
  return response.json();
}



export interface PublicMediaLinkItem {
  order_index: number;
  filename: string;
  media_type: 'IMAGE' | 'VIDEO';
  public_url: string;
  width: number;
  height: number;
  size_bytes: number;
}

export interface PublicMediaLinksResponse {
  success: boolean;
  count: number;
  links: PublicMediaLinkItem[];
}

export async function uploadForPublicLinks(
  files: File[],
  mediaEdits?: Array<Record<string, any>>
): Promise<PublicMediaLinksResponse> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });
  if (mediaEdits && mediaEdits.length > 0) {
    formData.append('media_edits', JSON.stringify(mediaEdits));
  }

  const response = await fetch(`${API_BASE}/images/upload-public-links`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Failed to upload media for public links' }));
    throw new Error(err.detail || `Upload failed with status ${response.status}`);
  }

  return response.json();
}
