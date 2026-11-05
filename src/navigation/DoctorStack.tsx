import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import BrandedSplash from '../components/BrandedSplash';

import AppointmentRequestsScreen from '../features/doctor/AppointmentRequestsScreen';
import DeleteAccountScreen from '../features/doctor/DeleteAccountScreen';
import DoctorCallScreen from '../features/doctor/DoctorCallScreen';
import DoctorChatScreen from '../features/doctor/DoctorChatScreen';
import DoctorDashboardScreen from '../features/doctor/DoctorDashboardScreen';
import DoctorDetailScreen from '../features/doctor/DoctorDetailScreen';
import DoctorEarningsScreen from '../features/doctor/DoctorEarningsScreen';
import DoctorLiveChatScreen from '../features/doctor/DoctorLiveChatScreen';
import DoctorNewSupportRequestScreen from '../features/doctor/DoctorNewSupportRequestScreen';
import DoctorNotificationSettingsScreen from '../features/doctor/DoctorNotificationSettingsScreen';
import DoctorOnboardingScreen from '../features/doctor/DoctorOnboardingScreen';
import DoctorPoliciesHubScreen from '../features/doctor/DoctorPoliciesHubScreen';
import DoctorPolicyDetailScreen from '../features/doctor/DoctorPolicyDetailScreen';
import DoctorReferralScreen from '../features/doctor/DoctorReferralScreen';
import DoctorReviewsScreen from '../features/doctor/DoctorReviewsScreen';
import DoctorSettingsScreen from '../features/doctor/DoctorSettingsScreen';
import DoctorSupportScreen from '../features/doctor/DoctorSupportScreen';
import ManageAvailabilityScreen from '../features/doctor/ManageAvailabilityScreen';
import PatientConsultationDetailScreen from '../features/doctor/PatientConsultationDetailScreen';
import { doctorNeedsOnboarding } from '../features/doctor/onboardingGate';
import { getDoctorProfile } from '../services/api/user.api';
import DoctorBottomTabBar from './DoctorBottomTabBar';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function DoctorTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <DoctorBottomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="DoctorDashboard" component={DoctorDashboardScreen} />
      <Tab.Screen name="ManageAppointments" component={AppointmentRequestsScreen} />
      <Tab.Screen name="ManageAvailability" component={ManageAvailabilityScreen} />
      <Tab.Screen name="DoctorEarnings" component={DoctorEarningsScreen} />
    </Tab.Navigator>
  );
}

export default function DoctorStack() {
  // A doctor who has not been through onboarding yet (a brand-new number, or an application that is still a draft, pending or rejected) opens on
  // the onboarding screen instead of the dashboard. If the profile cannot be read the doctor is let in as before.
  const [entry, setEntry] = useState<'checking' | 'DoctorTabs' | 'DoctorOnboarding'>('checking');
  useEffect(() => {
    let alive = true;
    getDoctorProfile()
      .then((profile) => { if (alive) setEntry(doctorNeedsOnboarding(profile) ? 'DoctorOnboarding' : 'DoctorTabs'); })
      .catch(() => { if (alive) setEntry('DoctorTabs'); });
    return () => { alive = false; };
  }, []);

  if (entry === 'checking') {
    return <BrandedSplash />;
  }

  return (
    <Stack.Navigator initialRouteName={entry} screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="DoctorTabs" component={DoctorTabs} />
      <Stack.Screen name="DoctorDashboard" component={DoctorDashboardScreen} />
      <Stack.Screen name="DoctorOnboarding" component={DoctorOnboardingScreen} />
      <Stack.Screen name="DoctorDetail" component={DoctorDetailScreen} />
      <Stack.Screen name="DoctorSettings" component={DoctorSettingsScreen} />
      <Stack.Screen name="DeleteAccount" component={DeleteAccountScreen} />
      <Stack.Screen name="DoctorNotificationSettings" component={DoctorNotificationSettingsScreen} />
      <Stack.Screen name="DoctorReviews" component={DoctorReviewsScreen} />
      <Stack.Screen name="DoctorReferral" component={DoctorReferralScreen} />
      <Stack.Screen name="DoctorSupport" component={DoctorSupportScreen} />
      <Stack.Screen name="DoctorNewSupportRequest" component={DoctorNewSupportRequestScreen} />
      <Stack.Screen name="DoctorLiveChat" component={DoctorLiveChatScreen} />
      <Stack.Screen name="DoctorPolicies" component={DoctorPoliciesHubScreen} />
      <Stack.Screen name="DoctorPolicyDetail" component={DoctorPolicyDetailScreen} />
      <Stack.Screen name="PatientConsultationDetail" component={PatientConsultationDetailScreen} />
      <Stack.Screen name="DoctorChat" component={DoctorChatScreen} />
      <Stack.Screen name="DoctorCall" component={DoctorCallScreen} />
      <Stack.Screen name="ManageAppointments" component={AppointmentRequestsScreen} />
      <Stack.Screen name="ManageAvailability" component={ManageAvailabilityScreen} />
      <Stack.Screen name="DoctorEarnings" component={DoctorEarningsScreen} />
    </Stack.Navigator>
  );
}
