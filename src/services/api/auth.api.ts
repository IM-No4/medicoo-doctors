import { Platform } from 'react-native';
import { apiClient } from './client';

export const sendOtp = async (mobile: string) => {
  const res = await apiClient.post('/api/doctor-auth/send-otp', { mobile });
  return res.data;
};

export const verifyOtp = async (
  mobile: string,
  otp: string,
  fcmToken?: string,
  deviceId?: string
) => {
  const deviceInfo = {
    deviceId,
    fcmToken,
    platform: Platform.OS,
    version: Platform.Version,
  };

  const res = await apiClient.post('/api/doctor-auth/verify-otp', {
    mobile,
    otp,
    fcmToken,
    deviceId,
    deviceInfo,
  });

  return res.data;
};

export const resendOtp = async (mobile: string) => {
  const res = await apiClient.post('/api/doctor-auth/resend-otp', { mobile });
  return res.data;
};

export const logoutApi = async () => {
  await apiClient.post('/api/doctor-auth/log-out');
};
