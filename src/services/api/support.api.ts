import { apiClient } from './client';

// Mirrors the generic support-ticket system every other role (customer/
// delivery-partner/pharmacy) already has - see routes/supportRoute.js and
// controllers/supportController.js on the backend. The doctor routes don't
// take an id in the URL, unlike the other roles: the backend derives the
// doctor's own id from the authenticated token instead.

export type SupportTicketCategory =
    | 'payouts_earnings'
    | 'schedule_availability'
    | 'patient_consultation'
    | 'e_prescriptions'
    | 'account_verification'
    | 'technical_glitch';

export type SupportTicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type SupportTicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface SupportTicket {
    requestId: string;
    userType: string;
    userId: string;
    category: SupportTicketCategory | string;
    priority: SupportTicketPriority;
    status: SupportTicketStatus;
    subject: string;
    description: string;
    assignedTo?: string;
    resolution?: string;
    feedback?: string;
    rating?: number | null;
    createdOn: string;
    updatedOn?: string;
}

export const createSupportRequest = async (data: {
    category: SupportTicketCategory;
    priority?: SupportTicketPriority;
    subject: string;
    description: string;
}) => {
    const res = await apiClient.post('/api/support/doctor/requests', data);
    return res.data as {
        success: boolean;
        message: string;
        data: { requestId: string; status: SupportTicketStatus; createdOn: string };
    };
};

export const getSupportRequests = async (params?: { page?: number; limit?: number; status?: SupportTicketStatus }) => {
    const res = await apiClient.get('/api/support/doctor/requests', { params });
    return res.data as {
        success: boolean;
        data: {
            requests: SupportTicket[];
            pagination: { currentPage: number; totalPages: number; total: number; hasNextPage: boolean; hasPrevPage: boolean; limit: number };
        };
    };
};

export const getSupportRequest = async (requestId: string) => {
    const res = await apiClient.get(`/api/support/doctor/requests/${requestId}`);
    return res.data as { success: boolean; data: SupportTicket };
};
