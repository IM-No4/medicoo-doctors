// No deep-link targets wired up yet - the app has no public-facing content
// screens to link into (unlike the patient app's doctor/pharmacy/lab
// profile pages). Notification taps are handled separately, in
// bootstrap/pushNotifications.ts.
export function handleDeepLink(url: string) {
  console.log('[deepLinkHandler] Unhandled deep link:', url);
}
