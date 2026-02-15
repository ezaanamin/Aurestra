import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Modal,
  Image,
  TextInput,
  ToastAndroid
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import {
  fetchLatestTransactions,
  fetchTopSpendingCategories,
  fetchBudget,
  fetchUserAccounts,
  fetchCurrentSummary,
  fetchSavingsGoals,
  fetchCategories,
  calculateMonthlySummary,
  fetchTotalExpenses,
  calculatePreviousStatement,
  setManualBalance,
  fetchUncategorizedTransactions,
  markStatementRead,
  fetchFinancialInsight
} from '../API/slice/API';
import { readAllSMS, sendLocalNotification } from '../utils/smsHelper';
import { useDispatch, useSelector } from 'react-redux';
import { useSettings } from '../context/SettingsContext';

const { width } = Dimensions.get('window');

const CATEGORY_DETAILS_MAP = {
  "Food & Snacks": { icon: 'food', color: '#10B981' },
  "Ride / Transport": { icon: 'car', color: '#F59E0B' },
  "Bills & Utilities": { icon: 'receipt', color: '#3B82F6' },
  "Shopping": { icon: 'cart', color: '#8B5CF6' },
  "Healthcare": { icon: 'medical-bag', color: '#10B981' },
  "Entertainment": { icon: 'movie', color: '#EC4899' },
  "Education": { icon: 'school', color: '#6366F1' },
  "Groceries": { icon: 'cart-outline', color: '#059669' },
  "Personal Care": { icon: 'sparkles', color: '#C084FC' },
  "Online Services": { icon: 'web', color: '#60A5FA' },
  "Gym & Fitness": { icon: 'dumbbell', color: '#F87171' },
  "Subscription (Google one )": { icon: 'credit-card-outline', color: '#8B5CF6' },
  "Miscellaneous": { icon: 'dots-horizontal', color: '#64748B' },
  "Income": { icon: 'bank-transfer-in', color: '#10B981' },
};

import SalaryInputModal from '../components/SalaryInputModal';
import { API_BASE_URL } from '../API_URL';
import MonthPickerModal from '../components/MonthPickerModal';

const HomeScreen = ({ navigation }) => {
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(null);

  const openMonthPicker = () => setShowMonthPicker(true);
  const closeMonthPicker = () => setShowMonthPicker(false);
  const handleConfirm = (date) => {
    try {
      const monthStr = date.toISOString().slice(0, 7);
      setSelectedMonth(monthStr);
      closeMonthPicker();

      // Small delay to allow MonthPicker to close completely
      setTimeout(() => {
        try {
          setShowStatementModal(true);

          dispatch(calculatePreviousStatement(monthStr))
            .then((result) => {
              dispatch(fetchUserAccounts());
            })
            .catch((err) => {
              console.error("Statement calculation error:", err);
            });
        } catch (innerErr) {
          console.error("Inner Timeout Error:", innerErr);
        }
      }, 500);
    } catch (err) {
      console.error("Main Handler Error:", err);
    }
  };

  const handleSelectBalance = async (balanceValue) => {
    try {
      if (!selectedMonth) return;

      const res = await dispatch(calculatePreviousStatement({
        month: selectedMonth,
        confirmed: true,
        user_selected_balance: balanceValue
      })).unwrap();

      dispatch(fetchUserAccounts());
    } catch (err) {
      console.error("Selection Error:", err);
    }
  };

  const onCalculateStatement = () => {
    if (selectedMonth) {
      dispatch(calculateStatement(selectedMonth));
    } else {
      dispatch(calculateStatement(null));
    }
  };

  const [balanceVisible, setBalanceVisible] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [manualBalanceInput, setManualBalanceInput] = useState('');
  const [activeSmsTab, setActiveSmsTab] = useState('finance');
  const [isSyncing, setIsSyncing] = useState(false);
  const [checkpointTime, setCheckpointTime] = useState(null); // The actual timestamp of the last message/scan boundary

  const handleSaveBalance = async () => {
    if (!manualBalanceInput) return;

    const amount = parseFloat(manualBalanceInput);
    if (isNaN(amount)) {
      ToastAndroid.show("Invalid Amount", ToastAndroid.SHORT);
      return;
    }

    try {
      await dispatch(setManualBalance({ amount, source: 'bank' })).unwrap();
      ToastAndroid.show("Balance Updated Successfully", ToastAndroid.SHORT);
      setShowBalanceModal(false);
      setManualBalanceInput('');
      loadData();
    } catch (err) {
      ToastAndroid.show("Failed to update balance", ToastAndroid.SHORT);
    }
  };

  const handleSyncSMS = async () => {
    if (isSyncing) return;

    setIsSyncing(true);
    ToastAndroid.show("Syncing messages...", ToastAndroid.SHORT);

    try {
      // Use adequate delay for network operations to feel natural/allow UI update
      const result = await readAllSMS(false);

      if (result && !result.error) {
        setSyncResult(result);
        setShowSyncModal(true);
        loadData();
      } else {
        const errorMsg = result?.error || "Unable to sync messages";
        // Professional error feedback
        if (errorMsg.includes("cancelled") || errorMsg.includes("permission")) {
          ToastAndroid.show("Sync cancelled", ToastAndroid.SHORT);
        } else {
          ToastAndroid.show("Sync failed. Please check connection.", ToastAndroid.SHORT);
        }
      }
    } catch (e) {
      ToastAndroid.show("An error occurred during sync", ToastAndroid.SHORT);
    } finally {
      setIsSyncing(false);
    }
  };

  const dispatch = useDispatch();

  const statementStatus = useSelector((state) => state.API?.statementStatus || 'idle');
  const statementResult = useSelector((state) => state.API?.statementResult || null);

  const {
    user,
    latestTransactions,
    topCategories,
    transactionsStatus,
    topCategoriesStatus,
    budget,
    budgetStatus,
    accounts,
    accountsStatus,
    currentSummary,
    summaryStatus,
    savingsGoals,
    goalsStatus,
    categories,
    totalExpenses,
    uncategorizedCount,
    lastSmsCheck,
  } = useSelector((state) => state.API);

  useEffect(() => {
    loadData();
    setTimeout(() => {
      handleSyncSMS();
    }, 2000);

    const syncInterval = setInterval(() => {

      handleSyncSMS();
    }, 5 * 60 * 1000);

    return () => clearInterval(syncInterval);
  }, []);

  const loadData = async () => {
    // Load Checkpoint for UI
    try {
      const ts = await AsyncStorage.getItem('last_sms_scan_timestamp');
      if (ts) setCheckpointTime(parseInt(ts, 10));
    } catch (e) { }

    dispatch(fetchLatestTransactions(4));
    dispatch(fetchTopSpendingCategories());
    dispatch(calculateMonthlySummary());
    dispatch(fetchTotalExpenses());
    dispatch(fetchBudget());
    dispatch(fetchUserAccounts());
    dispatch(fetchCurrentSummary());
    dispatch(fetchSavingsGoals());
    dispatch(fetchCategories());
    dispatch(fetchUncategorizedTransactions());
    dispatch(fetchFinancialInsight());
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const totalBalance = accounts?.reduce((sum, acc) => sum + acc.balance, 0) || 0;
  const monthlyIncome = (budget && budget.total_budget > 0)
    ? budget.total_budget
    : (currentSummary?.total_income || 0);
  const monthlyExpense = totalExpenses || 0;

  let budgetTotal = budget?.spending_limit;

  if (!budgetTotal) {
    const inc = Number(budget?.total_budget) || 0;
    const sav = Number(budget?.saving) || 0;
    const calc = (Number(budget?.needs) || 0) + (Number(budget?.wants) || 0);

    if (calc > 0 && Math.abs(calc - inc) < 1) {
      budgetTotal = inc - sav;
    } else {
      budgetTotal = calc > 0 ? calc : (inc - sav);
    }
  }

  const budgetSpent = monthlyExpense;
  const budgetPercentage = budgetTotal > 0 ? (budgetSpent / budgetTotal) * 100 : 0;
  const topGoal = savingsGoals?.[0] || null;
  const savingsPercentage = topGoal ? (topGoal.current_amount / topGoal.target_amount) * 100 : 0;
  const isBudgetSet = budgetStatus === 'succeeded' && budget && budget.total_budget > 0;

  const { currency, isDarkMode, colors } = useSettings();

  const [showStatementModal, setShowStatementModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  const formatPKR = (amount) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(amount));
  };

  const getDaysPassedInMonth = () => new Date().getDate();
  const getCurrentMonthYear = () => new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const getCategoryDetails = (categoryName) => {
    const found = categories?.find(c => c.name === categoryName);
    if (found) {
      return { icon: found.icon, color: found.color };
    }
    if (CATEGORY_DETAILS_MAP[categoryName]) {
      return CATEGORY_DETAILS_MAP[categoryName];
    }
    return CATEGORY_DETAILS_MAP['Miscellaneous'];
  };

  const getTransactionDetails = (transaction) => {
    const isIncome = transaction.type === 'credit';
    const categoryName = transaction.purpose || 'Other';
    const details = getCategoryDetails(categoryName);
    const icon = isIncome ? 'bank-transfer-in' : details.icon;
    return { type: transaction.type, icon, color: details.color };
  };

  const userName = user?.full_name || 'User';
  const getInitials = (name) => {
    return name?.split(' ').map((part) => part[0]).join('').toUpperCase().substring(0, 2) || 'US';
  };

  if (accountsStatus === 'loading' && summaryStatus === 'loading') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading your finances...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={isDarkMode ? '#0F172A' : '#1E293B'} />

      {/* Manual Balance Modal */}
      <Modal
        visible={showBalanceModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowBalanceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Icon name="pencil-circle" size={32} color="#6366F1" />
              <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Total Balance</Text>
            </View>

            <Text style={[styles.modalDescription, { color: colors.textSecondary }]}>
              Manually setting this will lock your balance from being overwritten by older statements.
            </Text>

            <TextInput
              style={[styles.modalInput, {
                borderColor: colors.border,
                color: colors.text,
                backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC'
              }]}
              placeholder="Enter new balance"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              value={manualBalanceInput}
              onChangeText={setManualBalanceInput}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setShowBalanceModal(false)}
                style={[styles.modalButton, styles.modalButtonSecondary, { borderColor: colors.border }]}
              >
                <Text style={[styles.modalButtonTextSecondary, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveBalance}
                style={[styles.modalButton, styles.modalButtonPrimary]}
              >
                <Icon name="check-circle" size={18} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.modalButtonTextPrimary}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#6366F1']}
            tintColor={colors.text}
          />
        }
      >
        {/* Premium Header with Gradient */}
        <LinearGradient
          colors={isDarkMode ? ['#0F172A', '#1E293B', '#334155'] : ['#1E293B', '#334155', '#475569']}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerTop}>
            <View style={styles.greetingContainer}>
              <Text style={styles.greeting}>
                {new Date().getHours() < 12 ? '☀️ Good Morning' : new Date().getHours() < 18 ? '🌤️ Good Afternoon' : '🌙 Good Evening'}
              </Text>
              <Text style={styles.userName}>{userName}</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={handleSyncSMS}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Icon name="sync" size={20} color="#FFF" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.profileButton, user?.avatar_url && { backgroundColor: 'transparent', borderWidth: 2, borderColor: '#FFF' }]}
                onPress={() => navigation.navigate('EditProfile')}
              >
                {user?.avatar_url ? (
                  <Image
                    source={{
                      uri: user.avatar_url.startsWith('http')
                        ? user.avatar_url
                        : `${API_BASE_URL}${user.avatar_url}`
                    }}
                    style={styles.profileImage}
                  />
                ) : (
                  <Text style={styles.profileInitials}>{getInitials(userName)}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Glassmorphic Balance Card */}
          <View style={styles.balanceCard}>
            <View style={styles.balanceHeader}>
              <View style={styles.balanceLabelContainer}>
                <Icon name="wallet" size={16} color="#94A3B8" style={{ marginRight: 6 }} />
                <Text style={styles.balanceLabelText}>Total Balance</Text>
                {checkpointTime && !isNaN(new Date(checkpointTime).getTime()) && (
                  <Text style={{ fontSize: 10, color: '#94A3B8', marginLeft: 8 }}>
                    Checkpoint: {new Date(checkpointTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </Text>
                )}
                <TouchableOpacity onPress={() => setShowBalanceModal(true)} style={styles.editButton}>
                  <Icon name="pencil" size={14} color="#94A3B8" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={() => setBalanceVisible(!balanceVisible)} style={styles.eyeButton}>
                <Icon name={balanceVisible ? 'eye-off' : 'eye'} size={20} color="#CBD5E1" />
              </TouchableOpacity>
            </View>

            {balanceVisible ? (
              <Text style={styles.balanceAmount}>{formatPKR(totalBalance)}</Text>
            ) : (
              <View style={styles.hiddenBalanceContainer}>
                {[...Array(8)].map((_, i) => <View key={i} style={styles.hiddenDot} />)}
              </View>
            )}

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
                  <Icon name="trending-up" size={18} color="#10B981" />
                </View>
                <View style={styles.statInfo}>
                  <Text style={styles.statLabel}>Income</Text>
                  <Text style={styles.statValue}>{balanceVisible ? formatPKR(monthlyIncome) : '••••'}</Text>
                </View>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: 'rgba(239, 68, 68, 0.2)' }]}>
                  <Icon name="trending-down" size={18} color="#EF4444" />
                </View>
                <View style={styles.statInfo}>
                  <Text style={styles.statLabel}>Expenses</Text>
                  <Text style={styles.statValue}>{balanceVisible ? formatPKR(monthlyExpense) : '••••'}</Text>
                </View>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Quick Actions Grid */}
        <View style={styles.quickActionsWrapper}>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={[styles.quickActionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => navigation.navigate('Saving')}
            >
              <LinearGradient
                colors={['#10B981', '#059669']}
                style={styles.quickActionIcon}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Icon name="piggy-bank" size={24} color="#FFF" />
              </LinearGradient>
              <Text style={[styles.quickActionText, { color: colors.text }]}>Savings</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickActionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => navigation.navigate('CurrencyConverter')}
            >
              <LinearGradient
                colors={['#F59E0B', '#D97706']}
                style={styles.quickActionIcon}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Icon name="swap-horizontal" size={24} color="#FFF" />
              </LinearGradient>
              <Text style={[styles.quickActionText, { color: colors.text }]}>Convert</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickActionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => navigation.navigate('UncategorizedTransactions')}
            >
              <LinearGradient
                colors={['#8B5CF6', '#7C3AED']}
                style={styles.quickActionIcon}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Icon name="tag-off" size={24} color="#FFF" />
                {uncategorizedCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{uncategorizedCount}</Text>
                  </View>
                )}
              </LinearGradient>
              <Text style={[styles.quickActionText, { color: colors.text }]}>Organize</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickActionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setShowSalaryModal(true)}
            >
              <LinearGradient
                colors={['#6366F1', '#4F46E5']}
                style={styles.quickActionIcon}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Icon name="chart-bar" size={24} color="#FFF" />
              </LinearGradient>
              <Text style={[styles.quickActionText, { color: colors.text }]}>Budget</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Budget Alert */}
        {!isBudgetSet && budgetStatus !== 'loading' && (
          <View style={styles.alertWrapper}>
            <LinearGradient
              colors={['#FEF3C7', '#FDE68A']}
              style={styles.alertCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.alertIconWrapper}>
                <Icon name="alert-circle" size={32} color="#F59E0B" />
              </View>
              <View style={styles.alertContent}>
                <Text style={styles.alertTitle}>Budget Not Set!</Text>
                <Text style={styles.alertDescription}>
                  You're {getDaysPassedInMonth()} {getDaysPassedInMonth() === 1 ? 'day' : 'days'} into {getCurrentMonthYear()}. Set your budget now!
                </Text>
              </View>
              <TouchableOpacity
                style={styles.alertAction}
                onPress={() => setShowSalaryModal(true)}
              >
                <Icon name="arrow-right-circle" size={24} color="#F59E0B" />
              </TouchableOpacity>
            </LinearGradient>
          </View>
        )}

        {/* Budget Progress Card */}
        {isBudgetSet && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Monthly Budget</Text>
                <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>{getCurrentMonthYear()}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowSalaryModal(true)} style={styles.editLink}>
                <Icon name="pencil" size={16} color="#6366F1" style={{ marginRight: 4 }} />
                <Text style={styles.linkText}>Edit</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.budgetDisplay}>
              <View>
                <Text style={[styles.budgetSpent, { color: colors.text }]}>{formatPKR(budgetSpent)}</Text>
                <Text style={[styles.budgetTotal, { color: colors.textSecondary }]}>of {formatPKR(budgetTotal)}</Text>
              </View>
              <View style={styles.percentageBadge}>
                <Text style={styles.percentageText}>{budgetPercentage.toFixed(0)}%</Text>
              </View>
            </View>

            <View style={styles.progressWrapper}>
              <View style={[styles.progressTrack, { backgroundColor: isDarkMode ? '#334155' : '#F1F5F9' }]}>
                <LinearGradient
                  colors={
                    budgetPercentage > 90
                      ? ['#EF4444', '#DC2626']
                      : budgetPercentage > 70
                        ? ['#F59E0B', '#D97706']
                        : ['#10B981', '#059669']
                  }
                  style={[styles.progressFill, { width: `${Math.min(budgetPercentage, 100)}%` }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
              </View>
            </View>

            <View style={styles.budgetFooter}>
              <Icon name="information" size={16} color={colors.textSecondary} />
              <Text style={[styles.budgetRemaining, { color: colors.textSecondary }]}>
                {formatPKR(Math.max(budgetTotal - budgetSpent, 0))} remaining this month
              </Text>
            </View>
          </View>
        )}

        {/* Top Spending Categories */}
        {topCategoriesStatus === 'succeeded' && Array.isArray(topCategories) && topCategories.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Top Spending</Text>
                <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>This month's categories</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('Transaction')} style={styles.seeAllLink}>
                <Text style={styles.linkText}>See All</Text>
                <Icon name="chevron-right" size={16} color="#6366F1" />
              </TouchableOpacity>
            </View>

            <View style={styles.categoriesGrid}>
              {topCategories.slice(0, 4).map((cat, idx) => {
                const details = getCategoryDetails(cat.category);
                return (
                  <View key={idx} style={[styles.categoryCard, {
                    backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC',
                    borderColor: colors.border
                  }]}>
                    <View style={[styles.categoryIconWrapper, { backgroundColor: (details.color || '#64748B') + '20' }]}>
                      <Icon name={details.icon} size={24} color={details.color || '#64748B'} />
                    </View>
                    <Text style={[styles.categoryName, { color: colors.textSecondary }]} numberOfLines={1}>
                      {cat.category}
                    </Text>
                    <Text style={[styles.categoryAmount, { color: colors.text }]}>{formatPKR(cat.total_spent)}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Savings Goal */}
        {goalsStatus === 'succeeded' && topGoal && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Savings Goal</Text>
                <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>Primary goal progress</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('Saving')} style={styles.seeAllLink}>
                <Text style={styles.linkText}>View All</Text>
                <Icon name="chevron-right" size={16} color="#6366F1" />
              </TouchableOpacity>
            </View>

            <View style={[styles.goalCard, {
              backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC',
              borderColor: colors.border
            }]}>
              <View style={styles.goalHeader}>
                <View style={styles.goalEmojiContainer}>
                  <Text style={styles.goalEmoji}>{topGoal.emoji}</Text>
                </View>
                <View style={styles.goalDetails}>
                  <Text style={[styles.goalName, { color: colors.text }]}>{topGoal.name}</Text>
                  <Text style={[styles.goalProgress, { color: colors.textSecondary }]}>
                    {formatPKR(topGoal.current_amount)} of {formatPKR(topGoal.target_amount)}
                  </Text>
                </View>
                <View style={styles.goalPercentage}>
                  <Text style={styles.goalPercentageText}>{savingsPercentage.toFixed(0)}%</Text>
                </View>
              </View>

              <View style={styles.progressWrapper}>
                <View style={[styles.progressTrack, { backgroundColor: isDarkMode ? '#334155' : '#E2E8F0' }]}>
                  <LinearGradient
                    colors={['#10B981', '#059669']}
                    style={[styles.progressFill, { width: `${Math.min(savingsPercentage, 100)}%` }]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  />
                </View>
              </View>

              <View style={styles.goalFooter}>
                <View style={styles.goalRemaining}>
                  <Icon name="flag-checkered" size={14} color="#64748B" />
                  <Text style={[styles.goalRemainingText, { color: colors.textSecondary }]}>
                    {formatPKR(topGoal.remaining)} to go
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.goalButton}
                  onPress={() => navigation.navigate('Saving')}
                >
                  <Icon name="plus-circle" size={16} color="#6366F1" />
                  <Text style={styles.goalButtonText}>Add Funds</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Statement Calculator */}
        <View style={styles.statementWrapper}>
          <TouchableOpacity
            onPress={openMonthPicker}
            style={styles.statementButton}
          >
            <LinearGradient
              colors={['#6366F1', '#4F46E5']}
              style={styles.statementGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Icon name="calendar-month" size={24} color="#FFF" style={{ marginRight: 10 }} />
              <Text style={styles.statementButtonText}>Calculate Monthly Statement</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <MonthPickerModal
          visible={showMonthPicker}
          onConfirm={handleConfirm}
          onCancel={closeMonthPicker}
          isDarkMode={isDarkMode}
        />

        {/* Recent Transactions */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Recent Transactions</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>Latest activity</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Transaction')} style={styles.seeAllLink}>
              <Text style={styles.linkText}>See All</Text>
              <Icon name="chevron-right" size={16} color="#6366F1" />
            </TouchableOpacity>
          </View>

          {transactionsStatus === 'loading' ? (
            <ActivityIndicator size="small" color="#6366F1" style={{ marginVertical: 20 }} />
          ) : transactionsStatus === 'succeeded' && latestTransactions.length > 0 ? (
            <View style={styles.transactionsList}>
              {latestTransactions.map((txn, index) => {
                const { type, icon, color } = getTransactionDetails(txn);
                const isIncome = type === 'credit';

                return (
                  <View
                    key={txn.id}
                    style={[styles.transactionItem, index === latestTransactions.length - 1 && styles.lastTransaction]}
                  >
                    <View style={[styles.transactionIcon, { backgroundColor: (color || '#64748B') + '20' }]}>
                      <Icon name={icon} size={22} color={color || '#64748B'} />
                    </View>

                    <View style={styles.transactionDetails}>
                      <Text style={[styles.transactionName, { color: colors.text }]} numberOfLines={1}>
                        {txn.source === 'bank_statement' && txn.notes
                          ? txn.notes
                          : (txn.sender || txn.receiver || 'Transaction')}
                      </Text>
                      <Text style={[styles.transactionMeta, { color: colors.textSecondary }]}>
                        {txn.purpose || 'Uncategorized'} • {new Date(txn.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </Text>
                    </View>

                    <View style={styles.transactionRight}>
                      <Text style={[styles.transactionAmount, isIncome ? styles.incomeAmount : styles.expenseAmount]}>
                        {isIncome ? '+' : '-'}{formatPKR(txn.amount)}
                      </Text>
                      <Icon
                        name={isIncome ? 'arrow-bottom-left' : 'arrow-top-right'}
                        size={14}
                        color={isIncome ? '#10B981' : '#64748B'}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Icon name="wallet-outline" size={56} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No recent transactions</Text>
            </View>
          )}
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('Transaction', { openAddModal: true })}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#8B5CF6', '#7C3AED']}
          style={styles.fabGradient}
        >
          <Ionicons name="add" size={32} color="#FFFFFF" />
        </LinearGradient>
      </TouchableOpacity>

      {showSalaryModal && (
        <SalaryInputModal
          visible={showSalaryModal}
          onClose={() => setShowSalaryModal(false)}
        />
      )}

      {/* Statement Result Modal */}
      <Modal
        visible={showStatementModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowStatementModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.statementModal, { backgroundColor: colors.card }]}>
            {statementStatus === 'loading' || statementStatus === 'idle' ? (
              <View style={styles.statementLoading}>
                <ActivityIndicator size="large" color="#6366F1" style={{ marginBottom: 20 }} />
                <Text style={[styles.statementLoadingTitle, { color: colors.text }]}>
                  Analyzing Bank Statement...
                </Text>
                <Text style={[styles.statementLoadingDesc, { color: colors.textSecondary }]}>
                  Scanning emails for PDF, extracting transactions, and generating insights.
                </Text>
              </View>
            ) : statementStatus === 'failed' ? (
              <View style={styles.statementError}>
                <Icon name="alert-circle" size={64} color="#EF4444" style={{ marginBottom: 20 }} />
                <Text style={[styles.statementErrorTitle, { color: colors.text }]}>
                  Calculation Failed
                </Text>
                <Text style={[styles.statementErrorDesc, { color: colors.textSecondary }]}>
                  {typeof statementResult === 'string'
                    ? statementResult
                    : (statementResult?.error || statementResult?.message || 'Could not process statement.')}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowStatementModal(false)}
                  style={styles.statementErrorButton}
                >
                  <Text style={styles.statementErrorButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            ) : statementResult ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.statementSuccess}>
                  {statementResult.requires_selection ? (
                    <View style={{ width: '100%' }}>
                      <View style={[styles.statusBadge, { backgroundColor: '#F59E0B10', borderColor: '#F59E0B', marginBottom: 16 }]}>
                        <Icon name="shield-alert-outline" size={20} color="#F59E0B" />
                        <Text style={[styles.statusBadgeText, { color: '#F59E0B' }]}>Manual Verification Required</Text>
                      </View>

                      <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginBottom: 20 }}>
                        Multiple potential balances found. Please select the correct one:
                      </Text>

                      {statementResult.all_email_data?.map((email, eIdx) => (
                        <View key={eIdx} style={{ marginBottom: 16 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                            <Icon name="email-outline" size={14} color={colors.textSecondary} />
                            <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.textSecondary }}>
                              Statement {new Date(email.date).toLocaleDateString()}
                            </Text>
                          </View>

                          {email.balance_table?.map((row, rIdx) => (
                            <TouchableOpacity
                              key={rIdx}
                              style={[styles.balanceOption, { backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}
                              onPress={() => handleSelectBalance(row.balance_value)}
                            >
                              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                <View style={[styles.typeTag, { backgroundColor: row.type === 'CLOSING' ? '#10B98120' : '#64748B20' }]}>
                                  <Text style={[styles.typeTagText, { color: row.type === 'CLOSING' ? '#10B981' : '#64748B' }]}>{row.type}</Text>
                                </View>
                                <Text style={[styles.balanceVal, { color: colors.text }]}>{formatPKR(row.balance_value)}</Text>
                              </View>
                              <Icon name="chevron-right" size={20} color="#6366F1" />
                            </TouchableOpacity>
                          ))}
                        </View>
                      ))}

                      <TouchableOpacity
                        style={[styles.statementDoneButton, { marginTop: 10, opacity: 0.8 }]}
                        onPress={() => handleSelectBalance(statementResult.suggested_balances.closing_balance)}
                      >
                        <View style={[styles.statementDoneGradient, { backgroundColor: '#64748B' }]}>
                          <Text style={styles.statementDoneText}>Use Suggested: {formatPKR(statementResult.suggested_balances.closing_balance)}</Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      <Icon name="check-circle" size={64} color="#10B981" style={{ marginBottom: 20 }} />
                      <Text style={[styles.statementSuccessTitle, { color: colors.text }]}>
                        Statement Processed!
                      </Text>
                      <Text style={styles.statementMonth}>
                        {(() => {
                          const m = statementResult.month;
                          if (!m || typeof m !== 'string' || !m.includes('-')) return m || "Unknown Month";
                          const [p1, p2] = m.split('-');
                          const year = parseInt(p1) > 12 ? p1 : p2;
                          const month = parseInt(p1) > 12 ? p2 : p1;
                          if (isNaN(year) || isNaN(month)) return m;
                          const date = new Date(parseInt(year), parseInt(month) - 1);
                          if (isNaN(date.getTime())) return m;
                          return date.toLocaleString('default', { month: 'long', year: 'numeric' });
                        })()}
                      </Text>

                      {/* Read Status Badge */}
                      <View style={[styles.statusBadge, {
                        backgroundColor: statementResult.read_status === 'read' ? '#10B98110' : '#EF444410',
                        borderColor: statementResult.read_status === 'read' ? '#10B981' : '#EF4444',
                      }]}>
                        <Icon
                          name={statementResult.read_status === 'read' ? 'eye-check' : 'eye-off'}
                          size={16}
                          color={statementResult.read_status === 'read' ? '#10B981' : '#EF4444'}
                        />
                        <Text style={[styles.statusBadgeText, {
                          color: statementResult.read_status === 'read' ? '#10B981' : '#EF4444'
                        }]}>
                          {statementResult.read_status === 'read'
                            ? '✓ Read (Balance applied)'
                            : '⚠ Unread (Balance will be added)'}
                        </Text>
                      </View>

                      {/* Stats Grid */}
                      <View style={styles.statementStats}>
                        <View style={styles.statementStatItem}>
                          <Text style={[styles.statementStatLabel, { color: colors.textSecondary }]}>Added</Text>
                          <Text style={[styles.statementStatValue, { color: '#10B981' }]}>
                            {statementResult.added_transactions ?? 0}
                          </Text>
                        </View>
                        <View style={styles.statementStatItem}>
                          <Text style={[styles.statementStatLabel, { color: colors.textSecondary }]}>Skipped</Text>
                          <Text style={[styles.statementStatValue, { color: colors.text }]}>
                            {statementResult.skipped_transactions ?? 0}
                          </Text>
                        </View>
                      </View>

                      {/* Transaction Table */}
                      {!!(statementResult.data && statementResult.data.length > 0) && (
                        <View style={styles.transactionTable}>
                          <Text style={[styles.tableTitle, { color: colors.textSecondary }]}>
                            PROCESSED TRANSACTIONS
                          </Text>

                          <View style={[styles.tableHeader, {
                            backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9'
                          }]}>
                            <Text style={[styles.tableHeaderText, { color: colors.textSecondary }]}>Date</Text>
                            <Text style={[styles.tableHeaderText, { color: colors.textSecondary, flex: 2 }]}>Description</Text>
                            <Text style={[styles.tableHeaderText, { color: colors.textSecondary, textAlign: 'right' }]}>Amount</Text>
                          </View>

                          <View style={[styles.tableBody, {
                            borderColor: isDarkMode ? '#334155' : '#E2E8F0',
                            backgroundColor: colors.background
                          }]}>
                            <ScrollView style={styles.tableScroll}>
                              {statementResult.data.map((tx, idx) => {
                                let day = '??';
                                let monthShort = '???';
                                const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

                                try {
                                  if (tx.date.includes('/')) {
                                    const parts = tx.date.split('/');
                                    if (parts.length === 3) {
                                      day = parts[0];
                                      const mIndex = parseInt(parts[1], 10) - 1;
                                      if (mIndex >= 0 && mIndex <= 11) {
                                        monthShort = MONTHS[mIndex];
                                      }
                                    }
                                  } else if (tx.date.includes('-')) {
                                    const d = new Date(tx.date);
                                    if (!isNaN(d.getTime())) {
                                      day = d.getDate();
                                      monthShort = MONTHS[d.getMonth()];
                                    }
                                  }
                                } catch (err) { }

                                return (
                                  <View key={idx} style={[styles.tableRow, {
                                    backgroundColor: idx % 2 === 0 ? 'transparent' : (isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'),
                                    borderBottomWidth: idx < statementResult.data.length - 1 ? 1 : 0,
                                    borderBottomColor: colors.border
                                  }]}>
                                    <View style={styles.tableDateCell}>
                                      <Text style={[styles.tableDay, { color: colors.text }]}>{day}</Text>
                                      <Text style={[styles.tableMonth, { color: colors.textSecondary }]}>{monthShort}</Text>
                                    </View>

                                    <View style={styles.tableDescCell}>
                                      <Text style={[styles.tableDesc, { color: colors.text }]} numberOfLines={2}>
                                        {tx.description}
                                      </Text>
                                      {tx.status === 'added' && (
                                        <View style={styles.newBadge}>
                                          <Text style={styles.newBadgeText}>NEW</Text>
                                        </View>
                                      )}
                                    </View>

                                    <View style={styles.tableAmountCell}>
                                      <Text style={[styles.tableAmount, {
                                        color: tx.type === 'credit' ? '#10B981' : '#F43F5E'
                                      }]}>
                                        {tx.type === 'credit' ? '+' : '-'}{Math.abs(tx.amount).toLocaleString()}
                                      </Text>
                                    </View>
                                  </View>
                                );
                              })}
                            </ScrollView>
                          </View>
                        </View>
                      )}

                      {/* Balances */}
                      <View style={styles.balancesSection}>
                        <View style={styles.balanceRow}>
                          <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>Opening Balance:</Text>
                          <Text style={[styles.balanceValue, { color: colors.text }]}>
                            {formatPKR(statementResult.balances?.opening || 0)}
                          </Text>
                        </View>
                        <View style={styles.balanceRow}>
                          <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>Closing Balance:</Text>
                          <Text style={[styles.balanceValue, { color: colors.text }]}>
                            {formatPKR(statementResult.balances?.closing || 0)}
                          </Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        onPress={() => {
                          setShowStatementModal(false);
                          onRefresh();
                        }}
                        style={styles.statementDoneButton}
                      >
                        <LinearGradient
                          colors={['#10B981', '#059669']}
                          style={styles.statementDoneGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                          <Icon name="check-circle" size={20} color="#FFF" style={{ marginRight: 8 }} />
                          <Text style={styles.statementDoneText}>Done</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Sync Summary Modal */}
      <Modal
        visible={showSyncModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSyncModal(false)}
      >
        <View style={styles.modalOverlayBottom}>
          <View style={[styles.syncModal, { backgroundColor: colors.card }]}>
            <TouchableOpacity
              onPress={() => setShowSyncModal(false)}
              style={{
                position: 'absolute',
                top: 24,
                right: 24,
                zIndex: 10,
                padding: 4,
                backgroundColor: isDarkMode ? '#374151' : '#F3F4F6',
                borderRadius: 20
              }}
            >
              <Icon name="close" size={20} color={colors.text} />
            </TouchableOpacity>

            {/* Header Section */}
            <View style={styles.syncHeader}>
              <View style={[styles.syncIconContainer, {
                backgroundColor: isDarkMode ? '#10B98115' : '#DCFCE7',
                borderWidth: 2,
                borderColor: isDarkMode ? '#10B98130' : '#86EFAC'
              }]}>
                <Icon name="sync" size={32} color="#10B981" />
              </View>
              <Text style={[styles.syncTitle, { color: colors.text }]}>Sync Complete</Text>

              {/* Last Activity Info */}
              <View style={{ alignItems: 'center', gap: 6, marginTop: 4 }}>
                {/* Last Bank SMS Time */}
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 4,
                  backgroundColor: isDarkMode ? '#1F2937' : '#F3F4F6',
                  borderRadius: 20
                }}>
                  <Icon name="history" size={14} color={colors.textSecondary} />
                  <Text style={{ fontSize: 12, color: colors.textSecondary, fontWeight: '500' }}>
                    {syncResult?.lastBankingMessages && syncResult.lastBankingMessages.length > 0 && !isNaN(new Date(syncResult.lastBankingMessages[0].date).getTime())
                      ? `Last Bank SMS: ${new Date(syncResult.lastBankingMessages[0].date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`
                      : `Last Scan: ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`
                    }
                  </Text>
                </View>

                {/* Scan Scope Badge */}
                <Text style={{ fontSize: 10, color: colors.textSecondary, opacity: 0.8, marginTop: 4 }}>
                  Looking for messages after: {syncResult?.scanFromDate && !isNaN(new Date(syncResult.scanFromDate).getTime()) ? new Date(syncResult.scanFromDate).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Unknown'}
                </Text>
              </View>
            </View>

            {/* Stats Grid */}
            <View style={styles.syncStatsGrid}>
              <View style={[styles.syncStatCard, { backgroundColor: isDarkMode ? '#1F2937' : '#F9FAFB' }]}>
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: isDarkMode ? '#10B98120' : '#DCFCE7',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 8
                }}>
                  <Icon name="add-circle" size={20} color="#10B981" />
                </View>
                <Text style={[styles.syncStatValue, { color: '#10B981' }]}>
                  {syncResult?.created || 0}
                </Text>
                <Text style={[styles.syncStatLabel, { color: colors.textSecondary }]}>New</Text>
              </View>

              <View style={[styles.syncStatCard, { backgroundColor: isDarkMode ? '#1F2937' : '#F9FAFB' }]}>
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: isDarkMode ? '#6366F120' : '#E0E7FF',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 8
                }}>
                  <Icon name="sync-disabled" size={20} color="#6366F1" />
                </View>
                <Text style={[styles.syncStatValue, { color: '#6366F1' }]}>
                  {syncResult?.skipped || 0}
                </Text>
                <Text style={[styles.syncStatLabel, { color: colors.textSecondary }]}>Skipped</Text>
              </View>

              <View style={[styles.syncStatCard, { backgroundColor: isDarkMode ? '#1F2937' : '#F9FAFB' }]}>
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: isDarkMode ? '#EF444420' : '#FEE2E2',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 8
                }}>
                  <Icon name="error" size={20} color="#EF4444" />
                </View>
                <Text style={[styles.syncStatValue, { color: '#EF4444' }]}>
                  {syncResult?.failed || 0}
                </Text>
                <Text style={[styles.syncStatLabel, { color: colors.textSecondary }]}>Failed</Text>
              </View>
            </View>

            {!!(syncResult?.transactions && syncResult.transactions.filter(t => t.is_new).length > 0) && (
              <View style={{ marginVertical: 16 }}>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 12,
                  gap: 8
                }}>
                  <View style={{
                    width: 4,
                    height: 18,
                    backgroundColor: '#10B981',
                    borderRadius: 2
                  }} />
                  <Text style={{
                    fontSize: 15,
                    fontWeight: '700',
                    color: colors.text
                  }}>
                    Added Transactions
                  </Text>
                  <View style={{
                    backgroundColor: isDarkMode ? '#10B98120' : '#DCFCE7',
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 12
                  }}>
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#10B981' }}>
                      {syncResult.transactions.filter(t => t.is_new).length}
                    </Text>
                  </View>
                </View>

                <View style={{
                  backgroundColor: isDarkMode ? '#111827' : '#FFFFFF',
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: isDarkMode ? '#374151' : '#E5E7EB',
                  overflow: 'hidden'
                }}>
                  <ScrollView
                    style={{ maxHeight: 220 }}
                    contentContainerStyle={{ padding: 4 }}
                  >
                    {syncResult.transactions.filter(t => t.is_new).map((tx, idx) => (
                      <View key={idx} style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingVertical: 12,
                        paddingHorizontal: 12,
                        marginVertical: 2,
                        backgroundColor: isDarkMode ? '#1F2937' : '#F9FAFB',
                        borderRadius: 8
                      }}>
                        <View style={{ flex: 1, marginRight: 12 }}>
                          <Text style={{
                            fontSize: 14,
                            color: colors.text,
                            fontWeight: '600',
                            marginBottom: 4
                          }} numberOfLines={1}>
                            {tx.purpose || 'Uncategorized'}
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={{
                              fontSize: 11,
                              color: colors.textSecondary,
                              backgroundColor: isDarkMode ? '#374151' : '#E5E7EB',
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              borderRadius: 4,
                              fontWeight: '500'
                            }}>
                              {tx.id}
                            </Text>
                            <Text style={{
                              fontSize: 11,
                              color: tx.type === 'credit' ? '#10B981' : '#EF4444',
                              fontWeight: '600'
                            }}>
                              {tx.type.toUpperCase()}
                            </Text>
                          </View>
                        </View>
                        <View style={{
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 8,
                          backgroundColor: tx.type === 'credit'
                            ? (isDarkMode ? '#10B98115' : '#DCFCE7')
                            : (isDarkMode ? '#EF444415' : '#FEE2E2')
                        }}>
                          <Text style={{
                            fontSize: 15,
                            fontWeight: '700',
                            color: tx.type === 'credit' ? '#10B981' : '#EF4444'
                          }}>
                            {tx.type === 'credit' ? '+' : '-'} {Math.abs(tx.amount).toLocaleString()}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              </View>
            )}

            {/* Banking Messages Status */}
            {!!(!syncResult?.hasRecentBankingMessages && syncResult?.lastBankingMessages && syncResult.lastBankingMessages.length > 0) && (
              <View style={{
                marginVertical: 12,
                padding: 16,
                backgroundColor: isDarkMode ? '#1F2937' : '#FEF3C7',
                borderRadius: 12,
                borderLeftWidth: 4,
                borderLeftColor: '#F59E0B'
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <View style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: isDarkMode ? '#F59E0B20' : '#FDE68A',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Icon name="schedule" size={18} color="#F59E0B" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: isDarkMode ? '#FCD34D' : '#D97706' }}>
                      No Recent Banking Messages
                    </Text>
                    <Text style={{ fontSize: 11, color: isDarkMode ? '#FDE68A' : '#92400E', marginTop: 2 }}>
                      No transactions in the last hour
                    </Text>
                  </View>
                </View>

                <View style={{
                  marginTop: 12,
                  paddingTop: 12,
                  borderTopWidth: 1,
                  borderTopColor: isDarkMode ? '#374151' : '#FDE68A'
                }}>
                  <Text style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: isDarkMode ? '#FDE68A' : '#92400E',
                    marginBottom: 10
                  }}>
                    Last Banking Messages:
                  </Text>

                  <ScrollView
                    style={{ maxHeight: 200 }}
                    nestedScrollEnabled={true}
                  >
                    {syncResult.lastBankingMessages.map((msg, idx) => {
                      // Get friendly name for sender
                      const addressStr = (msg.address || "").toUpperCase();
                      let displayName = msg.address;
                      if (addressStr.endsWith('8810')) displayName = 'Easypaisa';
                      else if (addressStr.endsWith('8812')) displayName = 'JazzCash';
                      else if (addressStr.includes('BAHL') || addressStr.includes('HABIB')) displayName = 'Bank Al Habib';
                      else if (addressStr.endsWith('3737')) displayName = 'Easypaisa';

                      return (
                        <View key={idx} style={{
                          backgroundColor: isDarkMode ? '#374151' : '#FFFFFF',
                          padding: 12,
                          borderRadius: 10,
                          marginBottom: 8,
                          borderWidth: 1,
                          borderColor: isDarkMode ? '#4B5563' : '#FDE68A'
                        }}>
                          {/* Header with sender and date */}
                          <View style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            marginBottom: 8
                          }}>
                            <View style={{ flex: 1, marginRight: 8 }}>
                              <Text style={{
                                fontSize: 13,
                                fontWeight: '700',
                                color: isDarkMode ? '#FFFFFF' : '#1F2937',
                                marginBottom: 4
                              }}>
                                {displayName}
                              </Text>
                              <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 6
                              }}>
                                <Icon name="access-time" size={12} color="#F59E0B" />
                                <Text style={{
                                  fontSize: 11,
                                  color: isDarkMode ? '#FCD34D' : '#D97706',
                                  fontWeight: '600'
                                }}>
                                  {new Date(msg.date).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })} at {new Date(msg.date).toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: true
                                  })}
                                </Text>
                              </View>
                            </View>

                            {/* Time ago badge */}
                            <View style={{
                              backgroundColor: isDarkMode ? '#F59E0B20' : '#FDE68A',
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                              borderRadius: 6
                            }}>
                              <Text style={{
                                fontSize: 10,
                                fontWeight: '700',
                                color: '#F59E0B'
                              }}>
                                {(() => {
                                  const diff = Date.now() - msg.date;
                                  const hours = Math.floor(diff / (1000 * 60 * 60));
                                  const days = Math.floor(hours / 24);

                                  if (days > 0) return `${days}d ago`;
                                  if (hours > 0) return `${hours}h ago`;
                                  const mins = Math.floor(diff / (1000 * 60));
                                  return `${mins}m ago`;
                                })()}
                              </Text>
                            </View>
                          </View>

                          {/* Message body */}
                          <View style={{
                            backgroundColor: isDarkMode ? '#1F2937' : '#FFFBEB',
                            padding: 10,
                            borderRadius: 8,
                            borderLeftWidth: 3,
                            borderLeftColor: '#F59E0B'
                          }}>
                            <Text style={{
                              fontSize: 12,
                              color: isDarkMode ? '#D1D5DB' : '#374151',
                              lineHeight: 18
                            }} numberOfLines={3}>
                              {msg.body}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>
              </View>
            )}

            {/* Recent SMS Section - TABBED */}
            <View style={{ marginVertical: 16 }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 12,
                gap: 8
              }}>
                <View style={{
                  width: 4,
                  height: 18,
                  backgroundColor: '#6366F1',
                  borderRadius: 2
                }} />
                <Text style={{
                  fontSize: 15,
                  fontWeight: '700',
                  color: colors.text
                }}>
                  Recent Messages
                </Text>
              </View>

              {(() => {
                const allMsgs = syncResult?.recentMessages || [];
                const financeMsgs = allMsgs.filter(m => m.status === 'READ');
                const otherMsgs = allMsgs.filter(m => m.status !== 'READ');
                const displayedMsgs = activeSmsTab === 'finance' ? financeMsgs : otherMsgs;

                return (
                  <>
                    {/* Tabs */}
                    <View style={{
                      flexDirection: 'row',
                      backgroundColor: isDarkMode ? '#111827' : '#F3F4F6',
                      borderRadius: 12,
                      padding: 4,
                      marginBottom: 12,
                      borderWidth: 1,
                      borderColor: isDarkMode ? '#374151' : '#E5E7EB'
                    }}>
                      <TouchableOpacity
                        onPress={() => setActiveSmsTab('finance')}
                        style={{
                          flex: 1,
                          paddingVertical: 10,
                          paddingHorizontal: 12,
                          backgroundColor: activeSmsTab === 'finance'
                            ? (isDarkMode ? '#1F2937' : '#FFFFFF')
                            : 'transparent',
                          borderRadius: 10,
                          alignItems: 'center',
                          shadowColor: activeSmsTab === 'finance' ? '#000' : 'transparent',
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: activeSmsTab === 'finance' ? 0.1 : 0,
                          shadowRadius: 2,
                          elevation: activeSmsTab === 'finance' ? 2 : 0
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Icon
                            name="account-balance"
                            size={16}
                            color={activeSmsTab === 'finance' ? '#10B981' : colors.textSecondary}
                          />
                          <Text style={{
                            fontWeight: activeSmsTab === 'finance' ? '700' : '600',
                            fontSize: 13,
                            color: activeSmsTab === 'finance'
                              ? (isDarkMode ? '#FFFFFF' : '#0F172A')
                              : colors.textSecondary
                          }}>
                            Banking
                          </Text>
                          <View style={{
                            backgroundColor: activeSmsTab === 'finance'
                              ? (isDarkMode ? '#10B98125' : '#DCFCE7')
                              : (isDarkMode ? '#374151' : '#E5E7EB'),
                            paddingHorizontal: 7,
                            paddingVertical: 2,
                            borderRadius: 10
                          }}>
                            <Text style={{
                              fontSize: 11,
                              fontWeight: '700',
                              color: activeSmsTab === 'finance' ? '#10B981' : colors.textSecondary
                            }}>
                              {financeMsgs.length}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => setActiveSmsTab('other')}
                        style={{
                          flex: 1,
                          paddingVertical: 10,
                          paddingHorizontal: 12,
                          backgroundColor: activeSmsTab === 'other'
                            ? (isDarkMode ? '#1F2937' : '#FFFFFF')
                            : 'transparent',
                          borderRadius: 10,
                          alignItems: 'center',
                          shadowColor: activeSmsTab === 'other' ? '#000' : 'transparent',
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: activeSmsTab === 'other' ? 0.1 : 0,
                          shadowRadius: 2,
                          elevation: activeSmsTab === 'other' ? 2 : 0
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Icon
                            name="mail"
                            size={16}
                            color={activeSmsTab === 'other' ? '#6366F1' : colors.textSecondary}
                          />
                          <Text style={{
                            fontWeight: activeSmsTab === 'other' ? '700' : '600',
                            fontSize: 13,
                            color: activeSmsTab === 'other'
                              ? (isDarkMode ? '#FFFFFF' : '#0F172A')
                              : colors.textSecondary
                          }}>
                            Others
                          </Text>
                          <View style={{
                            backgroundColor: activeSmsTab === 'other'
                              ? (isDarkMode ? '#6366F125' : '#E0E7FF')
                              : (isDarkMode ? '#374151' : '#E5E7EB'),
                            paddingHorizontal: 7,
                            paddingVertical: 2,
                            borderRadius: 10
                          }}>
                            <Text style={{
                              fontSize: 11,
                              fontWeight: '700',
                              color: activeSmsTab === 'other' ? '#6366F1' : colors.textSecondary
                            }}>
                              {otherMsgs.length}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    </View>

                    {/* Messages List */}
                    <View style={{
                      backgroundColor: isDarkMode ? '#111827' : '#FFFFFF',
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: isDarkMode ? '#374151' : '#E5E7EB',
                      overflow: 'hidden'
                    }}>
                      <ScrollView
                        style={{ maxHeight: 280 }}
                        contentContainerStyle={{ padding: 8 }}
                        nestedScrollEnabled={true}
                      >
                        {displayedMsgs.length === 0 ? (
                          <View style={{
                            paddingVertical: 40,
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Icon
                              name={activeSmsTab === 'finance' ? 'account-balance' : 'mail-outline'}
                              size={48}
                              color={isDarkMode ? '#374151' : '#D1D5DB'}
                            />
                            <Text style={{
                              marginTop: 12,
                              fontSize: 13,
                              color: colors.textSecondary,
                              fontWeight: '500'
                            }}>
                              No {activeSmsTab === 'finance' ? 'banking' : 'other'} messages found
                            </Text>
                          </View>
                        ) : (
                          displayedMsgs.map((msg, idx) => (
                            <View key={idx} style={{
                              paddingVertical: 12,
                              paddingHorizontal: 12,
                              marginBottom: 6,
                              backgroundColor: isDarkMode ? '#1F2937' : '#F9FAFB',
                              borderRadius: 10,
                              borderLeftWidth: 3,
                              borderLeftColor: activeSmsTab === 'finance' ? '#10B981' : '#6366F1'
                            }}>
                              {/* Header Row */}
                              <View style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: 8
                              }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                                  <View style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: 4,
                                    backgroundColor: activeSmsTab === 'finance' ? '#10B981' : '#6366F1'
                                  }} />
                                  <Text style={{
                                    fontSize: 14,
                                    fontWeight: '700',
                                    color: colors.text,
                                    flex: 1
                                  }} numberOfLines={1}>
                                    {msg.address}
                                  </Text>
                                </View>
                                <View style={{
                                  backgroundColor: isDarkMode ? '#374151' : '#E5E7EB',
                                  paddingHorizontal: 8,
                                  paddingVertical: 4,
                                  borderRadius: 6
                                }}>
                                  <Text style={{
                                    fontSize: 10,
                                    color: colors.textSecondary,
                                    fontWeight: '600'
                                  }}>
                                    {new Date(msg.date).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric'
                                    })} • {new Date(msg.date).toLocaleTimeString('en-US', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      hour12: true
                                    })}
                                  </Text>
                                </View>
                              </View>

                              {/* Message Body */}
                              <Text style={{
                                fontSize: 12,
                                color: colors.textSecondary,
                                lineHeight: 18,
                                paddingLeft: 16
                              }} numberOfLines={2}>
                                {msg.body}
                              </Text>
                            </View>
                          ))
                        )}
                      </ScrollView>
                    </View>
                  </>
                );
              })()}
            </View>

            {!!(syncResult?.errors && syncResult.errors.length > 0) && (
              <View style={{
                marginVertical: 12,
                padding: 12,
                backgroundColor: isDarkMode ? '#7F1D1D' : '#FEE2E2',
                borderRadius: 12,
                borderLeftWidth: 4,
                borderLeftColor: '#EF4444'
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Icon name="error" size={18} color="#EF4444" />
                  <Text style={{ fontSize: 14, fontWeight: '700', color: isDarkMode ? '#FCA5A5' : '#DC2626' }}>
                    Parsing Errors ({syncResult.errors.length})
                  </Text>
                </View>
                <ScrollView style={{ maxHeight: 120 }}>
                  {syncResult.errors.map((err, idx) => (
                    <View key={idx} style={{
                      marginBottom: 8,
                      paddingBottom: 8,
                      borderBottomWidth: idx === syncResult.errors.length - 1 ? 0 : 1,
                      borderBottomColor: isDarkMode ? '#991B1B' : '#FECACA'
                    }}>
                      <Text style={{ fontSize: 12, color: isDarkMode ? '#FCA5A5' : '#B91C1C', fontWeight: '600' }}>
                        {err.error}
                      </Text>
                      {err.message && (
                        <Text style={{ fontSize: 11, color: isDarkMode ? '#FED7D7' : '#DC2626', marginTop: 4 }}>
                          {err.message}
                        </Text>
                      )}
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Action Buttons */}
            <View style={{ gap: 10, marginTop: 8 }}>
              <TouchableOpacity
                onPress={() => {
                  setShowSyncModal(false);
                  navigation.navigate('Transaction');
                }}
                style={{
                  paddingVertical: 14,
                  borderRadius: 12,
                  backgroundColor: '#8B5CF6',
                  shadowColor: '#8B5CF6',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 4
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Icon name="bar-chart" size={18} color="#FFFFFF" />
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>
                    View Analytics
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowSyncModal(false)}
                style={{
                  paddingVertical: 14,
                  borderRadius: 12,
                  backgroundColor: 'transparent',
                  borderWidth: 1.5,
                  borderColor: isDarkMode ? '#374151' : '#D1D5DB'
                }}
              >
                <Text style={{
                  fontSize: 15,
                  fontWeight: '600',
                  color: colors.text,
                  textAlign: 'center'
                }}>
                  Done
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },

  // Header Styles
  header: {
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    paddingBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    marginBottom: 28,
  },
  greetingContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  userName: {
    fontSize: 26,
    color: '#FFFFFF',
    fontWeight: 'bold',
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  profileInitials: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },

  // Balance Card Styles
  balanceCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginHorizontal: 24,
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(20px)',
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  balanceLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceLabelText: {
    fontSize: 14,
    color: '#CBD5E1',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  editButton: {
    marginLeft: 8,
    padding: 4,
  },
  eyeButton: {
    padding: 4,
  },
  balanceAmount: {
    fontSize: 42,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginBottom: 24,
    letterSpacing: -1,
  },
  hiddenBalanceContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
    marginTop: 8,
  },
  hiddenDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#94A3B8',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statInfo: {
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Quick Actions Styles
  quickActionsWrapper: {
    paddingHorizontal: 24,
    marginTop: -40,
    marginBottom: 20,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionCard: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  quickActionIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },

  // Alert Card Styles
  alertWrapper: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  alertCard: {
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  alertIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 17,
    color: '#92400E',
    fontWeight: 'bold',
    marginBottom: 6,
  },
  alertDescription: {
    fontSize: 13,
    color: '#78350F',
    lineHeight: 19,
  },
  alertAction: {
    marginLeft: 12,
  },

  // Card Styles
  card: {
    marginHorizontal: 24,
    marginBottom: 20,
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  editLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366F110',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  linkText: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '600',
  },
  seeAllLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  // Budget Styles
  budgetDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  budgetSpent: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  budgetTotal: {
    fontSize: 15,
    fontWeight: '500',
  },
  percentageBadge: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  percentageText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  progressWrapper: {
    marginBottom: 16,
  },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  budgetFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  budgetRemaining: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },

  // Categories Grid Styles
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  categoryCard: {
    width: '48%',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  categoryIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryName: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  categoryAmount: {
    fontSize: 17,
    fontWeight: 'bold',
    letterSpacing: -0.3,
  },

  // Goal Card Styles
  goalCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  goalEmojiContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,

    fontSize: 26,
  },
  goalDetails: {
    flex: 1,
  },
  goalName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  goalProgress: {
    fontSize: 13,
    fontWeight: '500',
  },
  goalPercentage: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },
  goalPercentageText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#6366F1',
  },
  goalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  goalRemaining: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  goalRemainingText: {
    fontSize: 13,
    fontWeight: '500',
  },
  goalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  goalButtonText: {
    fontSize: 13,
    color: '#6366F1',
    fontWeight: '600',
  },

  // Statement Button Styles
  statementWrapper: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  statementButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  statementGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  statementButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Transactions List Styles
  transactionsList: {
    gap: 0,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  lastTransaction: {
    borderBottomWidth: 0,
  },
  transactionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  transactionMeta: {
    fontSize: 12,
    fontWeight: '500',
  },
  transactionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  incomeAmount: {
    color: '#10B981',
  },
  expenseAmount: {
    color: '#EF4444',
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    marginTop: 16,
    fontWeight: '500',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 28,
    padding: 28,
    width: '88%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 12,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 14,
    marginBottom: 24,
    lineHeight: 20,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 2,
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonSecondary: {
    borderWidth: 2,
  },
  modalButtonPrimary: {
    backgroundColor: '#6366F1',
    flexDirection: 'row',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  modalButtonTextSecondary: {
    fontSize: 15,
    fontWeight: '600',
  },
  modalButtonTextPrimary: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },

  // Statement Modal Styles
  statementModal: {
    width: '92%',
    maxHeight: '85%',
    borderRadius: 32,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  statementLoading: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  statementLoadingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  statementLoadingDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  statementError: {
    alignItems: 'center',
  },
  statementErrorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  statementErrorDesc: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 20,
  },
  statementErrorButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 16,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  statementErrorButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  statementSuccess: {
    alignItems: 'center',
  },
  statementSuccessTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  statementMonth: {
    fontSize: 18,
    color: '#6366F1',
    fontWeight: '700',
    marginBottom: 20,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 8,
    marginBottom: 20,
    alignSelf: 'stretch',
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  statementStats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    gap: 16,
    alignSelf: 'stretch',
  },
  statementStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  statementStatLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statementStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  transactionTable: {
    marginBottom: 20,
    alignSelf: 'stretch',
  },
  tableTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  tableHeaderText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableBody: {
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    borderWidth: 1,
    borderTopWidth: 0,
    overflow: 'hidden',
    maxHeight: 250,
  },
  tableScroll: {
    maxHeight: 250,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  tableDateCell: {
    flex: 0.15,
    alignItems: 'flex-start',
  },
  tableDay: {
    fontSize: 13,
    fontWeight: '700',
  },
  tableMonth: {
    fontSize: 10,
    fontWeight: '500',
  },
  tableDescCell: {
    flex: 0.55,
    paddingRight: 8,
  },
  tableDesc: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  newBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  newBadgeText: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  tableAmountCell: {
    flex: 0.3,
    alignItems: 'flex-end',
  },
  tableAmount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  balancesSection: {
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    alignSelf: 'stretch',
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  balanceLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statementDoneButton: {
    borderRadius: 16,
    overflow: 'hidden',
    alignSelf: 'stretch',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  statementDoneGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  statementDoneText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  balanceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    gap: 12,
  },
  balanceVal: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  typeTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeTagText: {
    fontSize: 10,
    fontWeight: 'bold',
  },

  // Sync Modal Styles
  modalOverlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  syncModal: {
    maxHeight: '90%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  syncHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  syncIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  syncTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  syncSubtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  syncStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginVertical: 20,
  },
  syncStatCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  syncStatValue: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  syncStatLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  syncStatDivider: {
    width: 1,
    height: '100%',
  },
  syncErrorsTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  syncErrors: {
    marginVertical: 12,
  },
  syncErrorsList: {
    maxHeight: 120,
  },
  syncErrorItem: {
    marginBottom: 8,
    paddingBottom: 8,
  },
  syncErrorText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
  },
  syncErrorMessage: {
    fontSize: 11,
    marginTop: 4,
  },
  syncDoneButton: {
    paddingVertical: 14,
    borderRadius: 12,
  },
  syncDoneGradient: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncDoneText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  fab: {
    position: 'absolute',
    bottom: 80,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    elevation: 8,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    zIndex: 1000,
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default HomeScreen;