import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../config/env';
import { getToken } from '../utils/tokenManagement';

let socket: Socket | null = null;

type ConsultationChatMessagePayload = { requestId: string; message: any };
type ConsultationChatMessageHandler = (payload: ConsultationChatMessagePayload) => void;
const chatMessageHandlers = new Set<ConsultationChatMessageHandler>();

type ConsultationTypingPayload = { requestId: string; isTyping: boolean; senderRole?: string };
type ConsultationTypingHandler = (payload: ConsultationTypingPayload) => void;
const typingHandlers = new Set<ConsultationTypingHandler>();

type ConsultationChatReadPayload = { requestId: string; readAt: string; readerRole?: string };
type ConsultationChatReadHandler = (payload: ConsultationChatReadPayload) => void;
const readHandlers = new Set<ConsultationChatReadHandler>();

type ConsultationChatDeliveredPayload = { requestId: string; messageId?: string; deliveredAt: string };
type ConsultationChatDeliveredHandler = (payload: ConsultationChatDeliveredPayload) => void;
const deliveredHandlers = new Set<ConsultationChatDeliveredHandler>();

/** Subscribe to real-time consultation chat messages. Returns an unsubscribe function. */
export function onConsultationChatMessage(handler: ConsultationChatMessageHandler) {
  chatMessageHandlers.add(handler);
  return () => {
    chatMessageHandlers.delete(handler);
  };
}

/** Subscribe to real-time consultation typing indicator. Returns an unsubscribe function. */
export function onConsultationTyping(handler: ConsultationTypingHandler) {
  typingHandlers.add(handler);
  return () => {
    typingHandlers.delete(handler);
  };
}

/** Subscribe to real-time consultation read receipts. Returns an unsubscribe function. */
export function onConsultationChatRead(handler: ConsultationChatReadHandler) {
  readHandlers.add(handler);
  return () => {
    readHandlers.delete(handler);
  };
}

/** Subscribe to real-time consultation delivery receipts. Returns an unsubscribe function. */
export function onConsultationChatDelivered(handler: ConsultationChatDeliveredHandler) {
  deliveredHandlers.add(handler);
  return () => {
    deliveredHandlers.delete(handler);
  };
}

type LiveChatMessagePayload = { chatId: string; message: { _id: string; sender: 'user' | 'bot' | 'agent'; text: string; timestamp: string } };
type LiveChatMessageHandler = (payload: LiveChatMessagePayload) => void;
const liveChatMessageHandlers = new Set<LiveChatMessageHandler>();

/** Subscribe to real-time live-chat messages (support executive replies). Returns an unsubscribe function. */
export function onLiveChatMessage(handler: LiveChatMessageHandler) {
  liveChatMessageHandlers.add(handler);
  return () => {
    liveChatMessageHandlers.delete(handler);
  };
}

type LiveChatStatusPayload = { chatId: string; agentName?: string; closedBy?: string };
type LiveChatStatusHandler = (payload: LiveChatStatusPayload) => void;
const liveChatAgentJoinedHandlers = new Set<LiveChatStatusHandler>();
const liveChatClosedHandlers = new Set<LiveChatStatusHandler>();

/** Subscribe to a live chat being claimed by a support executive. Returns an unsubscribe function. */
export function onLiveChatAgentJoined(handler: LiveChatStatusHandler) {
  liveChatAgentJoinedHandlers.add(handler);
  return () => {
    liveChatAgentJoinedHandlers.delete(handler);
  };
}

/** Subscribe to a live chat being closed. Returns an unsubscribe function. */
export function onLiveChatClosed(handler: LiveChatStatusHandler) {
  liveChatClosedHandlers.add(handler);
  return () => {
    liveChatClosedHandlers.delete(handler);
  };
}

/** Send a live chat message over the already-authenticated doctor socket. Returns false if not connected. */
export function emitLiveChatMessage(chatId: string, text: string): boolean {
  if (!socket?.connected) return false;
  socket.emit('live_chat:message', { chatId, text });
  return true;
}

/** Emit typing status to the other party */
export function emitConsultationTyping(requestId: string, isTyping: boolean) {
  if (socket?.connected) {
    socket.emit('consultation_chat:typing', { requestId, isTyping });
  }
}

/** Emit message read status to the other party */
export function emitConsultationChatRead(requestId: string) {
  if (socket?.connected) {
    socket.emit('consultation_chat:read', { requestId });
  }
}

/** Emit message delivered status to the other party */
export function emitConsultationChatDelivered(requestId: string, messageId?: string) {
  if (socket?.connected) {
    socket.emit('consultation_chat:delivered', { requestId, messageId });
  }
}

export async function initializeSocket() {
  if (socket?.connected) return;

  try {
    const token = await getToken('access_token');
    if (!token) {
      console.log('[Socket] No token available, skipping connection.');
      return;
    }

    // Same /customer namespace the patient app connects to - the backend
    // authenticates the socket by token, and a doctor's token is accepted
    // there the same way authMiddlewareConsumer accepts it for REST calls.
    socket = io(`${API_BASE_URL}/customer`, {
      path: '/socket.io',
      transports: ['websocket'],
      auth: { token }
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected to customer namespace successfully:', socket?.id);
    });

    socket.on('authenticated', (res) => {
      console.log('[Socket] Authenticated:', res.message);
    });

    socket.on('consultation_chat:new_message', (payload: ConsultationChatMessagePayload) => {
      chatMessageHandlers.forEach((handler) => handler(payload));
    });

    socket.on('consultation_chat:typing', (payload: ConsultationTypingPayload) => {
      typingHandlers.forEach((handler) => handler(payload));
    });

    socket.on('consultation_chat:read', (payload: ConsultationChatReadPayload) => {
      readHandlers.forEach((handler) => handler(payload));
    });

    socket.on('consultation_chat:delivered', (payload: ConsultationChatDeliveredPayload) => {
      deliveredHandlers.forEach((handler) => handler(payload));
    });

    socket.on('live_chat:message', (payload: LiveChatMessagePayload) => {
      liveChatMessageHandlers.forEach((handler) => handler(payload));
    });

    socket.on('live_chat:agent_joined', (payload: LiveChatStatusPayload) => {
      liveChatAgentJoinedHandlers.forEach((handler) => handler(payload));
    });

    socket.on('live_chat:closed', (payload: LiveChatStatusPayload) => {
      liveChatClosedHandlers.forEach((handler) => handler(payload));
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected from customer namespace:', reason);
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err);
    });

  } catch (error) {
    console.error('[Socket] Failed to initialize socket connection:', error);
  }
}

export function resetSocketState() {
  if (socket) {
    console.log('[Socket] Disconnecting and cleaning up socket...');
    socket.disconnect();
    socket = null;
  }
}
