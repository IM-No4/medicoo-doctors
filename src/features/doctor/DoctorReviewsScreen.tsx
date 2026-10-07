import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as NavigationBar from 'expo-navigation-bar';
import {
  ArrowLeft,
  Calendar,
  MessageSquare,
  Sparkles,
  Star,
  ThumbsUp,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  DoctorRatingBreakdown,
  DoctorReviewItem,
  getMyDoctorReviews,
} from '../../services/api/doctor.api';
import { useTheme } from '../../theme/ThemeContext';

const EMPTY_BREAKDOWN: DoctorRatingBreakdown[] = [5, 4, 3, 2, 1].map((stars) => ({
  stars,
  count: 0,
  percentage: 0,
}));

const formatReviewDate = (isoString: string) => {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks === 1) return '1 week ago';
  if (diffWeeks < 5) return `${diffWeeks} weeks ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths <= 1) return '1 month ago';
  return `${diffMonths} months ago`;
};

export default function DoctorReviewsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { isDark } = useTheme();

  const [activeFilter, setActiveFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reviews, setReviews] = useState<DoctorReviewItem[]>([]);
  const [ratingBreakdown, setRatingBreakdown] =
    useState<DoctorRatingBreakdown[]>(EMPTY_BREAKDOWN);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);

  const filters = ['All', 'Recent', 'Highest', 'Lowest'];

  const bgColor = isDark ? '#080E17' : '#EFF2F6';
  const cardBg = isDark ? '#111B27' : '#FFFFFF';
  const cardBorder = isDark ? '#1A2737' : '#FFFFFF';
  const textColor = isDark ? '#E2E8F0' : '#1E293B';
  const subTextColor = isDark ? '#94A3B8' : '#64748B';
  const dividerColor = isDark ? '#1A2636' : '#F1F5F9';
  const iconColor = isDark ? '#94A3B8' : '#475569';

  useEffect(() => {
    RNStatusBar.setBarStyle(isDark ? 'light-content' : 'dark-content', true);
    if (Platform.OS === 'android') {
      RNStatusBar.setBackgroundColor(bgColor, true);
      RNStatusBar.setTranslucent(false);
      if (isDark) {
        NavigationBar.setBackgroundColorAsync('#080E17');
        NavigationBar.setButtonStyleAsync('light');
      } else {
        NavigationBar.setBackgroundColorAsync('#EFF2F6');
        NavigationBar.setButtonStyleAsync('dark');
      }
    }
  }, [isDark, bgColor]);

  const fetchReviews = useCallback(async () => {
    try {
      const data = await getMyDoctorReviews();
      setReviews(data.reviews || []);
      setRatingBreakdown(data.ratingBreakdown || EMPTY_BREAKDOWN);
      setAverageRating(data.averageRating || 0);
      setTotalReviews(data.totalReviews || 0);
    } catch (error) {
      console.error('Error fetching doctor reviews:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchReviews();
  };

  const visibleReviews = useMemo(() => {
    if (activeFilter === 'Highest')
      return [...reviews].sort((a, b) => b.rating - a.rating);
    if (activeFilter === 'Lowest')
      return [...reviews].sort((a, b) => a.rating - b.rating);
    return reviews;
  }, [reviews, activeFilter]);

  const fiveStarPercent =
    ratingBreakdown.find((r) => r.stars === 5)?.percentage ?? 0;
  const newReviewsCount = useMemo(
    () =>
      reviews.filter(
        (r) =>
          Date.now() - new Date(r.date).getTime() < 7 * 24 * 60 * 60 * 1000
      ).length,
    [reviews]
  );

  const topPadding =
    insets.top > 0
      ? insets.top
      : Platform.OS === 'android'
      ? (RNStatusBar.currentHeight ?? 24)
      : 20;

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <RNStatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={bgColor}
        translucent={true}
        animated
      />

      {/* ═══ Header Bar (Floating Round Back Button + Title) ═══ */}
      <View
        style={[
          styles.headerBar,
          {
            paddingTop: topPadding + 6,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.roundBackBtn,
            {
              backgroundColor: cardBg,
              borderColor: cardBorder,
            },
          ]}
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('DoctorDashboard');
            }
          }}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.screenHeaderTitle, { color: textColor }]}>
          Patient Reviews
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 36 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#0FBBA1']}
            tintColor="#0FBBA1"
          />
        }
      >
        {/* ═══ 1. Rating Overview Soft Card ═══ */}
        <View
          style={[
            styles.sectionCard,
            { backgroundColor: cardBg, borderColor: cardBorder },
          ]}
        >
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionAccentBar} />
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              Rating Overview
            </Text>
          </View>

          <View style={styles.ratingCardContent}>
            <View style={styles.ratingLeftCol}>
              <Text style={[styles.bigScoreText, { color: textColor }]}>
                {averageRating > 0 ? averageRating.toFixed(1) : '5.0'}
              </Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    size={16}
                    color="#F59E0B"
                    fill={
                      s <= Math.round(averageRating || 5)
                        ? '#F59E0B'
                        : 'transparent'
                    }
                  />
                ))}
              </View>
              <Text style={[styles.totalReviewsLabel, { color: subTextColor }]}>
                {totalReviews} Verified Review{totalReviews === 1 ? '' : 's'}
              </Text>
            </View>

            <View style={styles.ratingBreakdownCol}>
              {ratingBreakdown.map((item) => (
                <View key={item.stars} style={styles.breakdownRow}>
                  <Text style={[styles.breakdownStarNumber, { color: subTextColor }]}>
                    {item.stars}★
                  </Text>
                  <View
                    style={[
                      styles.progressBarBg,
                      { backgroundColor: isDark ? '#172230' : '#F1F5F9' },
                    ]}
                  >
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${Math.max(item.percentage, item.count > 0 ? 10 : 0)}%` },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ═══ 2. Twin Soft Stat Cards ═══ */}
        <View style={styles.twinCardsRow}>
          <View
            style={[
              styles.twinCard,
              { backgroundColor: cardBg, borderColor: cardBorder },
            ]}
          >
            <View
              style={[
                styles.twinIconCircle,
                { backgroundColor: isDark ? '#0E2924' : '#E6FAF6' },
              ]}
            >
              <ThumbsUp size={16} color="#0FBBA1" />
            </View>
            <View style={styles.twinTextCol}>
              <Text style={[styles.twinTitle, { color: subTextColor }]}>
                5-Star Ratio
              </Text>
              <Text style={styles.twinSubtitleTeal}>
                {fiveStarPercent > 0 ? `${fiveStarPercent}%` : '100%'}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.twinCard,
              { backgroundColor: cardBg, borderColor: cardBorder },
            ]}
          >
            <View
              style={[
                styles.twinIconCircle,
                { backgroundColor: isDark ? '#2E2210' : '#FEF3C7' },
              ]}
            >
              <Sparkles size={16} color="#F59E0B" />
            </View>
            <View style={styles.twinTextCol}>
              <Text style={[styles.twinTitle, { color: subTextColor }]}>
                New This Week
              </Text>
              <Text style={styles.twinSubtitleAmber}>
                {newReviewsCount} New
              </Text>
            </View>
          </View>
        </View>

        {/* ═══ 3. Reviews List Card ═══ */}
        <View
          style={[
            styles.sectionCard,
            { backgroundColor: cardBg, borderColor: cardBorder },
          ]}
        >
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionAccentBar} />
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              Patient Feedback
            </Text>
          </View>

          {/* Filter Chips on their own row */}
          <View style={styles.filterRow}>
            {filters.map((filter) => {
              const isActive = activeFilter === filter;
              return (
                <TouchableOpacity
                  key={filter}
                  onPress={() => setActiveFilter(filter)}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: isActive
                        ? '#0FBBA1'
                        : isDark
                        ? '#172230'
                        : '#F1F5F9',
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      {
                        color: isActive ? '#FFFFFF' : subTextColor,
                        fontWeight: isActive ? '700' : '500',
                      },
                    ]}
                  >
                    {filter}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {loading ? (
            <ActivityIndicator color="#0FBBA1" style={{ marginVertical: 24 }} />
          ) : visibleReviews.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View
                style={[
                  styles.emptyIconCircle,
                  { backgroundColor: isDark ? '#16222F' : '#F1F5F9' },
                ]}
              >
                <MessageSquare size={24} color={subTextColor} />
              </View>
              <Text style={[styles.emptyTitle, { color: textColor }]}>
                No Patient Reviews Yet
              </Text>
              <Text style={[styles.emptySubtitle, { color: subTextColor }]}>
                Verified reviews from completed consultations will appear here.
              </Text>
            </View>
          ) : (
            visibleReviews.map((item, index) => {
              const showDivider = index < visibleReviews.length - 1;
              return (
                <View key={item.id || index}>
                  <View style={styles.reviewItemRow}>
                    <View style={styles.reviewItemHeader}>
                      <View style={styles.patientAvatarCol}>
                        <View
                          style={[
                            styles.patientAvatarCircle,
                            { backgroundColor: isDark ? '#172230' : '#E6FAF6' },
                          ]}
                        >
                          <Text
                            style={[
                              styles.patientAvatarLetter,
                              { color: isDark ? '#0FBBA1' : '#0D9488' },
                            ]}
                          >
                            {item.patientName.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View>
                          <Text
                            style={[styles.patientNameText, { color: textColor }]}
                          >
                            {item.patientName}
                          </Text>
                          <Text
                            style={[styles.reviewDateText, { color: subTextColor }]}
                          >
                            {formatReviewDate(item.date)}
                          </Text>
                        </View>
                      </View>

                      {/* Rating Pill */}
                      <View
                        style={[
                          styles.ratingPill,
                          {
                            backgroundColor: isDark ? '#2E2210' : '#FEF3C7',
                          },
                        ]}
                      >
                        <Star size={12} color="#F59E0B" fill="#F59E0B" />
                        <Text style={styles.ratingPillText}>
                          {item.rating.toFixed(1)}
                        </Text>
                      </View>
                    </View>

                    {Boolean(item.comment) && (
                      <Text
                        style={[
                          styles.reviewCommentText,
                          { color: isDark ? '#CBD5E1' : '#334155' },
                        ]}
                      >
                        {item.comment}
                      </Text>
                    )}
                  </View>

                  {showDivider && (
                    <View
                      style={[
                        styles.rowDivider,
                        { backgroundColor: dividerColor },
                      ]}
                    />
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  roundBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  screenHeaderTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  scrollContent: {
    paddingTop: 8,
    paddingHorizontal: 16,
  },

  // ═══ 1. Rating Overview Soft Card ═══
  ratingCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingTop: 12,
  },
  ratingLeftCol: {
    alignItems: 'center',
    minWidth: 100,
  },
  bigScoreText: {
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -1,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 3,
    marginVertical: 4,
  },
  totalReviewsLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    marginTop: 2,
  },
  ratingBreakdownCol: {
    flex: 1,
    gap: 5,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breakdownStarNumber: {
    fontSize: 11.5,
    fontWeight: '700',
    width: 22,
    textAlign: 'right',
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#FBBF24',
  },

  // ═══ 2. Twin Soft Stat Cards ═══
  twinCardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  twinCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 13,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  twinIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  twinTextCol: {
    flex: 1,
  },
  twinTitle: {
    fontSize: 11.5,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  twinSubtitleTeal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0FBBA1',
    marginTop: 2,
  },
  twinSubtitleAmber: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F59E0B',
    marginTop: 2,
  },

  // ═══ 3. Soft Section Cards ═══
  sectionCard: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    marginBottom: 20,
    borderWidth: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionAccentBar: {
    width: 3.5,
    height: 16,
    borderRadius: 2,
    backgroundColor: '#0FBBA1',
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  filterChipText: {
    fontSize: 12,
  },

  // ═══ Review Item ═══
  reviewItemRow: {
    paddingVertical: 12,
  },
  reviewItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  patientAvatarCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  patientAvatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  patientAvatarLetter: {
    fontSize: 14,
    fontWeight: '800',
  },
  patientNameText: {
    fontSize: 14,
    fontWeight: '700',
  },
  reviewDateText: {
    fontSize: 11.5,
    fontWeight: '500',
    marginTop: 1,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  ratingPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#D97706',
  },
  reviewCommentText: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 19,
    marginTop: 8,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },

  // ═══ Empty State ═══
  emptyContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12.5,
    fontWeight: '500',
    textAlign: 'center',
    maxWidth: 240,
    lineHeight: 18,
  },
});
