import * as NavigationBar from 'expo-navigation-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';

export function useSystemUI() {
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    // With edge-to-edge enabled on Android (configured in app.json),
    // setBackgroundColorAsync is not supported and triggers a warning.
    NavigationBar.setButtonStyleAsync('dark');
  }, []);
}
