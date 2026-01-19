export interface WebSocketMessage {
  type: MessageType;
  payload?: any;
  timestamp: number;
  id?: string;
}

export enum MessageType {
  AUTH = 'AUTH',
  MESSAGE = 'MESSAGE',
  ACK = 'ACK',
  HISTORY_REQUEST = 'HISTORY_REQUEST',
  HISTORY_RESPONSE = 'HISTORY_RESPONSE',
  SYNC_REQUEST = 'SYNC_REQUEST',
  SYNC_RESPONSE = 'SYNC_RESPONSE',
  PING = 'PING',
  PONG = 'PONG',
  ERROR = 'ERROR'
}

export interface AuthPayload {
  token?: string;
}

export interface AuthResponse {
  success: boolean;
  user?: {
    id: string;
    displayName?: string;
    email?: string;
    avatar_url?: string;
    bio?: string;
    is_online?: boolean;
    last_seen?: string;
  };
  error?: string;
}

export interface MessagePayload {
  to: string;
  content: string;
}

export interface MessageResponse {
  id: string;
  from: string;
  to: string;
  content: string;
  timestamp: number;
  status?: string;
}

export interface AckPayload {
  messageId: string;
}

export interface HistoryRequestPayload {
  withUserId: string;
  limit?: number;
  beforeTimestamp?: number;
}

export interface HistoryResponsePayload {
  withUserId: string;
  messages: MessageResponse[];
  hasMore?: boolean;
}

export interface SyncRequestPayload {
  lastSyncTimestamp: number;
  limit?: number;
}

export interface SyncResponsePayload {
  messages: MessageResponse[];
  syncTimestamp: number;
  hasMore?: boolean;
}

export interface ErrorPayload {
  error: string;
}
