import crashlytics from '@react-native-firebase/crashlytics';

export function initCrashReporting() {
  crashlytics().setCrashlyticsCollectionEnabled(true);

  const errorUtils = (global as any).ErrorUtils;
  const previousHandler = errorUtils?.getGlobalHandler?.();

  errorUtils?.setGlobalHandler?.((error: Error, isFatal?: boolean) => {
    crashlytics().recordError(error);
    previousHandler?.(error, isFatal);
  });
}

export function setCrashReportingUser(userId: string | null) {
  crashlytics().setUserId(userId ?? '');
}
