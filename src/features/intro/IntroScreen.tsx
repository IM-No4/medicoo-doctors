import * as NavigationBar from 'expo-navigation-bar';
import React, { useEffect, useState } from 'react';
import {
  BackHandler,
  Image,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// The source images are ~16:9 (944x1680) - shorter than a modern phone
// screen (~19.5:9). Computing the image's box in JS from the real window
// width (rather than a CSS `aspectRatio` style, which did not resolve
// correctly here when combined with `position: absolute` + partial edges -
// it rendered roughly half the expected size) guarantees a full-width,
// correctly-scaled image with height following its own real ratio. On
// taller phones this leaves a strip of flat background below the image,
// filled by the container's own white background.
const IMAGE_ASPECT = 944 / 1680; // width / height

const slides = [
  {
    id: 1,
    title: 'Manage Patients',
    description: 'Keep every patient record in one place',
    image: require('../../assets/images/1.jpg'),
  },
  {
    id: 2,
    title: 'Track Appointments',
    description: 'Manage your daily schedule with ease',
    image: require('../../assets/images/2.jpg'),
  },
  {
    id: 3,
    title: 'Access Reports',
    description: 'View lab results securely, anytime',
    image: require('../../assets/images/3.jpg'),
  },
];

const BUTTON_COLOR = '#0FBBA1'; // Medicoo brand teal
const DOT_COLOR = '#F5A623';

export default function IntroScreen({ onFinish }: { onFinish: () => void }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const insets = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();
  const heroImageHeight = winW / IMAGE_ASPECT;

  // The image is anchored to the top and doesn't reach the bottom of the
  // screen (see heroImage sizing above), so the transparent system nav bar
  // sits over the container's white background, not the teal artwork -
  // dark icons stay legible there, same as the rest of the app
  // (useSystemUI.ts already sets this app-wide, but this screen restores it
  // explicitly in case a future slide's image height ever changes that).
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    NavigationBar.setButtonStyleAsync('dark');
  }, []);

  // Hardware/gesture back on the first slide falls through to the default
  // behavior (exits the app, since this is the initial route with nothing
  // behind it) - on any later slide it steps back one instead.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (currentIndex === 0) return false;
      setCurrentIndex((prev) => prev - 1);
      return true;
    });
    return () => sub.remove();
  }, [currentIndex]);

  const handleNext = () => {
    if (currentIndex === slides.length - 1) {
      onFinish();
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const currentSlide = slides[currentIndex];
  const isLastSlide = currentIndex === slides.length - 1;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <Image
        source={currentSlide.image}
        resizeMode="cover"
        style={[styles.heroImage, { width: winW, height: heroImageHeight }]}
      />

      <View style={[styles.textBlock, { paddingTop: insets.top + 28 }]}>
        <Text style={styles.title}>{currentSlide.title}</Text>
        <Text style={styles.description}>{currentSlide.description}</Text>
      </View>

      <View style={[styles.bottomPanel, { paddingBottom: insets.bottom + 10 }]}>
        <TouchableOpacity
          onPress={handleNext}
          style={styles.continueButton}
          activeOpacity={0.85}
        >
          <Text style={styles.continueButtonText}>
            {isLastSlide ? 'Get Started' : 'Next'}
          </Text>
        </TouchableOpacity>

        {/* marginBottom (not the panel's own paddingBottom) creates the gap
            above Skip - Skip itself stays close to the panel's bottom edge,
            just above the system nav bar, regardless of this gap's size. */}
        <View style={[styles.dotsContainer, { marginBottom: 30 }]}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentIndex && styles.dotActive,
              ]}
            />
          ))}
        </View>

        {/* Kept mounted (not conditionally rendered) even on the last slide,
            just made invisible/non-interactive - the panel is bottom-
            anchored with content-driven height, so removing this element
            entirely would shrink that height and shift the button/dots up. */}
        <TouchableOpacity
          onPress={onFinish}
          style={styles.skipButton}
          disabled={isLastSlide}
        >
          <Text style={[styles.skipText, isLastSlide && styles.skipTextHidden]}>Skip</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  heroImage: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  textBlock: {
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },
  bottomPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  continueButton: {
    width: '100%',
    paddingVertical: 17,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BUTTON_COLOR,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: DOT_COLOR,
    marginRight: 6,
  },
  dotActive: {
    width: 22,
    height: 8,
    borderRadius: 4,
    backgroundColor: BUTTON_COLOR,
  },
  skipButton: {
    alignSelf: 'flex-end',
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  skipText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  skipTextHidden: {
    opacity: 0,
  },
});
