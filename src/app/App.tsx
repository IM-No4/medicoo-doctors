import { NavigationContainer } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as Linking from 'expo-linking';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Provider, useDispatch } from 'react-redux';

import RootNavigator from '../navigation/RootNavigator';
import { handleDeepLink } from '../navigation/deepLinkHandler';
import { linking } from '../navigation/linking';
import { navigationRef } from '../navigation/navigationRef';
import { AppDispatch, store } from '../redux/store';
import { loadProfileCache, loadProfileFromServer } from '../redux/slices/profileSlice';
import { checkLegalAcceptance } from '../redux/slices/legalSlice';

import ErrorBoundary from '../components/ErrorBoundary';
import { initCrashReporting } from '../bootstrap/crashReporting';
import { initPushNotifications, setupNotificationTapHandling } from '../bootstrap/pushNotifications';
import { useBoot } from '../bootstrap/useBoot';
import { useForegroundRecheck } from '../bootstrap/useForegroundRecheck';
import { usePostLoginEffects } from '../features/auth/usePostLoginEffects';
import { FONT_MAP } from '../constants/fonts';
import { ThemeProvider, useTheme } from '../theme/ThemeContext';
import { LanguageProvider } from '../i18n/LanguageContext';
import { NetworkProvider } from '../services/network/NetworkContext';
import OfflineBanner from '../components/network/OfflineBanner';
import FloatingCallOverlay from '../components/call/FloatingCallOverlay';
import { CallProvider } from '../context/CallContext';
import { Wifi } from 'lucide-react-native';

// No JS splash screen in the flow - the native splash (configured in
// app.json) stays up for the entire loading period (fonts + boot sequence)
// and is hidden exactly once, the instant real content is ready to render.
SplashScreen.preventAutoHideAsync().catch(() => {});

function AppContent() {
  const boot = useBoot();
  const dispatch = useDispatch<AppDispatch>();
  usePostLoginEffects();
  useForegroundRecheck();

  useEffect(() => {
    if (boot.status !== 'ready') return;
    if (!boot.isAuthenticated) return;

    dispatch(loadProfileCache());
    dispatch(loadProfileFromServer());
    dispatch(checkLegalAcceptance());
  }, [boot.status, boot.isAuthenticated, dispatch]);

  // Handle deep links only after boot is ready.
  useEffect(() => {
    if (boot.status !== 'ready') return;

    Linking.getInitialURL().then((url) => {
      if (url && navigationRef.isReady()) {
        handleDeepLink(url);
      }
    });

    const sub = Linking.addEventListener('url', ({ url }) => {
      if (navigationRef.isReady()) {
        handleDeepLink(url);
      }
    });

    // Push notification taps (background wake + cold start)
    setupNotificationTapHandling();

    return () => sub.remove();
  }, [boot.status]);

  // Hide the native splash exactly once, the instant boot reaches any
  // terminal status - 'mandatoryUpdate'/'maintenance' each have their own
  // screen rendered by RootNavigator below, and neither would ever become
  // visible if the native splash stayed up waiting specifically for 'ready',
  // which neither reaches.
  useEffect(() => {
    if (
      boot.status === 'ready' ||
      boot.status === 'mandatoryUpdate' ||
      boot.status === 'maintenance' ||
      boot.isSlow
    ) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [boot.status, boot.isSlow]);

  // ⛔ Do NOT render navigation until boot is complete - every terminal
  // boot status RootNavigator has its own screen for must reach it; only
  // a boot that's genuinely still in progress stays gated here.
  const TERMINAL_STATUSES = ['ready', 'mandatoryUpdate', 'maintenance'];
  if (!TERMINAL_STATUSES.includes(boot.status)) {
    return boot.isSlow ? <SlowBootScreen /> : null;
  }

  return <RootNavigator />;
}

// Only ever shown after BootCoordinator's SLOW_BOOT_THRESHOLD_MS has passed
// with boot still not resolved.
function SlowBootScreen() {
  return (
    <View style={styles.slowBootContainer}>
      <View style={styles.slowBootIconCircle}>
        <Wifi size={28} color="#0FBBA1" />
      </View>
      <ActivityIndicator size="small" color="#0FBBA1" />
      <Text style={styles.slowBootTitle}>Hang tight...</Text>
      <Text style={styles.slowBootSubtitle}>
        Your internet connection seems a little slow right now. Loading your workspace...
      </Text>
    </View>
  );
}

// app.json commits to edgeToEdgeEnabled + a fully transparent
// expo-navigation-bar - on modern Android this means the system nav
// bar/gesture pill is a real overlay drawn on top of whatever the app
// itself puts there. This is a solid strip applied once, globally, so
// every screen shows a solid white bar instead of a transparent one -
// except `skip` routes (Login), which are meant to stay full-bleed/
// immersive under the gesture bar rather than have it look like an opaque
// UI element.
function SystemNavBarBackground({ skip }: { skip: boolean }) {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();

  if (Platform.OS !== 'android' || insets.bottom <= 0 || skip) return null;

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: insets.bottom,
        backgroundColor: isDark ? '#080E17' : '#FFFFFF',
      }}
    />
  );
}

const styles = StyleSheet.create({
  slowBootContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 32,
    gap: 10,
  },
  slowBootIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E6FAF6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  slowBootTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  slowBootSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '500',
  },
});

const IMMERSIVE_ROUTES = new Set(['Login']);

export default function App() {
  const [fontsLoaded, fontError] = useFonts(FONT_MAP);
  const fontsReady = fontsLoaded || !!fontError;
  const [immersive, setImmersive] = useState(false);

  useEffect(() => {
    initCrashReporting();
    initPushNotifications();
  }, []);

  if (fontError) {
    console.warn('[App] Custom font failed to load, falling back to system font', fontError);
  }

  if (!fontsReady) {
    return null;
  }

  return (
    <ErrorBoundary>
      <Provider store={store}>
        <ThemeProvider>
          <LanguageProvider>
            <NetworkProvider>
              <SafeAreaProvider>
                <CallProvider>
                  <OfflineBanner />
                  <NavigationContainer
                    ref={navigationRef}
                    linking={linking}
                    onStateChange={() => {
                      const name = navigationRef.getCurrentRoute()?.name;
                      setImmersive(!!name && IMMERSIVE_ROUTES.has(name));
                    }}
                  >
                    <AppContent />
                  </NavigationContainer>
                  <FloatingCallOverlay />
                  <SystemNavBarBackground skip={immersive} />
                </CallProvider>
              </SafeAreaProvider>
            </NetworkProvider>
          </LanguageProvider>
        </ThemeProvider>
      </Provider>
    </ErrorBoundary>
  );
}
