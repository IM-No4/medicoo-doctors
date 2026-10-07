import { apiClient } from './client';

export const getProfileDetails = async () => {
    const res = await apiClient.get('/api/user/get-profile');
    return res.data;
};

export const updateProfile = async (formData: any) => {
    const res = await apiClient.put('/api/user/save-profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
};

export const sendEmailOtp = async (email: string) => {
    const res = await apiClient.post('/api/user/send-email-otp', { email });
    return res.data;
};

export const verifyEmailOtp = async (otp: string) => {
    const res = await apiClient.post('/api/user/verify-email-otp', { otp });
    return res.data;
};

// Account deletion - starts a 30-day grace period; logging back in with
// this same account before deletionScheduledFor cancels it automatically
// (see backend customerLoginController.js), so cancelAccountDeletion below
// is only needed for a user who stays logged in and changes their mind.
export const requestAccountDeletion = async () => {
    const res = await apiClient.post('/api/user/account/delete-request');
    return res.data;
};

export const cancelAccountDeletion = async () => {
    const res = await apiClient.post('/api/user/account/delete-cancel');
    return res.data;
};

export interface AccountDeletionStatus {
    pending: boolean;
    deletionRequestedAt: string | null;
    deletionScheduledFor: string | null;
}

export const getAccountDeletionStatus = async (): Promise<AccountDeletionStatus> => {
    const res = await apiClient.get('/api/user/account/deletion-status');
    return res.data;
};

// Doctor Profile APIs
export const getDoctorProfile = async () => {
    const res = await apiClient.get('/api/user/get-doctor-profile');
    return res.data;
};

export const updateDoctorDraft = async (formData: FormData) => {
    const res = await apiClient.put('/api/user/update-doctor-draft', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
};

export const applyAsDoctor = async (formData: FormData) => {
    const res = await apiClient.post('/api/user/apply-doctor', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
};

// Update specific doctor settings (status, fees, availability, urgent
// surcharge) without full application flow
export const updateDoctorSettings = async (data: {
    isOnline?: boolean;
    consultationFees?: any;
    notificationSettings?: any;
    availability?: Record<string, { enabled: boolean; start: string; end: string }>;
    urgentSurchargePercent?: number;
}) => {
    const res = await apiClient.put('/api/user/update-doctor-settings', data);
    return res.data;
};
