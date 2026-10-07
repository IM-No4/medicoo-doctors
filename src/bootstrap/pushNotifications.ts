import messaging from '@react-native-firebase/messaging';
import * as Notifications from 'expo-notifications';
import { navigationRef } from '../navigation/navigationRef';
import { store } from '../redux/store';
import { registerDeviceToken } from '../services/api/pushNotification.api';
import { getDeviceId, getFCMToken } from '../utils/deviceUtils';

/** Fetches a real FCM token/device id and registers them with the backend. */
export async function syncPushToken() {
  if (!store.getState().boot.isAuthenticated) return;

  const fcmToken = await getFCMToken();
  if (!fcmToken) return;

  const deviceId = await getDeviceId();
  try {
    await registerDeviceToken(fcmToken, deviceId);
  } catch (error) {
    console.warn('Failed to register push token:', error);
  }
}

const goToDoctorChat = (requestId: string, senderName?: string) => {
  if (!navigationRef.isReady()) return;
  navigationRef.navigate('DoctorChat', { requestId, title: senderName });
};

const goToPatientConsultationDetail = (requestId: string) => {
  if (!navigationRef.isReady()) return;
  navigationRef.navigate('PatientConsultationDetail', {
    appointment: { requestId },
    requestId,
  });
};

const goToManageAppointments = (tab: 'requests' | 'upcoming' = 'upcoming') => {
  if (!navigationRef.isReady()) return;
  navigationRef.navigate('Tabs', {
    screen: 'ManageAppointments',
    params: { initialTab: tab },
  });
};

// Joining/permission is resolved by requestId server-side (getCallToken),
// so no role disambiguation is needed here.
const goToIncomingCall = (requestId: string, consultationType?: string, callerName?: string) => {
  if (!navigationRef.isReady()) return;
  navigationRef.navigate('DoctorCall', {
    appointment: { requestId },
    type: consultationType === 'voice' ? 'voice' : 'video',
    displayName: callerName,
  });
};

function routeNotificationTap(data?: { [key: string]: string | object } | undefined) {
  const type = typeof data?.type === 'string' ? data.type : undefined;

  if (type === 'chat_message' && typeof data?.requestId === 'string' && data.requestId) {
    const senderName = typeof data?.senderName === 'string' ? data.senderName : undefined;
    goToDoctorChat(data.requestId, senderName);
    return;
  }

  if (type === 'new_appointment_request' || type === 'doctor_request_expiry_warning') {
    if (typeof data?.requestId === 'string' && data.requestId) {
      goToPatientConsultationDetail(data.requestId);
    } else {
      goToManageAppointments('requests');
    }
    return;
  }

  if (type === 'reschedule_request') {
    if (typeof data?.requestId === 'string' && data.requestId) {
      goToPatientConsultationDetail(data.requestId);
    } else {
      goToManageAppointments('requests');
    }
    return;
  }

  if (type === 'doctor_appointment_reminder' || type === 'appointment_payment_received') {
    goToManageAppointments('upcoming');
    return;
  }

  if (type === 'appointment_cancelled' || type === 'appointment_reschedule_requested') {
    if (typeof data?.requestId === 'string' && data.requestId) {
      goToPatientConsultationDetail(data.requestId);
    } else {
      goToManageAppointments('requests');
    }
    return;
  }

  if (type === 'call_incoming' && typeof data?.requestId === 'string' && data.requestId) {
    const consultationType = typeof data?.consultationType === 'string' ? data.consultationType : undefined;
    const callerName = typeof data?.callerName === 'string' ? data.callerName : undefined;
    goToIncomingCall(data.requestId, consultationType, callerName);
    return;
  }

  // Anything else (system_alert/promotional/custom) has no fixed target in
  // this app yet - nothing to navigate to.
}

/** Foreground message + token-refresh listeners. Call once for the app's lifetime. */
export function initPushNotifications() {
  messaging().onTokenRefresh(async () => {
    syncPushToken();
  });

  // Governs whether a notification actually displays while the app is open
  // and in the foreground. Without this, the default is to show nothing.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/** Notification-tap navigation. Call once boot/navigation is ready. */
export function setupNotificationTapHandling() {
  messaging().onNotificationOpenedApp((remoteMessage) => {
    routeNotificationTap(remoteMessage?.data);
  });

  messaging()
    .getInitialNotification()
    .then((remoteMessage) => {
      if (remoteMessage) {
        routeNotificationTap(remoteMessage.data);
      }
    });

  Notifications.addNotificationResponseReceivedListener((response) => {
    routeNotificationTap(response.notification.request.content.data as any);
  });

  const lastResponse = Notifications.getLastNotificationResponse();
  if (lastResponse) {
    routeNotificationTap(lastResponse.notification.request.content.data as any);
  }
}
