import { ArrowRight, Check } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { palette } from '../../theme/palette';
import { useTheme } from '../../theme/ThemeContext';

interface TourCard {
  key: string;
  title: string;
  body: string;
  tips: string[];
}

const buildCards = (firstName: string): TourCard[] => [
  {
    key: 'welcome',
    title: firstName ? `You're verified, Dr. ${firstName}` : "You're verified",
    body: 'Your profile is approved and patients can now discover you. Here is a quick tour so you are ready for your first consultation.',
    tips: [
      'It takes about a minute',
      'Every card has a tip you can act on right away',
      'You can always find help in the menu',
    ],
  },
  {
    key: 'online',
    title: 'Go online to get requests',
    body: 'The Online switch on your dashboard decides whether patients can book you.',
    tips: [
      'A doctor who is offline is never bookable',
      'Switch it on when you are ready to consult',
      'Switch it off whenever you need a break',
    ],
  },
  {
    key: 'hours',
    title: 'Set your weekly hours',
    body: 'Tell patients when you usually consult so they can plan around you. You will find this in the Availability tab.',
    tips: [
      'Add the days and times that suit you',
      'Requests outside your hours are not blocked, since a patient may need care urgently',
      'You can charge an extra percentage (up to 50%) for those requests',
    ],
  },
  {
    key: 'requests',
    title: 'Respond to requests',
    body: 'New appointment requests arrive on your dashboard and in the Appointments tab.',
    tips: [
      'Approve or decline each request',
      'A consultation is confirmed once you approve it and the patient pays',
      'Quick replies mean happier patients and better reviews',
    ],
  },
  {
    key: 'consult',
    title: 'Consult by chat, voice or video',
    body: 'You offer the consultation types you switched on with your fees.',
    tips: [
      'Allow notifications, camera and microphone so you never miss a call',
      'Use a stable connection and a quiet place',
      'Add a prescription and notes when the consultation ends',
    ],
  },
  {
    key: 'earnings',
    title: 'Get paid',
    body: 'There is no wallet, recharge or upfront deposit to receive patients. Payouts are managed in the Earnings tab.',
    tips: [
      'Add a bank account or UPI ID',
      'Choose an automatic payout: every week or every month',
      'Track every consultation and payout in one place',
    ],
  },
  {
    key: 'done',
    title: 'You are all set',
    body: 'Keep your profile and hours up to date, and reach out whenever you need a hand.',
    tips: [
      'Support and Refer a colleague are in the menu',
      'Notification settings let you choose which alerts you get',
      'Your first request is on its way',
    ],
  },
];

interface Props {
  visible: boolean;
  doctorName?: string;
  onClose: () => void;
}

// Shown once, the first time a newly approved doctor reaches the dashboard. It is a required walkthrough: no skip, no close button,
// and the Android back button does nothing; the last card's button is the way out.
export default function WelcomeTourModal({ visible, doctorName, onClose }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const cardWidth = Math.min(width - 32, 440);
  const cardHeight = Math.min(height - insets.top - insets.bottom - 24, Math.max(height * 0.82, 520));
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const [pageHeight, setPageHeight] = useState(0);

  const firstName = (doctorName || '').replace(/^dr\.?\s+/i, '').trim().split(/\s+/)[0] || '';
  const cards = buildCards(firstName);
  const last = index === cards.length - 1;

  useEffect(() => {
    if (visible) setIndex(0);
  }, [visible]);

  const goTo = (next: number) => {
    scrollRef.current?.scrollTo({ x: next * cardWidth, animated: true });
    setIndex(next);
  };

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / cardWidth));
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={() => undefined}>
      <View style={styles.overlay}>
        <View style={[styles.card, { width: cardWidth, height: cardHeight, backgroundColor: theme.card }]}>
          <View style={styles.header}>
            <View style={styles.headerSide} />
            <Text style={[styles.eyebrow, { color: theme.text }]}>Welcome to Medicoo</Text>
            <Text style={[styles.step, { color: theme.textMuted }]}>
              {index + 1}/{cards.length}
            </Text>
          </View>

          <View style={{ flex: 1 }} onLayout={(e) => setPageHeight(e.nativeEvent.layout.height)}>
            {pageHeight > 0 && (
              <ScrollView
                ref={scrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={onScrollEnd}
                scrollEventThrottle={16}
              >
                {cards.map((c) => (
                  <ScrollView
                    key={c.key}
                    style={{ width: cardWidth, height: pageHeight }}
                    contentContainerStyle={styles.page}
                    showsVerticalScrollIndicator={false}
                    nestedScrollEnabled
                  >
                    <Text style={[styles.title, { color: theme.text }]}>{c.title}</Text>
                    <Text style={[styles.text, { color: theme.textSecondary }]}>{c.body}</Text>
                    <View style={styles.tips}>
                      {c.tips.map((tip) => (
                        <View key={tip} style={[styles.tipRow, { backgroundColor: theme.cardSecondary }]}>
                          <View style={[styles.tipCheck, { backgroundColor: theme.primary }]}>
                            <Check size={12} color={palette.white} strokeWidth={3.4} />
                          </View>
                          <Text style={[styles.tipText, { color: theme.text }]}>{tip}</Text>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                ))}
              </ScrollView>
            )}
          </View>

          <View style={styles.footer}>
            <View style={styles.dots}>
              {cards.map((c, i) => (
                <View
                  key={c.key}
                  style={[styles.dot, { backgroundColor: i === index ? theme.primary : theme.border }, i === index && styles.dotActive]}
                />
              ))}
            </View>
            <TouchableOpacity
              style={[styles.next, { backgroundColor: theme.primary }]}
              activeOpacity={0.85}
              onPress={() => (last ? onClose() : goTo(index + 1))}
            >
              <Text style={styles.nextText}>{last ? 'Go to my dashboard' : 'Next'}</Text>
              {!last && <ArrowRight size={17} color={palette.white} />}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: palette.blackA55, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: 14, overflow: 'hidden' },
  header: {
    height: 52,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerSide: { width: 44 },
  eyebrow: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '800', letterSpacing: -0.2 },
  step: { width: 44, textAlign: 'right', fontSize: 13, fontWeight: '600' },
  page: { paddingHorizontal: 22, paddingTop: 20, paddingBottom: 12 },
  title: { fontSize: 19, fontWeight: '800', letterSpacing: -0.3, lineHeight: 25 },
  text: { fontSize: 13.5, lineHeight: 20, marginTop: 8 },
  tips: { marginTop: 18, gap: 8 },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 10 },
  tipCheck: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 0 },
  tipText: { flex: 1, fontSize: 13, lineHeight: 19 },
  footer: { paddingHorizontal: 22, paddingTop: 10, paddingBottom: 20 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 14 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  dotActive: { width: 22 },
  next: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 12,
  },
  nextText: { color: palette.white, fontSize: 16, fontWeight: '700' },
});
