export type Topic = string;

export type Direction = 'amplify' | 'reduce';

export type ConnectionStatus = 'connected' | 'disconnected' | 'in_progress';

export type AutomationStatus = 'active' | 'paused' | 'error';

export type ActionResult = 'success' | 'failed' | 'skipped';

export interface User {
  id: string;
  email?: string;
  created_at: string;
}

export interface InstagramConnection {
  id: string;
  user_id: string;
  username: string | null;
  status: ConnectionStatus;
  last_sync_at?: string;
  mode: 'sim' | 'live' | 'browser';
  token_encrypted?: string | null;
}

export interface Preference {
  id: string;
  user_id: string;
  topic: Topic;
  direction: Direction;
  created_at: string;
}

export interface AutomationJob {
  id: string;
  user_id: string;
  status: AutomationStatus;
  started_at: string;
  last_run_at?: string;
  actions_count: number;
  progress_score: number;        // 0..100
  error_message: string | null;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  action_type: string;
  topic: Topic;
  performed_at: string;
  result: ActionResult;
}
