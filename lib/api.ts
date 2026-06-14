import { supabase } from './supabase';
import { AutomationJob, ActivityLog } from './types';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

export interface InstagramConnection {
  id: string;
  user_id: string;
  username: string | null;
  status: 'connected' | 'disconnected' | 'in_progress';
  last_sync_at?: string;
  mode: 'sim' | 'live';
  token_encrypted?: string | null;
}

export interface ConnectInstagramRequest {
  mode: 'sim' | 'live' | 'browser';
  username?: string;
  password?: string;
}

export interface ConnectInstagramResponse {
  connection: InstagramConnection;
}

export interface ProgressHistory {
  score: number;
  recorded_at: string;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }
  return headers;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = 'Request failed';
    try {
      const error = await response.json();
      message = error.message || error.error || message;
    } catch {
      message = `HTTP ${response.status}: ${response.statusText}`;
    }
    throw new Error(message);
  }
  
  // Handle responses with no body (204 No Content, empty responses)
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return undefined as T;
  }
  
  // Read as text first to check if body is empty
  const text = await response.text();
  if (!text) {
    return undefined as T;
  }
  
  return JSON.parse(text) as T;
}

export async function connectInstagram(
  mode: 'sim' | 'live' | 'browser',
  credentials?: { username: string; password: string }
): Promise<InstagramConnection> {
  const headers = await getAuthHeaders();
  const body: ConnectInstagramRequest = { mode };
  if (credentials) {
    body.username = credentials.username;
    body.password = credentials.password;
  }

  const response = await fetch(`${API_BASE_URL}/instagram/connect`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const data = await handleResponse<ConnectInstagramResponse>(response);
  return data.connection;
}

export async function disconnectInstagram(): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/instagram/connect`, {
    method: 'DELETE',
    headers,
  });
  await handleResponse<void>(response);
}

export async function getConnectionStatus(): Promise<InstagramConnection | null> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/instagram/connect`, {
    method: 'GET',
    headers,
  });
  if (response.status === 404) {
    return null;
  }
  const data = await handleResponse<{ connection: InstagramConnection }>(response);
  return data.connection;
}

// Automation API functions

export async function getAutomationStatus(): Promise<AutomationJob> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/automation/status`, {
    method: 'GET',
    headers,
  });
  return handleResponse<AutomationJob>(response);
}

export async function startAutomation(): Promise<AutomationJob> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/automation/start`, {
    method: 'POST',
    headers,
  });
  return handleResponse<AutomationJob>(response);
}

export async function pauseAutomation(): Promise<AutomationJob> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/automation/pause`, {
    method: 'POST',
    headers,
  });
  return handleResponse<AutomationJob>(response);
}

export async function getActivityLog(limit = 50): Promise<ActivityLog[]> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/automation/activity?limit=${limit}`, {
    method: 'GET',
    headers,
  });
  return handleResponse<ActivityLog[]>(response);
}

export async function getProgressHistory(limit = 100): Promise<ProgressHistory[]> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/automation/history?limit=${limit}`, {
    method: 'GET',
    headers,
  });
  return handleResponse<ProgressHistory[]>(response);
}

// User data management

export async function deleteAllData(): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/user/data`, {
    method: 'DELETE',
    headers,
  });
  await handleResponse<void>(response);
}
