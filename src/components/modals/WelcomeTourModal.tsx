import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowRight,
  Banknote,
  CalendarClock,
  Check,
  Inbox,
  LifeBuoy,
  Power,
  Sparkles,
  Video,
  X,
} from 'lucide-react-native';
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

import { palette } from '../../theme/palette';
import { useTheme } from '../../theme/ThemeContext';

interface TourCard {
  key: string;
  Icon: typeof Sparkles;
  title: string;
  body: string;
  tips: string[];
  cta?: { label: string; screen: string };
}

const buildCards = (firstName: string): TourCard[] => [
  {
    key: 'welcome',
    Icon: Sparkles,
    title: firstName ? `Welcome to Medicoo, Dr. ${firstName}` : 'Welcome to Medicoo',
    body: 'Your profile is verified and patients can now discover you. Here is a quick tour so you are ready for your first consultation.',
    tips: [
      'It takes about a minute',
      'Every card has a tip you can act on right away',
      'You can always find help in the menu',
    ],
  },
  {
    key: 'online',
    Icon: Power,
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
    Icon: CalendarClock,
    title: 'Set your weekly hours',
    body: 'Tell patients when you usually consult so they can plan around you.',
    tips: [
      'Add the days and times that suit you',
      'Requests outside your hours are not blocked, since a patient may need care urgently',
      'You can charge an extra percentage (up to 50%) for those requests',
    ],
    cta: { label: 'Open availability', screen: 'ManageAvailability' },
  },
  {
    key: 'requests',
    Icon: Inbox,
    title: 'Respond to requests',
    body: 'New appointment requests arrive on your dashboard and in the Appointments tab.',
    tips: [
      'Approve or decline each request',
      'A consultation is confirmed once you approve it and the patient pays',
      'Quick replies mean happier patients and better reviews',
    ],
    cta: { label: 'Open appointments', screen: 'ManageAppointments' },
  },
  {
    key: 'consult',
    Icon: Video,
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
    Icon: Banknote,
    title: 'Get paid',
    body: 'There is no wallet, recharge or upfront deposit to receive patients.',
    tips: [
      'Add a bank account or UPI ID in the Earnings tab',
      'Choose an automatic payout: every week or every month',
      'Track every consultation and payout in one place',
    ],
    cta: { label: 'Open earnings', screen: 'DoctorEarnings' },
  },
  {
    key: 'done',
    Icon: LifeBuoy,
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
  onNavigate: (screen: string) => void;
}

export default function WelcomeTourModal({ visible, doctorName, onClose, onNavigate }: Props) {
  const { theme } = useTheme();
  const { width, height } = useWindowDimensions();
  const cardWidth = Math.min(width - 40, 420);
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);

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
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { width: cardWidth, maxHeight: height * 0.86, backgroundColor: theme.card }]}>
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onScrollEnd}
            scrollEventThrottle={16}
            style={{ flexGrow: 0 }}
          >
            {cards.map((c) => (
              <View key={c.key} style={{ width: cardWidth }}>
                <LinearGradient colors={[palette.navy, palette.navyText]} style={styles.hero}>
                  <View style={styles.heroGlow} />
                  <View style={styles.iconTile}>
                    <c.Icon size={34} color={palette.mint} strokeWidth={2.2} />
                  </View>
                </LinearGradient>
                <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 6 }} showsVerticalScrollIndicator={false} nestedScrollEnabled>
                  <Text style={[styles.title, { color: theme.text }]}>{c.title}</Text>
                  <Text style={[styles.text, { color: theme.textSecondary }]}>{c.body}</Text>
                  <View style={styles.tips}>
                    {c.tips.map((tip) => (
                      <View key={tip} style={styles.tipRow}>
                        <View style={[styles.tipCheck, { backgroundColor: theme.primaryLight }]}>
                          <Check size={12} color={theme.primary} strokeWidth={3.2} />
                        </View>
                        <Text style={[styles.tipText, { color: theme.text }]}>{tip}</Text>
                      </View>
                    ))}
                  </View>
                  {c.cta && (
                    <TouchableOpacity style={styles.cta} activeOpacity={0.7} onPress={() => onNavigate(c.cta!.screen)}>
                      <Text style={[styles.ctaText, { color: theme.primary }]}>{c.cta.label}</Text>
                      <ArrowRight size={15} color={theme.primary} />
                    </TouchableOpacity>
                  )}
                </ScrollView>
              </View>
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <View style={styles.dots}>
              {cards.map((c, i) => (
                <View
                  key={c.key}
                  style={[styles.dot, { backgroundColor: i === index ? theme.primary : theme.border }, i === index && styles.dotActive]}
                />
              ))}
            </View>
            <View style={styles.actions}>
              {last ? (
                <View style={{ flex: 1 }} />
              ) : (
                <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={[styles.skip, { color: theme.textMuted }]}>Skip tour</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.next, { backgroundColor: theme.primary }]}
                activeOpacity={0.85}
                onPress={() => (last ? onClose() : goTo(index + 1))}
              >
                <Text style={styles.nextText}>{last ? 'Go to my dashboard' : 'Next'}</Text>
                {!last && <ArrowRight size={16} color={palette.white} />}
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.close} onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <X size={18} color={palette.white} />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: palette.blackA55, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: 28, overflow: 'hidden' },
  hero: { height: 150, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  heroGlow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: palette.whiteA18,
    top: -80,
    right: -60,
  },
  iconTile: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: palette.whiteA18,
    borderWidth: 1,
    borderColor: palette.whiteA25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { paddingHorizontal: 24, paddingTop: 20, maxHeight: 300 },
  title: { fontSize: 21, fontWeight: '800', letterSpacing: -0.3, textAlign: 'center' },
  text: { fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 8 },
  tips: { marginTop: 18, gap: 11 },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  tipCheck: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  tipText: { flex: 1, fontSize: 13.5, lineHeight: 19 },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16, paddingVertical: 6 },
  ctaText: { fontSize: 14, fontWeight: '700' },
  footer: { paddingHorizontal: 24, paddingTop: 14, paddingBottom: 22 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 16 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  dotActive: { width: 20 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  skip: { fontSize: 14, fontWeight: '600' },
  next: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 22,
    height: 48,
    borderRadius: 14,
    minWidth: 120,
  },
  nextText: { color: palette.white, fontSize: 15, fontWeight: '700' },
  close: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: palette.whiteA18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
