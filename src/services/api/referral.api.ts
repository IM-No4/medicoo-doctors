import { apiClient } from './client';

// Colleague referrals - see backend controllers/doctorReferralController.js.
// Uses /api/doctor-auth/ (the doctor app's own standalone login system),
// same as account-deletion in user.api.ts.

export interface ReferredColleague {
    id: string;
    name: string;
    specialization: string;
    date: string;
    status: 'Active on Medicoo';
}

export interface ReferralInfo {
    referralCode: string;
    colleagues: ReferredColleague[];
}

export const getReferralInfo = async (): Promise<ReferralInfo> => {
    const res = await apiClient.get('/api/doctor-auth/referral');
    return res.data.data;
};

export const redeemReferralCode = async (code: string): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.post('/api/doctor-auth/referral/redeem', { code });
    return res.data;
};
