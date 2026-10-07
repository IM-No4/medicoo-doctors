import { apiClient } from './client';

export interface ConsultationChatMessage {
  _id: string;
  appointmentId: string;
  senderId: string;
  senderRole: 'customer' | 'doctor';
  text: string;
  readAt: string | null;
  createdOn: string;
  status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
}

export const getConsultationMessages = async (requestId: string, before?: string) => {
  const res = await apiClient.get(`/api/consultation-chat/${requestId}/messages`, {
    params: before ? { before } : undefined,
  });
  return res.data as { messages: ConsultationChatMessage[]; viewerRole: 'customer' | 'doctor' };
};

export const sendConsultationMessage = async (requestId: string, text: string) => {
  const res = await apiClient.post(`/api/consultation-chat/${requestId}/messages`, { text });
  return res.data as { message: ConsultationChatMessage };
};

export const markConsultationChatAsRead = async (requestId: string) => {
  const res = await apiClient.post(`/api/consultation-chat/${requestId}/read`);
  return res.data as { success: boolean; readAt: string };
};

