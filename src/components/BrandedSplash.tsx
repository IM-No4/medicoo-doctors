import React from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';

import { palette } from '../theme/palette';

const LOGO_SIZE = 240;

// The native splash is a still image and cannot animate, so once the app's JS is running this takes over with the same logo in the same
// place (square asset, centred, 240 wide - matching app.json) and adds a spinner below it while the app finishes loading.
export default function BrandedSplash() {
  return (
    <View style={styles.container}>
      <Image source={require('../assets/images/splash-wordmark.png')} style={styles.logo} resizeMode="contain" />
      <ActivityIndicator size="small" color={palette.mint} style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.navy },
  logo: { width: LOGO_SIZE, height: LOGO_SIZE },
  // Absolute, so the logo stays exactly where the native splash drew it.
  spinner: { position: 'absolute', top: '50%', marginTop: LOGO_SIZE / 2 + 12 },
});
