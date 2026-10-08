import { apiClient } from './client';

// Doctor's side of the reschedule flow - accept locks in the patient's
// proposed time, decline falls back to an automatic refund.
export const respondToReschedule = async (requestId: string, data: { accept: boolean; remarks?: string }) => {
    const res = await apiClient.post(`/api/doctor/appointment-requests/${requestId}/reschedule-respond`, data);
    return res.data;
};

// Dual-role endpoint (also called by the patient app/doctorpartner web) -
// lives under /api/user/ because authMiddlewareConsumer authenticates both
// customer and doctor tokens the same way, not because it's patient-only.
export const getCallToken = async (requestId: string) => {
    const res = await apiClient.get(`/api/user/appointment-requests/${requestId}/call-token`);
    return res.data.data as { appId: string; channelName: string; token: string; uid: number };
};

// In-call "Emergency Assistance" action - logs the event on the appointment
// and emails Medicoo's clinical safety team. Does NOT contact emergency
// services itself; the app has no real EMS integration, so the Emergency
// sheet's direct-dial numbers are what actually gets help, this is just
// "make sure our team knows this happened."
export const flagConsultationEmergency = async (requestId: string) => {
    const res = await apiClient.post(`/api/doctor/appointment-requests/${requestId}/emergency-alert`);
    return res.data;
};

export const respondToAppointmentRequest = async (data: {
    requestId: string;
    status: 'approved' | 'rejected';
    remarks?: string;
}) => {
    const res = await apiClient.post(`/api/doctor/appointment-requests/${data.requestId}/respond`, {
        status: data.status,
        remarks: data.remarks,
    });
    return res.data;
};

export const getDoctorAppointmentRequests = async (params?: {
    status?: 'all' | 'requests' | 'upcoming' | 'history' | 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed';
    page?: number;
    limit?: number;
}) => {
    const res = await apiClient.get('/api/doctor/appointment-requests', { params });
    return res.data;
};

export const getDoctorAppointmentRequestDetail = async (requestId: string) => {
    const res = await apiClient.get(`/api/doctor/appointment-requests/${requestId}`);
    return res.data;
};

export type PrescribedMedicineInput = {
    medicineSku: number;
    medicineName: string;
    intakeDetails: {
        dosage: string;
        period: string;
        instructions?: string[];
        extra?: string;
    };
};

export type PrescribedLabTestInput = {
    testName: string;
    additionalDetails?: string;
};

export type ConsultationDetailsInput = {
    notes?: string;
    prescribedMedicines?: PrescribedMedicineInput[];
    prescribedLabTests?: PrescribedLabTestInput[];
};

export type ConsultationDetails = {
    notes: string | null;
    prescribedMedicines: PrescribedMedicineInput[];
    prescribedLabTests: PrescribedLabTestInput[];
};

export const completeAppointmentRequest = async (requestId: string, details?: ConsultationDetailsInput) => {
    const res = await apiClient.post(`/api/doctor/appointment-requests/${requestId}/complete`, details || {});
    return res.data;
};

export const getPatientConsultationHistory = async (customerId: string, excludeRequestId?: string) => {
    const res = await apiClient.get(`/api/doctor/patients/${customerId}/history`, {
        params: excludeRequestId ? { excludeRequestId } : undefined,
    });
    return res.data;
};

// In-call "Reports" tool - a doctor viewing a patient's previously uploaded
// documents. Backend gates this to patients with an approved/completed
// appointment with the requesting doctor, so viewUrl is safe to hit directly.
export type PatientDocumentSummary = {
    _id: string;
    name: string;
    documentType: 'lab_report' | 'scan' | 'xray' | 'diagnostic_report' | 'prescription' | 'other';
    sourceName?: string;
    fileType: 'image' | 'pdf' | 'document';
    mimeType: string;
    createdAt: string;
    viewUrl: string;
};

export const getPatientDocumentsForDoctor = async (customerId: string) => {
    const res = await apiClient.get(`/api/doctor/patients/${customerId}/documents`);
    return res.data.data as { documents: PatientDocumentSummary[] };
};

export const storePatientChannel = async (patientId: string, doctorId: string, channelName: string, slotId: string) => {
    const res = await apiClient.post('/api/doctor/store-channel', { patientId, doctorId, channelName, slotId });
    return res.data;
};

export const fetchPatientReports = async (customerId: string) => {
    const res = await apiClient.get(`/api/doctor/patient-reports/${customerId}`);
    return res.data;
};

export const fetchMedicines = async (query: string) => {
    const res = await apiClient.get('/api/common/medicines', { params: { q: query } });
    return res.data.data as Array<{ sku: number; productName: string; brand: string }>;
};

export const fetchLabTests = async (query: string) => {
    const res = await apiClient.get('/api/common/lab-tests', { params: { q: query } });
    return res.data.data as Array<{ testName: string }>;
};

// Reference list for the payout bank-account form's bank select - kept on
// the backend so it can grow without an app update.
export const getBankList = async () => {
    const res = await apiClient.get('/api/common/bank-list');
    return res.data.data as string[];
};

export const saveConsultationDetails = async (data: {
    requestId: string;
    notes?: string;
    prescribedMedicines?: PrescribedMedicineInput[];
    prescribedLabTests?: PrescribedLabTestInput[];
    // true for an explicit "Send Prescription Now" action - the patient is
    // notified immediately and (if there's a prescription) gets a real
    // Medical Records entry for it. Omit/false for a silent autosave tick -
    // no notification, no document generated, just persisted so a dropped
    // call doesn't lose the draft.
    notifyPatient?: boolean;
}) => {
    const { requestId, ...details } = data;
    const res = await apiClient.post(`/api/doctor/appointment-requests/${requestId}/consultation-details`, details);
    return res.data;
};

// --- Doctor Earnings & Payouts ---

export type DoctorPayoutMethod = {
    id: string;
    account_type: 'bank_account' | 'vpa';
    isDefault: boolean;
    createdAt: string;
    vpa?: { username: string; handle: string; address: string };
    bank_account?: { name: string; ifsc: string; account_number: string; bankName?: string };
    // Bank account only - Razorpay Fund Account Validation ("penny
    // drop"/"penniless") tracking. Resolves asynchronously; poll
    // getPayoutMethodVerificationStatus while 'pending'.
    verificationStatus?: 'unverified' | 'pending' | 'verified' | 'failed';
    verificationFailureReason?: string | null;
    // VPA/UPI only - resolved synchronously at creation time, nothing to poll.
    vpaVerified?: boolean;
    vpaCustomerName?: string | null;
};

export type DoctorEarningsTransaction = {
    id: string;
    type: 'credit' | 'debit';
    source: 'appointment_request' | 'slot_booking' | 'payout';
    label: string;
    sub?: string;
    amount: number;
    status: string;
    date: string;
};

export type DoctorEarningsSummary = {
    totalEarnings: number;
    holdAmount: number;
    netEarnings: number;
    amountWithdrawn: number;
    amountAvailableToWithdraw: number;
    platformCommissionRate: number;
    totalPlatformCommission: number;
    payoutHistory: Array<{ payoutId: string; amount: number; mode: string; status: string; createdAt: string }>;
    transactions: DoctorEarningsTransaction[];
};

export const getDoctorEarnings = async () => {
    const res = await apiClient.get('/api/user/get-earnings-and-payout-history');
    return res.data as DoctorEarningsSummary;
};

export const getDoctorPayoutMethods = async () => {
    const res = await apiClient.get('/api/user/get-doctor-payout-methods');
    return res.data as { payoutMethods: DoctorPayoutMethod[] };
};

export const setDefaultFundAccount = async (accountId: string) => {
    const res = await apiClient.put(`/api/user/set-default-fund-account/${accountId}`);
    return res.data;
};

export const addBankAccount = async (data: { accountHolderName: string; accountNumber: string; bankName: string; ifsc: string }) => {
    const res = await apiClient.post('/api/doctor-payout/create-fund-account', { type: 'bank_account', ...data });
    return res.data as { message: string; fundAccount: { id: string }; payoutMethod: DoctorPayoutMethod };
};

// Polls the status of a bank account's pending verification - call
// repeatedly (e.g. every few seconds) until verificationStatus is no
// longer 'pending'.
export const getPayoutMethodVerificationStatus = async (fundAccountId: string) => {
    const res = await apiClient.get(`/api/doctor-payout/payout-methods/${fundAccountId}/verification-status`);
    return res.data as { success: boolean; payoutMethod: DoctorPayoutMethod };
};

// "Create" step - promotes a verified bank-account draft (from
// addBankAccount) into a real, usable payout method, with an optional
// friendly label. Only succeeds once verificationStatus is 'verified'.
export const confirmPayoutMethod = async (fundAccountId: string, label?: string) => {
    const res = await apiClient.post(`/api/doctor-payout/payout-methods/${fundAccountId}/confirm`, { label });
    return res.data as { success: boolean; payoutMethod: DoctorPayoutMethod };
};

export const addUpiAccount = async (upiId: string) => {
    const res = await apiClient.post('/api/doctor-payout/create-fund-account', { type: 'vpa', id: upiId });
    return res.data as { message: string; fundAccount: { id: string }; payoutMethod: DoctorPayoutMethod };
};

export const requestDoctorPayout = async (amount: number, fundAccountId: string) => {
    const res = await apiClient.post('/api/doctor-payout/create-payout-order', { amount, fundAccountId });
    return res.data;
};

// --- Doctor's own reviews (DoctorReviewsScreen.tsx) ---

export type DoctorReviewItem = {
    id: string;
    patientName: string;
    rating: number;
    date: string;
    comment: string;
};

export type DoctorRatingBreakdown = {
    stars: number;
    count: number;
    percentage: number;
};

export const getMyDoctorReviews = async () => {
    const res = await apiClient.get('/api/user/my-doctor-reviews');
    return res.data.data as {
        reviews: DoctorReviewItem[];
        ratingBreakdown: DoctorRatingBreakdown[];
        averageRating: number;
        totalReviews: number;
    };
};
