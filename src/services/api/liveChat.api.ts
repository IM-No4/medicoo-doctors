import { apiClient } from './client';

export interface LiveChatMessage {
  _id: string;
  sender: 'user' | 'bot' | 'agent';
  text: string;
  timestamp: string;
}

export interface LiveChat {
  _id: string;
  status: 'bot' | 'waiting' | 'open' | 'closed';
  subject: string;
  category: string;
  messages: LiveChatMessage[];
  createdOn: string;
  lastActivityAt: string;
}

export const getActiveLiveChat = async (): Promise<LiveChat | null> => {
  const res = await apiClient.get('/api/v1/live-chat/doctor/active');
  return res.data?.data ?? null;
};

export const startLiveChat = async (subject: string, category?: string): Promise<LiveChat> => {
  const res = await apiClient.post('/api/v1/live-chat/doctor/start', { subject, category });
  return res.data.data as LiveChat;
};

export const sendLiveChatMessage = async (chatId: string, text: string): Promise<LiveChatMessage> => {
  const res = await apiClient.post(`/api/v1/live-chat/doctor/${chatId}/messages`, { text });
  return res.data.data as LiveChatMessage;
};

export const closeLiveChat = async (chatId: string): Promise<LiveChat> => {
  const res = await apiClient.post(`/api/v1/live-chat/doctor/${chatId}/close`);
  return res.data.data as LiveChat;
};
