import { apiClient } from './client';

// Commission-waiver acquisition campaigns - see backend
// controllers/doctorCampaignController.js. Uses /api/doctor-auth/, same as
// referral.api.ts and the doctor app's own standalone login system.

export interface DoctorCampaign {
    id: string;
    name: string;
    description: string;
    bannerImageUrl: string | null;
    maxParticipants: number;
    freeConsultationsPerDoctor: number;
    enrolledCount: number;
}

export interface CampaignEnrollment {
    consultationsUsed: number;
    consultationsLimit: number;
    status: 'active' | 'completed';
}

export interface ActiveCampaignResponse {
    campaign: DoctorCampaign | null;
    enrollment: CampaignEnrollment | null;
}

export const getActiveCampaign = async (): Promise<ActiveCampaignResponse> => {
    const res = await apiClient.get('/api/doctor-auth/campaigns/active');
    return res.data.data;
};

export const joinCampaign = async (campaignId: string): Promise<ActiveCampaignResponse> => {
    const res = await apiClient.post(`/api/doctor-auth/campaigns/${campaignId}/join`);
    return res.data.data;
};
