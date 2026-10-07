import { Platform } from 'react-native';
import { apiClient } from './client';

// No `userType` in the body - the backend derives 'doctor' from the
// authenticated token itself (middleware/doctorOrCustomerAuth.js sets
// req.user.userType = 'doctor' for a doctor-authenticated request).
export const registerDeviceToken = async (fcmToken: string, deviceId: string) => {
  const res = await apiClient.post('/api/push-notifications/register-token', {
    fcmToken,
    deviceId,
    deviceInfo: { platform: Platform.OS },
  });
  return res.data;
};

export const unregisterDeviceToken = async (fcmToken: string) => {
  const res = await apiClient.post('/api/push-notifications/unregister-token', {
    fcmToken,
  });
  return res.data;
};
