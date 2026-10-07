import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { useSelector } from 'react-redux';

import { useSystemUI } from '../bootstrap/useSystemUI';
import LegalAcceptanceModal from '../components/modals/LegalAcceptanceModal';
import UpdateAvailableModal from '../components/modals/UpdateAvailableModal';
import MandatoryUpdateScreen from '../features/update/MandatoryUpdateScreen';
import MaintenanceScreen from '../features/maintenance/MaintenanceScreen';
import MaintenanceRestrictedBanner from '../features/maintenance/MaintenanceRestrictedBanner';
import { RootState } from '../redux/store';
import AuthStack from './AuthStack';
import MainStack from './MainStack';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  useSystemUI();

  const boot = useSelector((state: RootState) => state.boot);

  // The installed build is below the backend's minimumSupportedVersion
  // (BootCoordinator.ts) - no skip, blocks even a logged-out doctor.
  if (boot.status === 'mandatoryUpdate') {
    return <MandatoryUpdateScreen />;
  }

  // Maintenance is on AND this doctor was confirmed to have no
  // in-progress consultation to protect (BootCoordinator.ts) - a doctor
  // who does is let in below, restricted, instead of reaching this
  // branch at all.
  if (boot.status === 'maintenance') {
    return <MaintenanceScreen />;
  }

  // 🔒 Absolute gate: nothing renders until boot is READY (App.tsx already
  // guarantees this before RootNavigator ever mounts; kept here too as a
  // defensive no-op render, not a splash screen).
  if (boot.status !== 'ready') {
    return null;
  }

  return (
    <>
      <Stack.Navigator
        key={!boot.isAuthenticated ? 'auth' : 'main'}
        screenOptions={{ headerShown: false }}
      >
        {!boot.isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthStack} />
        ) : (
          <Stack.Screen name="Main" component={MainStack} />
        )}
      </Stack.Navigator>

      {/* ⚖️ TERMS & PRIVACY RE-ACCEPTANCE GATE - decides for itself whether
          to actually render based on Redux state + local snooze timestamp */}
      {boot.isAuthenticated && <LegalAcceptanceModal />}

      {/* 🛠️ MAINTENANCE-RESTRICTED BANNER - decides for itself whether to
          render based on appConfig.restricted */}
      {boot.isAuthenticated && <MaintenanceRestrictedBanner />}

      {/* ⬆️ OPTIONAL UPDATE PROMPT - decides for itself whether to render
          based on appConfig.update + the version-specific dismissed state.
          Not gated on auth - a logged-out doctor on the Login screen
          should still see this. */}
      <UpdateAvailableModal />
    </>
  );
}
