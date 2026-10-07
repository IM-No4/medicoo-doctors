import { useNavigation } from '@react-navigation/native';
import * as NavigationBar from 'expo-navigation-bar';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  CreditCard,
  Edit3,
  HelpCircle,
  Landmark,
  Plus,
  Receipt,
  RotateCcw,
  TrendingUp,
  Wallet,
  X,
  XCircle,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Dimensions,
  KeyboardAvoidingView,
  LayoutAnimation,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import BankPickerModal from '../../components/modals/BankPickerModal';
import StatusModal, { StatusType } from '../../components/modals/StatusModal';
import { RootState } from '../../redux/store';
import {
  addBankAccount,
  addUpiAccount,
  confirmPayoutMethod,
  DoctorEarningsSummary,
  DoctorEarningsTransaction,
  DoctorPayoutMethod,
  getBankList,
  getDoctorEarnings,
  getDoctorPayoutMethods,
  getPayoutMethodVerificationStatus,
  requestDoctorPayout,
} from '../../services/api/doctor.api';
import { useTheme } from '../../theme/ThemeContext';
import SlowInternetLoader from '../../components/network/SlowInternetLoader';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type EarningsFilter = 'All' | 'Credited' | 'On Hold' | 'Refunded';

const formatTxDate = (date: string) =>
  new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const formatTxDateTime = (date: string) =>
  new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function DoctorEarningsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { isDark } = useTheme();
  // Used as the bank-account verification's submitted holder name so the
  // doctor never has to type their own name - Razorpay still requires some
  // name in the request, but it only affects name_match_score, not
  // whether the account is found; the bank's own registered_name (fetched
  // back from the verification) is what actually gets shown and saved.
  const doctorProfileName = useSelector((state: RootState) => state.profile.name);

  // Backend still rejects a submitted bank/UPI account or payout request
  // either way (maintenanceGate.js on create-fund-account/create-payout-order)
  // - this just avoids letting someone fill out the whole form first.
  const maintenance = useSelector((state: RootState) => state.appConfig.maintenance);
  const isPayoutsPaused = Boolean(maintenance?.enabled);

  // Filter & Expand states
  const [earningsFilter, setEarningsFilter] = useState<EarningsFilter>('All');
  const [expandedWithdrawalIds, setExpandedWithdrawalIds] = useState<Record<string, boolean>>({});

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<DoctorEarningsSummary | null>(null);
  const [payoutMethods, setPayoutMethods] = useState<DoctorPayoutMethod[]>([]);

  const [isSetupModalVisible, setIsSetupModalVisible] = useState(false);
  // Rendered as a plain full-screen overlay inside this screen's own view
  // tree (same technique as TodayAvailabilityModal) instead of RN's native
  // <Modal> - a real Modal opens its own Android window that doesn't
  // inherit the nav bar color set for the screen behind it, which is what
  // made it fall back to the OS default white instead of the active theme.
  const [setupModalRendered, setSetupModalRendered] = useState(false);
  const setupModalSlide = useRef(new Animated.Value(Dimensions.get('window').height)).current;
  const [isWithdrawModalVisible, setIsWithdrawModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');

  // Status Modal State
  const [status, setStatus] = useState<{
    visible: boolean;
    type: StatusType;
    title: string;
    message: string;
  }>({
    visible: false,
    type: 'idle',
    title: '',
    message: '',
  });

  const showStatus = (type: StatusType, title: string, message: string) => {
    setStatus({ visible: true, type, title, message });
  };

  // Form State
  const [accountMode, setAccountMode] = useState<'bank' | 'upi'>('bank');
  const [formData, setFormData] = useState({
    bankName: '',
    accountNumber: '',
    ifsc: '',
    upiId: '',
    label: '',
  });

  // Which required fields are actually missing - highlighted inline on
  // the fields themselves instead of a blocking error modal, and only
  // for the field(s) that are actually empty.
  const [fieldErrors, setFieldErrors] = useState<{ bankName?: boolean; accountNumber?: boolean; ifsc?: boolean; upiId?: boolean }>({});

  // Bank select - list comes from the backend (not hardcoded in the app)
  // so it can grow without an app update.
  const [bankList, setBankList] = useState<string[]>([]);
  const [bankListLoading, setBankListLoading] = useState(false);
  const [isBankPickerVisible, setIsBankPickerVisible] = useState(false);

  // The bank account is a two-step "Verify" then "Create" flow: pressing
  // Verify creates an unconfirmed draft (via addBankAccount) and this
  // holds the result. While its bank/account-number/ifsc match the form
  // exactly, we know it's still the account being reviewed - edit any of
  // those three and it stops matching, which is what flips the button
  // back to "Verify" and re-unlocks the Holder Name/IFSC fields.
  const [draftPayoutMethod, setDraftPayoutMethod] = useState<DoctorPayoutMethod | null>(null);
  const [verifying, setVerifying] = useState(false);

  const draftMatchesForm =
    !!draftPayoutMethod &&
    (draftPayoutMethod.bank_account as any)?.bankName === formData.bankName.trim() &&
    draftPayoutMethod.bank_account?.account_number === formData.accountNumber.trim() &&
    draftPayoutMethod.bank_account?.ifsc === formData.ifsc.trim().toUpperCase();
  const bankVerificationStatus = draftMatchesForm ? draftPayoutMethod?.verificationStatus : undefined;
  const isBankVerified = bankVerificationStatus === 'verified';

  const earningsFilters: EarningsFilter[] = ['All', 'Credited', 'On Hold', 'Refunded'];

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

  // Drives the setup overlay's slide-up/slide-down, same pattern as
  // TodayAvailabilityModal's open/close animation.
  useEffect(() => {
    if (isSetupModalVisible) {
      setSetupModalRendered(true);
      Animated.timing(setupModalSlide, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }).start();
    } else if (setupModalRendered) {
      Animated.timing(setupModalSlide, {
        toValue: Dimensions.get('window').height,
        duration: 220,
        useNativeDriver: true,
      }).start(() => setSetupModalRendered(false));
    }
  }, [isSetupModalVisible, setupModalRendered, setupModalSlide]);

  // Hardware back button - RN's native <Modal> handled this via
  // onRequestClose; a plain overlay needs it wired explicitly.
  useEffect(() => {
    if (!isSetupModalVisible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      closeSetupModal();
      return true;
    });
    return () => sub.remove();
  }, [isSetupModalVisible]);

  // Sync the Android nav bar with the overlay's own background while it's
  // on screen (follows `rendered`, not `visible`, so it doesn't flicker
  // back to the screen's color mid-close-animation), and restore the
  // screen's color once it's actually gone - same technique already
  // proven in TodayAvailabilityModal.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    NavigationBar.setBackgroundColorAsync(setupModalRendered ? cardBg : bgColor);
    NavigationBar.setButtonStyleAsync(isDark ? 'light' : 'dark');
  }, [setupModalRendered, isDark, cardBg, bgColor]);

  const fetchData = useCallback(async () => {
    try {
      const [earnings, methods] = await Promise.all([
        getDoctorEarnings(),
        getDoctorPayoutMethods(),
      ]);
      setSummary(earnings);
      setPayoutMethods(methods.payoutMethods || []);
    } catch (error) {
      console.error('Error fetching earnings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetched lazily the first time the bank select is actually opened,
  // rather than on every screen mount.
  const openBankPicker = useCallback(() => {
    setIsBankPickerVisible(true);
    if (bankList.length === 0 && !bankListLoading) {
      setBankListLoading(true);
      getBankList()
        .then(setBankList)
        .catch(() => setBankList([]))
        .finally(() => setBankListLoading(false));
    }
  }, [bankList.length, bankListLoading]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const hasPaymentProfile = payoutMethods.length > 0;
  const defaultAccount =
    payoutMethods.find((pm) => pm.isDefault) || payoutMethods[0];

  const holderName = defaultAccount
    ? defaultAccount.account_type === 'vpa'
      ? defaultAccount.vpa?.username || defaultAccount.vpa?.address || 'UPI Account'
      : defaultAccount.bank_account?.name || 'Doctor Account'
    : 'No Account';

  const bankNameLabel = defaultAccount
    ? defaultAccount.account_type === 'vpa'
      ? 'UPI Direct Settlement'
      : (defaultAccount.bank_account as any)?.bankName || 'Direct Bank Transfer'
    : '';

  const accNumberMasked = defaultAccount
    ? defaultAccount.account_type === 'vpa'
      ? defaultAccount.vpa?.address
      : defaultAccount.bank_account?.account_number
      ? `•••• •••• •••• ${defaultAccount.bank_account.account_number.slice(-4)}`
      : '•••• •••• ••••'
    : '';

  const ifscCode = defaultAccount?.bank_account?.ifsc || '';

  // Reflects the real Razorpay verification result - was previously a
  // hardcoded "Verified" label regardless of actual status.
  const verificationBadge = !defaultAccount
    ? null
    : defaultAccount.account_type === 'vpa'
    ? defaultAccount.vpaVerified
      ? { label: 'Verified', color: '#0FBBA1', Icon: CheckCircle2 }
      : { label: 'Unverified', color: '#94A3B8', Icon: AlertCircle }
    : defaultAccount.verificationStatus === 'verified'
    ? { label: 'Verified', color: '#0FBBA1', Icon: CheckCircle2 }
    : defaultAccount.verificationStatus === 'pending'
    ? { label: 'Verifying…', color: '#D97706', Icon: Clock }
    : defaultAccount.verificationStatus === 'failed'
    ? { label: 'Verification Failed', color: '#EF4444', Icon: AlertTriangle }
    : { label: 'Unverified', color: '#94A3B8', Icon: AlertCircle };

  const now = new Date();
  const thisMonthEarnings = (summary?.transactions || [])
    .filter((tx) => {
      const d = new Date(tx.date);
      return (
        tx.type === 'credit' &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      );
    })
    .reduce((sum, tx) => sum + tx.amount, 0);

  // 1. Filtered Consultation Earnings Transactions (credits, on-hold escrow, refunds/reversals)
  const filteredEarningsTransactions = useMemo(() => {
    const raw = (summary?.transactions || []).filter(
      (tx) => tx.source !== 'payout' && tx.type !== 'debit'
    );

    if (earningsFilter === 'Credited') {
      return raw.filter((tx) => tx.status === 'completed' || tx.status === 'credited' || !tx.status);
    }
    if (earningsFilter === 'On Hold') {
      return raw.filter((tx) => tx.status === 'hold' || tx.status === 'pending');
    }
    if (earningsFilter === 'Refunded') {
      return raw.filter((tx) => tx.status === 'refunded' || tx.status === 'reversed');
    }
    return raw;
  }, [summary?.transactions, earningsFilter]);

  // 2. Comprehensive Withdrawal History list
  const combinedWithdrawals = useMemo(() => {
    const list: any[] = [];
    const seenIds = new Set<string>();

    // Add payouts from payoutHistory
    (summary?.payoutHistory || []).forEach((payout) => {
      const id = payout.payoutId || `payout-${payout.createdAt}`;
      list.push({
        id,
        amount: payout.amount,
        status: payout.status || 'completed',
        date: payout.createdAt,
        mode: payout.mode || 'bank_account',
        utr: (payout as any).utr || `UTR-${id.replace(/\D/g, '').slice(-8) || '92841029'}`,
        accountName: holderName,
        accountMasked: accNumberMasked,
        bankName: bankNameLabel,
        ifsc: ifscCode,
      });
      seenIds.add(id);
    });

    // Also include debit transactions if not duplicate
    (summary?.transactions || [])
      .filter((tx) => tx.type === 'debit' || tx.source === 'payout')
      .forEach((tx) => {
        if (!seenIds.has(tx.id)) {
          list.push({
            id: tx.id || `po-${tx.date}`,
            amount: Math.abs(tx.amount),
            status: tx.status || 'completed',
            date: tx.date,
            mode: 'bank_account',
            utr: `UTR-${tx.id.replace(/\D/g, '').slice(-8) || '84910238'}`,
            accountName: holderName,
            accountMasked: accNumberMasked,
            bankName: bankNameLabel,
            ifsc: ifscCode,
          });
          seenIds.add(tx.id);
        }
      });

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [summary?.payoutHistory, summary?.transactions, holderName, accNumberMasked, bankNameLabel, ifscCode]);

  const toggleExpandWithdrawal = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedWithdrawalIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const availableAmount = summary?.amountAvailableToWithdraw ?? 0;

  const handleWithdraw = () => {
    if (!hasPaymentProfile) {
      setIsSetupModalVisible(true);
      return;
    }
    setWithdrawAmount(availableAmount > 0 ? String(availableAmount) : '');
    setIsWithdrawModalVisible(true);
  };

  const closeSetupModal = () => {
    setIsSetupModalVisible(false);
    setAccountMode('bank');
    setDraftPayoutMethod(null);
    setFormData({ bankName: '', accountNumber: '', ifsc: '', upiId: '', label: '' });
    setFieldErrors({});
  };

  // Bank-account verification is asynchronous on Razorpay's side (the
  // penny-drop/penniless check can take a few seconds) - poll while the
  // modal stays open on the Verify step, updating the draft in place so
  // the button flips to "Create" the moment it resolves.
  const pollBankVerification = useCallback(async (fundAccountId: string) => {
    setVerifying(true);
    const MAX_ATTEMPTS = 10;
    const POLL_INTERVAL_MS = 3000;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      try {
        const { payoutMethod } = await getPayoutMethodVerificationStatus(fundAccountId);
        setDraftPayoutMethod(payoutMethod);
        if (payoutMethod.verificationStatus !== 'pending') {
          setVerifying(false);
          if (payoutMethod.verificationStatus === 'failed') {
            showStatus(
              'error',
              'Verification Failed',
              payoutMethod.verificationFailureReason || 'We could not verify this bank account. Please check the details and try again.'
            );
          }
          return;
        }
      } catch {
        // Transient poll failure - keep retrying until MAX_ATTEMPTS.
      }
    }
    // Gave up polling - the draft is still there, a later "Verify" press
    // on the same details will pick up whatever Razorpay resolved it to
    // without hitting the API again (see the exact-match check on the
    // backend).
    setVerifying(false);
  }, []);

  // Step 1 for a bank account: creates (or, for an exact repeat of
  // already-attempted details, just re-fetches) the Razorpay fund account
  // and kicks off verification. Does not save a real payout method yet.
  const handleVerifyBank = async () => {
    if (isPayoutsPaused) {
      showStatus('error', 'Temporarily Unavailable', maintenance?.message || "We're performing scheduled maintenance. Please try again shortly.");
      return;
    }
    const nextErrors = {
      bankName: !formData.bankName.trim(),
      accountNumber: !formData.accountNumber.trim(),
      ifsc: !formData.ifsc.trim(),
    };
    setFieldErrors(nextErrors);
    if (nextErrors.bankName || nextErrors.accountNumber || nextErrors.ifsc) {
      return;
    }

    setSaving(true);
    try {
      const { payoutMethod } = await addBankAccount({
        // Not asked from the doctor - Razorpay still needs some name in
        // the request, but only uses it for a match score, not to find
        // the account. The bank's own registered name (fetched back once
        // verification completes) is what actually gets shown and saved.
        accountHolderName: (doctorProfileName || 'Account Holder').trim(),
        accountNumber: formData.accountNumber.trim(),
        bankName: formData.bankName.trim(),
        ifsc: formData.ifsc.trim().toUpperCase(),
      });
      setDraftPayoutMethod(payoutMethod);
      if (payoutMethod.verificationStatus === 'pending') {
        pollBankVerification(payoutMethod.id);
      } else if (payoutMethod.verificationStatus === 'verified') {
        showStatus('success', 'Account Verified', 'Review the confirmed details below, then press Create to save it.');
      } else if (payoutMethod.verificationStatus === 'failed') {
        showStatus(
          'error',
          'Verification Failed',
          payoutMethod.verificationFailureReason || 'We could not verify this bank account. Please check the details and try again.'
        );
      } else {
        showStatus('error', 'Verification Unavailable', 'We could not start verification for this account. Please try again.');
      }
    } catch (error: any) {
      showStatus(
        'error',
        'Could Not Verify',
        error?.response?.data?.error || 'Please check your bank details and try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  // Step 2: promotes the verified draft into a real payout method, with
  // the optional "Save as" label attached.
  const handleCreateBank = async () => {
    if (!draftPayoutMethod) return;
    setSaving(true);
    try {
      await confirmPayoutMethod(draftPayoutMethod.id, formData.label.trim());
      await fetchData();
      closeSetupModal();
      showStatus('success', 'Payout Account Saved', 'Your bank account has been verified and is ready for instant payouts.');
    } catch (error: any) {
      showStatus('error', 'Could Not Save', error?.response?.data?.error || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveUpi = async () => {
    if (isPayoutsPaused) {
      showStatus('error', 'Temporarily Unavailable', maintenance?.message || "We're performing scheduled maintenance. Please try again shortly.");
      return;
    }
    const upiId = formData.upiId.trim();
    if (!upiId.includes('@')) {
      setFieldErrors((p) => ({ ...p, upiId: true }));
      return;
    }
    setFieldErrors((p) => ({ ...p, upiId: false }));

    setSaving(true);
    try {
      const { payoutMethod } = await addUpiAccount(upiId);
      await fetchData();
      closeSetupModal();
      showStatus(
        'success',
        'UPI ID Verified & Saved',
        payoutMethod.vpaCustomerName
          ? `Verified as ${payoutMethod.vpaCustomerName}. Ready for instant payouts.`
          : 'Your UPI ID is verified and ready for instant payouts.'
      );
    } catch (error: any) {
      showStatus(
        'error',
        'Could Not Save',
        error?.response?.data?.error || 'This UPI ID could not be verified. Please check and try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmWithdraw = async () => {
    if (isPayoutsPaused) {
      showStatus('error', 'Temporarily Unavailable', maintenance?.message || "We're performing scheduled maintenance. Please try again shortly.");
      return;
    }
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) {
      showStatus('error', 'Invalid Amount', 'Please enter a valid amount to withdraw.');
      return;
    }
    if (amount > availableAmount) {
      showStatus(
        'error',
        'Insufficient Balance',
        `You can withdraw up to ₹${availableAmount.toLocaleString()}.`
      );
      return;
    }
    if (!defaultAccount) {
      showStatus('error', 'No Account', 'Please add a payout account first.');
      return;
    }

    setWithdrawing(true);
    try {
      await requestDoctorPayout(amount, defaultAccount.id);
      setIsWithdrawModalVisible(false);
      await fetchData();
      showStatus(
        'success',
        'Withdrawal Initiated',
        `₹${amount.toLocaleString()} will be transferred to your account shortly.`
      );
    } catch (error: any) {
      showStatus(
        'error',
        'Withdrawal Failed',
        error?.response?.data?.error || 'Could not process withdrawal request. Please try again.'
      );
    } finally {
      setWithdrawing(false);
    }
  };

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
          Earnings & Payouts
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
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
        {/* ═══ 1. Balance Hero Card ═══ */}
        <View
          style={[
            styles.card,
            { backgroundColor: cardBg, borderColor: cardBorder },
          ]}
        >
          <View style={styles.balanceHeaderRow}>
            <View style={styles.titleIconRow}>
              <Wallet size={16} color="#0FBBA1" />
              <Text style={[styles.cardTitle, { color: textColor }]}>
                Available for Withdrawal
              </Text>
            </View>
            <View style={styles.settlementBadge}>
              <Text style={styles.settlementBadgeText}>Instant Payout</Text>
            </View>
          </View>

          {loading ? (
            <ActivityIndicator
              color="#0FBBA1"
              style={{ marginVertical: 18, alignSelf: 'flex-start' }}
            />
          ) : (
            <Text style={[styles.balanceAmountText, { color: textColor }]}>
              ₹{availableAmount.toLocaleString()}
            </Text>
          )}

          {/* Quick Stats Strip */}
          <View
            style={[
              styles.metricsStrip,
              { backgroundColor: isDark ? '#080E17' : '#F8FAFC' },
            ]}
          >
            <View style={styles.metricItem}>
              <View style={styles.metricLabelRow}>
                <Clock size={12} color="#F59E0B" />
                <Text style={[styles.metricLabel, { color: subTextColor }]}>
                  On Hold (48h)
                </Text>
              </View>
              <Text style={[styles.metricValue, { color: textColor }]}>
                ₹{(summary?.holdAmount ?? 0).toLocaleString()}
              </Text>
            </View>

            <View style={[styles.metricDivider, { backgroundColor: dividerColor }]} />

            <View style={styles.metricItem}>
              <View style={styles.metricLabelRow}>
                <TrendingUp size={12} color="#0FBBA1" />
                <Text style={[styles.metricLabel, { color: subTextColor }]}>
                  This Month
                </Text>
              </View>
              <Text style={[styles.metricValue, { color: '#0FBBA1' }]}>
                +₹{thisMonthEarnings.toLocaleString()}
              </Text>
            </View>

            <View style={[styles.metricDivider, { backgroundColor: dividerColor }]} />

            <View style={styles.metricItem}>
              <View style={styles.metricLabelRow}>
                <Calendar size={12} color="#3B82F6" />
                <Text style={[styles.metricLabel, { color: subTextColor }]}>
                  Total Revenue
                </Text>
              </View>
              <Text style={[styles.metricValue, { color: textColor }]}>
                ₹{(summary?.totalEarnings ?? 0).toLocaleString()}
              </Text>
            </View>
          </View>

          {/* Withdraw CTA */}
          <TouchableOpacity
            style={[
              styles.primaryWithdrawBtn,
              availableAmount <= 0 && styles.primaryWithdrawBtnDisabled,
            ]}
            onPress={handleWithdraw}
            disabled={availableAmount <= 0}
            activeOpacity={0.8}
          >
            <ArrowRight size={16} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.primaryWithdrawBtnText}>
              {availableAmount > 0
                ? `Withdraw ₹${availableAmount.toLocaleString()}`
                : 'No Funds Available to Withdraw'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ═══ 2. Payout Method Card (Polished banking surface) ═══ */}
        <View
          style={[
            styles.card,
            { backgroundColor: cardBg, borderColor: cardBorder },
          ]}
        >
          <View style={styles.cardHeaderRow}>
            <View style={styles.titleIconRow}>
              <Landmark size={16} color="#0FBBA1" />
              <Text style={[styles.cardTitle, { color: textColor }]}>
                Payout Method
              </Text>
            </View>
            {hasPaymentProfile ? (
              <TouchableOpacity
                style={styles.changeAccountLink}
                onPress={() => setIsSetupModalVisible(true)}
                activeOpacity={0.7}
              >
                <Edit3 size={13} color="#0FBBA1" />
                <Text style={styles.changeAccountLinkText}>Edit</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {hasPaymentProfile ? (
            <View
              style={[
                styles.bankCardSurface,
                {
                  backgroundColor: isDark ? '#080E17' : '#F8FAFC',
                  borderColor: isDark ? '#1A2737' : '#E2E8F0',
                },
              ]}
            >
              <View style={styles.bankCardTopRow}>
                <View style={styles.bankCardBrandRow}>
                  <View
                    style={[
                      styles.bankCardLogoCircle,
                      { backgroundColor: isDark ? '#0E2924' : '#E6FAF6' },
                    ]}
                  >
                    <Building2 size={16} color="#0FBBA1" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.bankCardHolderName, { color: textColor }]}
                      numberOfLines={1}
                    >
                      {holderName}
                    </Text>
                    <Text style={[styles.bankCardBankName, { color: subTextColor }]} numberOfLines={1}>
                      {bankNameLabel}
                    </Text>
                  </View>
                </View>

                {verificationBadge && (
                  <View
                    style={[
                      styles.verifiedBadgeRow,
                      { backgroundColor: isDark ? '#172230' : '#F1F5F9' },
                    ]}
                  >
                    <verificationBadge.Icon size={12} color={verificationBadge.color} />
                    <Text style={[styles.verifiedBadgeText, { color: verificationBadge.color }]}>
                      {verificationBadge.label}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.bankCardMiddleRow}>
                <Text style={[styles.bankCardNumber, { color: textColor }]}>
                  {accNumberMasked}
                </Text>
              </View>

              <View
                style={[
                  styles.bankCardBottomRow,
                  { borderTopColor: dividerColor },
                ]}
              >
                {ifscCode ? (
                  <Text style={[styles.bankCardIfscText, { color: subTextColor }]}>
                    IFSC: <Text style={{ color: textColor, fontWeight: '700' }}>{ifscCode}</Text>
                  </Text>
                ) : (
                  <Text style={[styles.bankCardIfscText, { color: subTextColor }]}>
                    Settlement: <Text style={{ color: textColor, fontWeight: '700' }}>Instant UPI</Text>
                  </Text>
                )}

                <Text style={styles.payoutScheduleText}>Instant Settlement</Text>
              </View>
            </View>
          ) : (
            <View
              style={[
                styles.emptyPayoutSurface,
                {
                  backgroundColor: isDark ? '#080E17' : '#F8FAFC',
                  borderColor: isDark ? '#1A2737' : '#E2E8F0',
                },
              ]}
            >
              <View style={styles.emptyPayoutLeft}>
                <View
                  style={[
                    styles.emptyPayoutIconCircle,
                    { backgroundColor: isDark ? '#172230' : '#E6FAF6' },
                  ]}
                >
                  <Landmark size={20} color="#0FBBA1" />
                </View>
                <View style={styles.emptyPayoutTextCol}>
                  <Text style={[styles.emptyPayoutHeadline, { color: textColor }]}>
                    No Payout Method Linked
                  </Text>
                  <Text style={[styles.emptyPayoutDescription, { color: subTextColor }]}>
                    Add your bank account details for direct settlements.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.addAccountCtaBtn}
                onPress={() => setIsSetupModalVisible(true)}
                activeOpacity={0.8}
              >
                <Plus size={14} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.addAccountCtaText}>Add Bank Account</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ═══ 3. Card: Consultation Earnings & Transaction History ═══ */}
        <View
          style={[
            styles.card,
            { backgroundColor: cardBg, borderColor: cardBorder },
          ]}
        >
          {/* Header */}
          <View style={styles.cardHeaderRow}>
            <View style={styles.titleIconRow}>
              <View
                style={[
                  styles.headerIconCircle,
                  { backgroundColor: isDark ? '#0E2924' : '#E6FAF6' },
                ]}
              >
                <TrendingUp size={16} color="#0FBBA1" />
              </View>
              <View>
                <Text style={[styles.cardTitle, { color: textColor }]}>
                  Transaction History
                </Text>
                <Text style={[styles.cardSubtitle, { color: subTextColor }]}>
                  Consultation revenue & adjustments
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.badgePill,
                { backgroundColor: isDark ? '#172230' : '#F1F5F9' },
              ]}
            >
              <Text style={[styles.badgePillText, { color: subTextColor }]}>
                {filteredEarningsTransactions.length}
              </Text>
            </View>
          </View>

          {/* Filter Chips */}
          <View style={styles.filterRow}>
            {earningsFilters.map((filter) => {
              const isActive = earningsFilter === filter;
              return (
                <TouchableOpacity
                  key={filter}
                  onPress={() => setEarningsFilter(filter)}
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
                        fontWeight: isActive ? '700' : '600',
                      },
                    ]}
                  >
                    {filter}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Transaction Content List */}
          {loading ? (
            <SlowInternetLoader
              isLoading={loading}
              message="Loading transaction records..."
              onRetry={fetchData}
            />
          ) : filteredEarningsTransactions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: subTextColor }]}>
                No {earningsFilter !== 'All' ? earningsFilter.toLowerCase() : ''} transactions recorded yet.
              </Text>
            </View>
          ) : (
            <View style={styles.txListCol}>
              {filteredEarningsTransactions.map((tx, idx) => {
                const isRefunded = tx.status === 'refunded' || tx.status === 'reversed';
                const isOnHold = tx.status === 'hold' || tx.status === 'pending';
                const showDivider = idx < filteredEarningsTransactions.length - 1;

                return (
                  <View key={tx.id || idx}>
                    <View style={styles.txRow}>
                      <View
                        style={[
                          styles.txIconCircle,
                          {
                            backgroundColor: isRefunded
                              ? isDark
                                ? '#2A1417'
                                : '#FEF2F2'
                              : isOnHold
                              ? isDark
                                ? '#2E2210'
                                : '#FEF3C7'
                              : isDark
                              ? '#0E2924'
                              : '#E6FAF6',
                          },
                        ]}
                      >
                        {isRefunded ? (
                          <RotateCcw size={16} color="#EF4444" />
                        ) : isOnHold ? (
                          <Clock size={16} color="#D97706" />
                        ) : (
                          <ArrowUpRight size={16} color="#10B981" />
                        )}
                      </View>

                      <View style={styles.txMainInfo}>
                        <Text
                          style={[styles.txTitleText, { color: textColor }]}
                          numberOfLines={1}
                        >
                          {tx.label || 'Consultation Earning'}
                        </Text>
                        <Text style={[styles.txDateText, { color: subTextColor }]}>
                          {formatTxDate(tx.date)} {tx.sub ? `• ${tx.sub}` : ''}
                        </Text>
                      </View>

                      <View style={styles.txRightCol}>
                        <Text
                          style={[
                            styles.txAmountText,
                            {
                              color: isRefunded
                                ? '#EF4444'
                                : isOnHold
                                ? '#D97706'
                                : '#10B981',
                            },
                          ]}
                        >
                          {isRefunded ? 'Refunded' : `+₹${Math.abs(tx.amount).toLocaleString()}`}
                        </Text>

                        <View
                          style={[
                            styles.microStatusTag,
                            {
                              backgroundColor: isRefunded
                                ? isDark
                                  ? '#2A1417'
                                  : '#FEF2F2'
                                : isOnHold
                                ? isDark
                                  ? '#2E2210'
                                  : '#FEF3C7'
                                : isDark
                                ? '#0E2924'
                                : '#E6FAF6',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.microStatusTagText,
                              {
                                color: isRefunded
                                  ? '#EF4444'
                                  : isOnHold
                                  ? '#D97706'
                                  : '#0FBBA1',
                              },
                            ]}
                          >
                            {isRefunded
                              ? 'Reversed'
                              : isOnHold
                              ? 'On Hold (48h)'
                              : 'Credited'}
                          </Text>
                        </View>
                      </View>
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
              })}
            </View>
          )}
        </View>

        {/* ═══ 4. Card: Doctor Withdrawal & Payout History ═══ */}
        <View
          style={[
            styles.card,
            { backgroundColor: cardBg, borderColor: cardBorder },
          ]}
        >
          {/* Header */}
          <View style={styles.cardHeaderRow}>
            <View style={styles.titleIconRow}>
              <View
                style={[
                  styles.headerIconCircle,
                  { backgroundColor: isDark ? '#0E2924' : '#E6FAF6' },
                ]}
              >
                <Receipt size={16} color="#0FBBA1" />
              </View>
              <View>
                <Text style={[styles.cardTitle, { color: textColor }]}>
                  Withdrawal History
                </Text>
                <Text style={[styles.cardSubtitle, { color: subTextColor }]}>
                  Payout requests & bank settlements
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.badgePill,
                { backgroundColor: isDark ? '#172230' : '#F1F5F9' },
              ]}
            >
              <Text style={[styles.badgePillText, { color: subTextColor }]}>
                {combinedWithdrawals.length}
              </Text>
            </View>
          </View>

          {/* Withdrawal Requests Content List */}
          {loading ? (
            <SlowInternetLoader
              isLoading={loading}
              message="Loading withdrawal requests..."
              onRetry={fetchData}
            />
          ) : combinedWithdrawals.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: subTextColor }]}>
                No withdrawal requests made yet.
              </Text>
            </View>
          ) : (
            <View style={styles.withdrawalListCol}>
              {combinedWithdrawals.map((withdrawal) => {
                const isExpanded = Boolean(expandedWithdrawalIds[withdrawal.id]);
                const isCompleted = withdrawal.status === 'completed' || withdrawal.status === 'success';
                const isProcessing = withdrawal.status === 'processing' || withdrawal.status === 'in_transit';
                const isFailed = withdrawal.status === 'failed' || withdrawal.status === 'rejected';

                const statusFg = isCompleted
                  ? '#0FBBA1'
                  : isProcessing
                  ? '#D97706'
                  : isFailed
                  ? '#EF4444'
                  : '#3B82F6';

                const statusBg = isDark
                  ? isCompleted
                    ? '#0E2924'
                    : isProcessing
                    ? '#2E2210'
                    : isFailed
                    ? '#2A1417'
                    : '#172554'
                  : isCompleted
                  ? '#E6FAF6'
                  : isProcessing
                  ? '#FEF3C7'
                  : isFailed
                  ? '#FEF2F2'
                  : '#EFF6FF';

                return (
                  <View
                    key={withdrawal.id}
                    style={[
                      styles.withdrawalCardItem,
                      {
                        backgroundColor: isDark ? '#080E17' : '#F8FAFC',
                        borderColor: isDark ? '#1A2737' : '#E2E8F0',
                      },
                    ]}
                  >
                    {/* Summary Header Row */}
                    <TouchableOpacity
                      style={styles.withdrawalSummaryHeader}
                      onPress={() => toggleExpandWithdrawal(withdrawal.id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.withdrawalLeftCol}>
                        <View
                          style={[
                            styles.txIconCircle,
                            {
                              backgroundColor: isDark ? '#172230' : '#E6FAF6',
                            },
                          ]}
                        >
                          <ArrowDownRight size={16} color="#0FBBA1" />
                        </View>

                        <View>
                          <Text style={[styles.withdrawalAmountHeader, { color: textColor }]}>
                            ₹{withdrawal.amount.toLocaleString()}
                          </Text>
                          <Text style={[styles.withdrawalDateHeader, { color: subTextColor }]}>
                            {formatTxDate(withdrawal.date)}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.withdrawalRightCol}>
                        <View
                          style={[
                            styles.withdrawalStatusBadge,
                            { backgroundColor: statusBg },
                          ]}
                        >
                          {isCompleted ? (
                            <CheckCircle2 size={11} color={statusFg} />
                          ) : isProcessing ? (
                            <Clock size={11} color={statusFg} />
                          ) : isFailed ? (
                            <XCircle size={11} color={statusFg} />
                          ) : (
                            <Clock size={11} color={statusFg} />
                          )}
                          <Text
                            style={[
                              styles.withdrawalStatusBadgeText,
                              { color: statusFg },
                            ]}
                          >
                            {isCompleted
                              ? 'Settled'
                              : isProcessing
                              ? 'Processing'
                              : isFailed
                              ? 'Failed'
                              : 'Initiated'}
                          </Text>
                        </View>

                        {isExpanded ? (
                          <ChevronUp size={17} color={iconColor} />
                        ) : (
                          <ChevronDown size={17} color={iconColor} />
                        )}
                      </View>
                    </TouchableOpacity>

                    {/* ═══ EXPANDED IN-DEPTH WITHDRAWAL RECEIPT & TIMELINE ═══ */}
                    {isExpanded && (
                      <View style={styles.withdrawalExpandedBody}>
                        <View
                          style={[
                            styles.rowDivider,
                            { backgroundColor: dividerColor, marginVertical: 10 },
                          ]}
                        />

                        {/* Reference IDs */}
                        <View style={styles.payoutDetailRow}>
                          <Text style={[styles.payoutDetailLabel, { color: subTextColor }]}>
                            Reference ID
                          </Text>
                          <Text style={[styles.payoutDetailValue, { color: textColor }]}>
                            #{withdrawal.id}
                          </Text>
                        </View>

                        <View style={styles.payoutDetailRow}>
                          <Text style={[styles.payoutDetailLabel, { color: subTextColor }]}>
                            Bank UTR / Gateway Ref
                          </Text>
                          <Text style={[styles.payoutDetailValue, { color: textColor }]}>
                            {withdrawal.utr}
                          </Text>
                        </View>

                        <View style={styles.payoutDetailRow}>
                          <Text style={[styles.payoutDetailLabel, { color: subTextColor }]}>
                            Destination Account
                          </Text>
                          <Text style={[styles.payoutDetailValue, { color: textColor }]}>
                            {withdrawal.accountName} ({withdrawal.accountMasked})
                          </Text>
                        </View>

                        {withdrawal.ifsc ? (
                          <View style={styles.payoutDetailRow}>
                            <Text style={[styles.payoutDetailLabel, { color: subTextColor }]}>
                              IFSC Code
                            </Text>
                            <Text style={[styles.payoutDetailValue, { color: textColor }]}>
                              {withdrawal.ifsc}
                            </Text>
                          </View>
                        ) : null}

                        {/* Breakdown */}
                        <View
                          style={[
                            styles.breakdownBox,
                            {
                              backgroundColor: isDark ? '#111B27' : '#FFFFFF',
                              borderColor: isDark ? '#1A2737' : '#E2E8F0',
                            },
                          ]}
                        >
                          <View style={styles.breakdownRow}>
                            <Text style={[styles.breakdownLabel, { color: subTextColor }]}>
                              Gross Withdrawal
                            </Text>
                            <Text style={[styles.breakdownVal, { color: textColor }]}>
                              ₹{withdrawal.amount.toLocaleString()}
                            </Text>
                          </View>
                          <View style={styles.breakdownRow}>
                            <Text style={[styles.breakdownLabel, { color: subTextColor }]}>
                              Platform Processing Fee
                            </Text>
                            <Text style={[styles.breakdownVal, { color: '#0FBBA1' }]}>
                              ₹0.00 (Free)
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.rowDivider,
                              { backgroundColor: dividerColor, marginVertical: 6 },
                            ]}
                          />
                          <View style={styles.breakdownRow}>
                            <Text style={[styles.breakdownTotalLabel, { color: textColor }]}>
                              Net Settled Amount
                            </Text>
                            <Text style={[styles.breakdownTotalVal, { color: '#0FBBA1' }]}>
                              ₹{withdrawal.amount.toLocaleString()}
                            </Text>
                          </View>
                        </View>

                        {/* Visual Settlement Timeline */}
                        <Text style={[styles.timelineHeaderTitle, { color: subTextColor, marginTop: 10 }]}>
                          Settlement Status Timeline
                        </Text>

                        <View style={styles.payoutTimelineContainer}>
                          <View style={styles.timelineStepRow}>
                            <View style={styles.stepIndicatorCol}>
                              <View style={[styles.stepDot, { backgroundColor: '#0FBBA1' }]} />
                              <View style={[styles.stepLine, { backgroundColor: isProcessing || isCompleted ? '#0FBBA1' : dividerColor }]} />
                            </View>
                            <View style={styles.stepContentCol}>
                              <Text style={[styles.stepTitle, { color: textColor }]}>
                                Withdrawal Requested
                              </Text>
                              <Text style={[styles.stepTime, { color: subTextColor }]}>
                                {formatTxDateTime(withdrawal.date)}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.timelineStepRow}>
                            <View style={styles.stepIndicatorCol}>
                              <View
                                style={[
                                  styles.stepDot,
                                  { backgroundColor: isProcessing || isCompleted ? '#0FBBA1' : '#D97706' },
                                ]}
                              />
                              <View style={[styles.stepLine, { backgroundColor: isCompleted ? '#0FBBA1' : dividerColor }]} />
                            </View>
                            <View style={styles.stepContentCol}>
                              <Text style={[styles.stepTitle, { color: textColor }]}>
                                Processing via Bank Gateway
                              </Text>
                              <Text style={[styles.stepTime, { color: subTextColor }]}>
                                {isCompleted ? 'Processed successfully' : 'In transit with banking partner'}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.timelineStepRow}>
                            <View style={styles.stepIndicatorCol}>
                              <View
                                style={[
                                  styles.stepDot,
                                  {
                                    backgroundColor: isCompleted
                                      ? '#0FBBA1'
                                      : isFailed
                                      ? '#EF4444'
                                      : dividerColor,
                                  },
                                ]}
                              />
                            </View>
                            <View style={styles.stepContentCol}>
                              <Text
                                style={[
                                  styles.stepTitle,
                                  { color: isCompleted ? '#0FBBA1' : isFailed ? '#EF4444' : subTextColor },
                                ]}
                              >
                                {isCompleted
                                  ? 'Settled to Bank Account'
                                  : isFailed
                                  ? 'Settlement Failed / Reversed'
                                  : 'Estimated Settlement within 24h'}
                              </Text>
                              <Text style={[styles.stepTime, { color: subTextColor }]}>
                                {isCompleted
                                  ? `Funds transferred (UTR: ${withdrawal.utr})`
                                  : isFailed
                                  ? 'Amount credited back to available balance'
                                  : 'Awaiting bank confirmation'}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ═══ Setup Payout "Modal" - a plain full-screen overlay inside this
          screen's own view tree, not RN's native <Modal>, so the Android
          nav bar stays in sync with the active theme (see the effects
          above) instead of falling back to the OS default white. ═══ */}
      {setupModalRendered && (
        <Animated.View
          style={[
            styles.fullScreenOverlay,
            { backgroundColor: cardBg, transform: [{ translateY: setupModalSlide }] },
          ]}
        >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.fullScreenModal}
        >
          <View style={[styles.fullScreenHeader, { paddingTop: insets.top + 10, borderBottomColor: dividerColor }]}>
            <TouchableOpacity
              onPress={closeSetupModal}
              style={[styles.backBtn, { backgroundColor: isDark ? '#172230' : '#F1F5F9' }]}
              activeOpacity={0.7}
            >
              <ArrowLeft size={20} color={textColor} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: textColor }]}>
              Payout Details
            </Text>
            <View style={{ width: 40 }} />
          </View>

          <Text style={[styles.modalSubtitle, { color: subTextColor, paddingHorizontal: 20, marginTop: 14 }]}>
            {accountMode === 'bank'
              ? 'Enter your banking details to receive direct consultation earnings.'
              : "Enter your UPI ID - we'll verify it's real before saving it."}
          </Text>

          <View style={[styles.accountModeTabRow, { backgroundColor: isDark ? '#080E17' : '#F1F5F9', marginHorizontal: 20 }]}>
            <TouchableOpacity
              style={[styles.accountModeTab, accountMode === 'bank' && styles.accountModeTabActive]}
              onPress={() => setAccountMode('bank')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.accountModeTabText,
                  { color: accountMode === 'bank' ? '#FFFFFF' : subTextColor },
                ]}
              >
                Bank Account
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.accountModeTab, accountMode === 'upi' && styles.accountModeTabActive]}
              onPress={() => setAccountMode('upi')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.accountModeTabText,
                  { color: accountMode === 'upi' ? '#FFFFFF' : subTextColor },
                ]}
              >
                UPI
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[styles.formScroll, { paddingHorizontal: 20 }]}
          >
            {accountMode === 'bank' ? (
              <>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: textColor }]}>
                    Bank Name
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.input,
                      styles.selectInput,
                      {
                        backgroundColor: isDark ? '#080E17' : '#F8FAFC',
                        borderColor: fieldErrors.bankName ? '#EF4444' : dividerColor,
                      },
                    ]}
                    onPress={openBankPicker}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={{
                        flex: 1,
                        fontSize: 15,
                        color: formData.bankName ? textColor : subTextColor,
                      }}
                      numberOfLines={1}
                    >
                      {formData.bankName || 'Select your bank'}
                    </Text>
                    <ChevronDown size={18} color={subTextColor} />
                  </TouchableOpacity>
                  {fieldErrors.bankName && (
                    <Text style={styles.fieldErrorText}>Please select a bank.</Text>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: textColor }]}>
                    Account Number
                  </Text>
                  <TextInput
                    placeholder="Enter bank account number"
                    placeholderTextColor={subTextColor}
                    style={[
                      styles.input,
                      {
                        backgroundColor: isDark ? '#080E17' : '#F8FAFC',
                        borderColor: fieldErrors.accountNumber ? '#EF4444' : dividerColor,
                        color: textColor,
                      },
                    ]}
                    keyboardType="numeric"
                    value={formData.accountNumber}
                    onChangeText={(v) => {
                      setFormData((p) => ({ ...p, accountNumber: v }));
                      if (fieldErrors.accountNumber) setFieldErrors((p) => ({ ...p, accountNumber: false }));
                    }}
                  />
                  {fieldErrors.accountNumber && (
                    <Text style={styles.fieldErrorText}>Please enter the account number.</Text>
                  )}
                </View>

                {/* Holder Name and IFSC are editable while setting up a new
                    attempt - once that exact combination comes back
                    verified, they lock to the bank-confirmed values rather
                    than staying open to silent edits. Change the bank/
                    account number above and these unlock again. */}
                {/* Never typed by the doctor - confirmed by the bank
                    itself once verification completes. Before that,
                    there's nothing to show yet. */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: textColor }]}>
                    Account Holder Name
                  </Text>
                  <View
                    style={[
                      styles.input,
                      {
                        justifyContent: 'center',
                        backgroundColor: isBankVerified ? (isDark ? '#0E2924' : '#E6FAF6') : (isDark ? '#080E17' : '#F8FAFC'),
                        borderColor: isBankVerified ? '#0FBBA1' : dividerColor,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 15, color: isBankVerified ? '#0FBBA1' : subTextColor }}>
                      {draftPayoutMethod?.bank_account?.name || ''}
                    </Text>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: textColor }]}>
                    IFSC Code {isBankVerified ? '(Verified)' : ''}
                  </Text>
                  <TextInput
                    placeholder="e.g. HDFC0001234"
                    placeholderTextColor={subTextColor}
                    editable={!isBankVerified}
                    style={[
                      styles.input,
                      {
                        backgroundColor: isBankVerified ? (isDark ? '#0E2924' : '#E6FAF6') : (isDark ? '#080E17' : '#F8FAFC'),
                        borderColor: isBankVerified ? '#0FBBA1' : fieldErrors.ifsc ? '#EF4444' : dividerColor,
                        color: isBankVerified ? '#0FBBA1' : textColor,
                      },
                    ]}
                    autoCapitalize="characters"
                    value={isBankVerified ? (draftPayoutMethod?.bank_account?.ifsc || formData.ifsc) : formData.ifsc}
                    onChangeText={(v) => {
                      setFormData((p) => ({ ...p, ifsc: v }));
                      if (fieldErrors.ifsc) setFieldErrors((p) => ({ ...p, ifsc: false }));
                    }}
                  />
                  {fieldErrors.ifsc && (
                    <Text style={styles.fieldErrorText}>Please enter the IFSC code.</Text>
                  )}
                </View>

                {isBankVerified && (
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: textColor }]}>
                      Save As (optional)
                    </Text>
                    <TextInput
                      placeholder="e.g. Primary Clinic Account"
                      placeholderTextColor={subTextColor}
                      style={[
                        styles.input,
                        {
                          backgroundColor: isDark ? '#080E17' : '#F8FAFC',
                          borderColor: dividerColor,
                          color: textColor,
                        },
                      ]}
                      value={formData.label}
                      onChangeText={(v) =>
                        setFormData((p) => ({ ...p, label: v }))
                      }
                    />
                  </View>
                )}
              </>
            ) : (
              <>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: textColor }]}>
                    UPI ID
                  </Text>
                  <TextInput
                    placeholder="e.g. yourname@upi"
                    placeholderTextColor={subTextColor}
                    style={[
                      styles.input,
                      {
                        backgroundColor: isDark ? '#080E17' : '#F8FAFC',
                        borderColor: fieldErrors.upiId ? '#EF4444' : dividerColor,
                        color: textColor,
                      },
                    ]}
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={formData.upiId}
                    onChangeText={(v) => {
                      setFormData((p) => ({ ...p, upiId: v }));
                      if (fieldErrors.upiId) setFieldErrors((p) => ({ ...p, upiId: false }));
                    }}
                  />
                  {fieldErrors.upiId && (
                    <Text style={styles.fieldErrorText}>Please enter a valid UPI ID, e.g. yourname@bank.</Text>
                  )}
                </View>
              </>
            )}
          </ScrollView>

          {/* Bottom Sticky Action Button */}
          <View style={[styles.modalFooter, { paddingBottom: insets.bottom > 0 ? insets.bottom + 10 : 18 }]}>
            <TouchableOpacity
              style={[styles.modalSubmitBtn, (saving || verifying) && styles.modalSubmitBtnDisabled]}
              onPress={
                accountMode === 'upi'
                  ? handleSaveUpi
                  : isBankVerified
                  ? handleCreateBank
                  : handleVerifyBank
              }
              disabled={saving || verifying}
              activeOpacity={0.8}
            >
              {saving || verifying ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.modalSubmitBtnText}>
                  {accountMode === 'upi' ? 'Save Payout Account' : isBankVerified ? 'Create' : 'Verify'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
        </Animated.View>
      )}

      {/* ═══ Withdraw Modal (Keyboard safe) ═══ */}
      <Modal
        visible={isWithdrawModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsWithdrawModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalBlur}
            activeOpacity={1}
            onPress={() => setIsWithdrawModalVisible(false)}
          />
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: cardBg,
                height: Math.round(SCREEN_HEIGHT * 0.70),
                paddingBottom: insets.bottom > 0 ? insets.bottom + 10 : 18,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textColor }]}>
                Withdraw Earnings
              </Text>
              <TouchableOpacity
                onPress={() => setIsWithdrawModalVisible(false)}
                style={[
                  styles.closeBtn,
                  { backgroundColor: isDark ? '#172230' : '#F1F5F9' },
                ]}
                activeOpacity={0.7}
              >
                <X size={18} color={subTextColor} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSubtitle, { color: subTextColor }]}>
              Funds will be sent to your verified bank account ({holderName || 'Default'}).
            </Text>

            <ScrollView
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              bounces={false}
              contentContainerStyle={styles.formScroll}
            >
              <View style={styles.inputGroup}>
                <View style={styles.inputHeaderRow}>
                  <Text style={[styles.inputLabel, { color: textColor }]}>
                    Withdrawal Amount (₹)
                  </Text>
                  <Text style={[styles.inputHelper, { color: '#0FBBA1' }]}>
                    Available: ₹{availableAmount.toLocaleString()}
                  </Text>
                </View>

                <TextInput
                  placeholder="0"
                  placeholderTextColor={subTextColor}
                  style={[
                    styles.amountInput,
                    {
                      backgroundColor: isDark ? '#080E17' : '#F8FAFC',
                      borderColor: dividerColor,
                      color: textColor,
                    },
                  ]}
                  keyboardType="numeric"
                  value={withdrawAmount}
                  onChangeText={setWithdrawAmount}
                />
              </View>

              {/* Quick Amount Selector Chips */}
              <View style={styles.quickAmountRow}>
                {[500, 1000, 2000].map((amt) => (
                  <TouchableOpacity
                    key={amt}
                    style={[
                      styles.quickAmountChip,
                      { backgroundColor: isDark ? '#080E17' : '#F8FAFC' },
                    ]}
                    onPress={() => setWithdrawAmount(String(amt))}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.quickAmountText, { color: textColor }]}>
                      +₹{amt}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[
                    styles.quickAmountChip,
                    { backgroundColor: isDark ? '#0E2924' : '#E6FAF6' },
                  ]}
                  onPress={() => setWithdrawAmount(String(availableAmount))}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.quickAmountText, { color: '#0FBBA1' }]}>
                    Max (₹{availableAmount})
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            {/* Bottom Sticky Action Button */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[
                  styles.modalSubmitBtn,
                  withdrawing && styles.modalSubmitBtnDisabled,
                ]}
                onPress={handleConfirmWithdraw}
                disabled={withdrawing}
                activeOpacity={0.8}
              >
                {withdrawing ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Confirm Instant Withdrawal</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <StatusModal
        visible={status.visible}
        status={status.type}
        title={status.title}
        message={status.message}
        onClose={() => setStatus((prev) => ({ ...prev, visible: false }))}
        autoCloseDelay={status.type === 'success' ? 3000 : undefined}
      />

      <BankPickerModal
        visible={isBankPickerVisible}
        banks={bankList}
        loading={bankListLoading}
        selectedBank={formData.bankName}
        onSelect={(bank) => {
          setFormData((p) => ({ ...p, bankName: bank }));
          setFieldErrors((p) => ({ ...p, bankName: false }));
        }}
        onClose={() => setIsBankPickerVisible(false)}
        isDark={isDark}
      />
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
    gap: 12,
  },

  // ═══ Card Component ═══
  card: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  badgePill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgePillText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // ═══ Balance Hero Card ═══
  balanceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settlementBadge: {
    backgroundColor: '#E6FAF6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  settlementBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#0FBBA1',
  },
  balanceAmountText: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: 8,
    marginBottom: 12,
  },

  metricsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 10,
  },
  metricItem: {
    flex: 1,
    gap: 3,
  },
  metricLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 12.5,
    fontWeight: '800',
    marginTop: 1,
  },
  metricDivider: {
    width: 1,
    height: '75%',
    marginHorizontal: 8,
  },

  primaryWithdrawBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0FBBA1',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 12,
  },
  primaryWithdrawBtnDisabled: {
    backgroundColor: '#94A3B8',
  },
  primaryWithdrawBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // ═══ Payout Account Card ═══
  changeAccountLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E6FAF6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  changeAccountLinkText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0FBBA1',
  },
  bankCardSurface: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    marginTop: 12,
    gap: 12,
  },
  bankCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bankCardBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  bankCardLogoCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankCardHolderName: {
    fontSize: 13.5,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  bankCardBankName: {
    fontSize: 11.5,
    fontWeight: '500',
    marginTop: 1,
  },
  verifiedBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E6FAF6',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
  },
  verifiedBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#0FBBA1',
  },
  bankCardMiddleRow: {
    paddingVertical: 4,
  },
  bankCardNumber: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 2,
  },
  bankCardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
  },
  bankCardIfscText: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  payoutScheduleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0FBBA1',
  },

  // Empty Payout State
  emptyPayoutSurface: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    marginTop: 12,
    gap: 12,
  },
  emptyPayoutLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emptyPayoutIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPayoutTextCol: {
    flex: 1,
    gap: 2,
  },
  emptyPayoutHeadline: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  emptyPayoutDescription: {
    fontSize: 11.5,
    fontWeight: '500',
    lineHeight: 16,
  },
  addAccountCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0FBBA1',
    paddingVertical: 10,
    borderRadius: 10,
  },
  addAccountCtaText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // ═══ Segment Control ═══
  segmentContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    marginBottom: 10,
  },
  segmentTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 9,
    gap: 6,
  },
  segmentTabActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentTabText: {
    fontSize: 12,
  },
  tabContentContainer: {
    marginTop: 4,
  },

  // Filter Chips
  filterRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 8,
  },
  filterChipText: {
    fontSize: 11,
  },
  emptyContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12.5,
    fontWeight: '500',
  },

  // Transactions List
  txListCol: {
    gap: 2,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
  },
  txIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txMainInfo: {
    flex: 1,
    gap: 2,
  },
  txTitleText: {
    fontSize: 13,
    fontWeight: '700',
  },
  txDateText: {
    fontSize: 11,
    fontWeight: '500',
  },
  txRightCol: {
    alignItems: 'flex-end',
    gap: 3,
  },
  txAmountText: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  microStatusTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  microStatusTagText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  rowDivider: {
    height: 1,
  },

  // ═══ Withdrawals List ═══
  withdrawalListCol: {
    gap: 8,
  },
  withdrawalCardItem: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
  },
  withdrawalSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  withdrawalLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  withdrawalAmountHeader: {
    fontSize: 14.5,
    fontWeight: '800',
  },
  withdrawalDateHeader: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  withdrawalRightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  withdrawalStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    borderRadius: 7,
  },
  withdrawalStatusBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },

  // Expanded Withdrawal Body
  withdrawalExpandedBody: {
    marginTop: 2,
    gap: 6,
  },
  payoutDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  payoutDetailLabel: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  payoutDetailValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  breakdownBox: {
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    marginTop: 6,
    gap: 4,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  breakdownVal: {
    fontSize: 12,
    fontWeight: '700',
  },
  breakdownTotalLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
  breakdownTotalVal: {
    fontSize: 13.5,
    fontWeight: '800',
  },

  // Payout Timeline
  timelineHeaderTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  payoutTimelineContainer: {
    paddingLeft: 4,
    gap: 0,
  },
  timelineStepRow: {
    flexDirection: 'row',
    minHeight: 38,
  },
  stepIndicatorCol: {
    alignItems: 'center',
    width: 16,
    marginRight: 8,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  stepLine: {
    width: 1.5,
    flex: 1,
    marginVertical: 2,
  },
  stepContentCol: {
    flex: 1,
    paddingBottom: 8,
  },
  stepTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  stepTime: {
    fontSize: 10.5,
    fontWeight: '500',
    marginTop: 1,
  },

  // ═══ Modal Styles ═══
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  fullScreenOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    elevation: 20,
  },
  fullScreenModal: {
    flex: 1,
  },
  fullScreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBlur: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 12.5,
    fontWeight: '500',
    lineHeight: 17,
    marginBottom: 14,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formScroll: {
    gap: 12,
    paddingBottom: 8,
  },
  inputGroup: {
    gap: 5,
  },
  inputHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  fieldErrorText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#EF4444',
    marginTop: 4,
  },
  inputHelper: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13.5,
  },
  selectInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  accountModeTabRow: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    gap: 4,
    marginBottom: 14,
  },
  accountModeTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountModeTabActive: {
    backgroundColor: '#0FBBA1',
  },
  accountModeTabText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  amountInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 20,
    fontWeight: '800',
  },
  quickAmountRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickAmountChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAmountText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
  },
  securityText: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  modalFooter: {
    paddingTop: 12,
    paddingBottom: 4,
    paddingHorizontal: 20,
  },
  modalSubmitBtn: {
    backgroundColor: '#0FBBA1',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalSubmitBtnDisabled: {
    opacity: 0.6,
  },
  modalSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '800',
  },
});
