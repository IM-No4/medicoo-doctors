import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import DoctorStack from './DoctorStack';

const Stack = createNativeStackNavigator();

// "Tabs" wraps DoctorStack (not a plain gating component) since
// pushNotifications.ts and elsewhere navigate into it by nested screen name,
// e.g. navigate('Tabs', { screen: 'ManageAppointments', params }) - that
// pattern only resolves when the 'Tabs' route's own component is itself a
// navigator containing that screen.
export default function MainStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={DoctorStack} />
    </Stack.Navigator>
  );
}
