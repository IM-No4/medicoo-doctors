import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import AppointmentRequestsScreen from '../features/doctor/AppointmentRequestsScreen';
import DoctorCallScreen from '../features/doctor/DoctorCallScreen';
import DoctorChatScreen from '../features/doctor/DoctorChatScreen';
import DoctorDashboardScreen from '../features/doctor/DoctorDashboardScreen';
import DoctorDetailScreen from '../features/doctor/DoctorDetailScreen';
import DoctorEarningsScreen from '../features/doctor/DoctorEarningsScreen';
import DoctorLiveChatScreen from '../features/doctor/DoctorLiveChatScreen';
import DoctorOnboardingScreen from '../features/doctor/DoctorOnboardingScreen';
import DoctorPoliciesHubScreen from '../features/doctor/DoctorPoliciesHubScreen';
import DoctorPolicyDetailScreen from '../features/doctor/DoctorPolicyDetailScreen';
import DoctorReferralScreen from '../features/doctor/DoctorReferralScreen';
import DoctorReviewsScreen from '../features/doctor/DoctorReviewsScreen';
import DoctorSettingsScreen from '../features/doctor/DoctorSettingsScreen';
import DoctorSupportScreen from '../features/doctor/DoctorSupportScreen';
import ManageAvailabilityScreen from '../features/doctor/ManageAvailabilityScreen';
import PatientConsultationDetailScreen from '../features/doctor/PatientConsultationDetailScreen';
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
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DoctorTabs" component={DoctorTabs} />
      <Stack.Screen name="DoctorDashboard" component={DoctorDashboardScreen} />
      <Stack.Screen name="DoctorOnboarding" component={DoctorOnboardingScreen} />
      <Stack.Screen name="DoctorDetail" component={DoctorDetailScreen} />
      <Stack.Screen name="DoctorSettings" component={DoctorSettingsScreen} />
      <Stack.Screen name="DoctorReviews" component={DoctorReviewsScreen} />
      <Stack.Screen name="DoctorReferral" component={DoctorReferralScreen} />
      <Stack.Screen name="DoctorSupport" component={DoctorSupportScreen} />
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
