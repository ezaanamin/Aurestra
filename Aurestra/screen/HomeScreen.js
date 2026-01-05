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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import {
  fetchLatestTransactions,
  fetchTopSpendingCategories,
  fetchBudget,
  fetchUserAccounts,
  fetchCurrentSummary,
  fetchSavingsGoals,
  fetchCategories,
} from '../API/slice/API';
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

import UncategorizedTransactionsModal from '../components/UncategorizedTransactionsModal';
import SalaryInputModal from '../components/SalaryInputModal';
import { API_BASE_URL } from '../API_URL';

const HomeScreen = ({ navigation }) => {
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showUncategorizedModal, setShowUncategorizedModal] = useState(false);
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [pendingTransaction, setPendingTransaction] = useState(null);
  const dispatch = useDispatch();

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
  } = useSelector((state) => state.API);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    dispatch(fetchLatestTransactions(4));
    dispatch(fetchTopSpendingCategories());
    dispatch(fetchBudget());
    dispatch(fetchUserAccounts());
    dispatch(fetchCurrentSummary());
    dispatch(fetchSavingsGoals());
    dispatch(fetchCategories());
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
  const monthlyExpense = currentSummary?.total_expense || 0;
  const budgetTotal = budget?.total_budget || 0;
  const budgetSpent = monthlyExpense;
  const budgetPercentage = budgetTotal > 0 ? (budgetSpent / budgetTotal) * 100 : 0;
  const topGoal = savingsGoals?.[0] || null;
  const savingsPercentage = topGoal ? (topGoal.current_amount / topGoal.target_amount) * 100 : 0;
  const isBudgetSet = budgetStatus === 'succeeded' && budget && budget.total_budget > 0;

  const { currency, isDarkMode } = useSettings();

  const themeColors = {
    bg: isDarkMode ? '#0F172A' : '#F8FAFC',
    card: isDarkMode ? '#1E293B' : '#FFFFFF',
    text: isDarkMode ? '#F1F5F9' : '#1E293B',
    subText: isDarkMode ? '#94A3B8' : '#64748B',
    border: isDarkMode ? '#334155' : '#E2E8F0',
    headerGradient: isDarkMode ? ['#020617', '#1E293B'] : ['#1E293B', '#334155'],
    quickActionBg: isDarkMode ? '#1E293B' : '#FFFFFF',
    inputBg: isDarkMode ? '#334155' : '#F1F5F9',
  };

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
    // Check static map first
    if (CATEGORY_DETAILS_MAP[categoryName]) {
      return CATEGORY_DETAILS_MAP[categoryName];
    }
    // Check fetched categories
    const found = categories?.find(c => c.name === categoryName);
    if (found) {
      return { icon: found.icon, color: found.color };
    }
    // Fallback
    return CATEGORY_DETAILS_MAP['Miscellaneous'];
  };

  const getTransactionDetails = (transaction) => {
    const isIncome = transaction.type === 'credit';
    const categoryName = transaction.purpose || 'Other';
    const details = getCategoryDetails(categoryName);
    const icon = isIncome ? 'bank-transfer-in' : details.icon;
    return { type: transaction.type, icon, color: details.color };
  };

  useEffect(() => {
    if (transactionsStatus === 'succeeded' && latestTransactions.length > 0) {
      const uncategorized = latestTransactions.find(tx =>
        !tx.purpose || tx.purpose.toLowerCase() === 'uncategorized' || tx.purpose === 'Other'
      );
      if (uncategorized) {
        setPendingTransaction(uncategorized);
        setShowUncategorizedModal(true);
      }
    }
  }, [latestTransactions, transactionsStatus]);

  const handleCategorize = async (category, note) => {
    if (!pendingTransaction) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/transactions/${pendingTransaction.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purpose: category, notes: note }),
      });
      if (response.ok) {
        loadData();
        setShowUncategorizedModal(false);
        setPendingTransaction(null);
      }
    } catch (e) {
      console.error("Network error categorize:", e);
    }
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
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading your finances...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={themeColors.headerGradient[0]} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3B82F6']} tintColor={themeColors.text} />}
      >
        {/* Modern Header with Gradient */}
        <LinearGradient colors={themeColors.headerGradient} style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>
                Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}
              </Text>
              <Text style={styles.userName}>{userName}</Text>
            </View>
            <TouchableOpacity
              style={styles.profileButton}
              onPress={() => navigation.navigate('Profile')}
            >
              <Text style={styles.profileInitials}>{getInitials(userName)}</Text>
            </TouchableOpacity>
          </View>

          {/* Main Balance Card with Glassmorphism */}
          <View style={styles.balanceCard}>
            <View style={styles.balanceHeader}>
              <View style={styles.balanceLabel}>
                <Text style={styles.balanceLabelText}>Total Balance</Text>
                <Icon name="lock-outline" size={14} color="#CBD5E1" style={{ marginLeft: 6 }} />
              </View>
              <TouchableOpacity onPress={() => setBalanceVisible(!balanceVisible)}>
                <Icon name={balanceVisible ? 'eye-off' : 'eye'} size={22} color="#CBD5E1" />
              </TouchableOpacity>
            </View>

            {balanceVisible ? (
              <Text style={styles.balanceAmount}>{formatPKR(totalBalance)}</Text>
            ) : (
              <View style={styles.hiddenBalanceContainer}>
                {[...Array(8)].map((_, i) => <View key={i} style={styles.hiddenDot} />)}
              </View>
            )}

            {/* Income/Expense Row */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <View style={styles.statIconContainer}>
                  <Icon name="trending-up" size={16} color="#10B981" />
                </View>
                <View>
                  <Text style={styles.statLabel}>Income</Text>
                  <Text style={styles.statValue}>{balanceVisible ? formatPKR(monthlyIncome) : '••••'}</Text>
                </View>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statItem}>
                <View style={[styles.statIconContainer, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                  <Icon name="trending-down" size={16} color="#EF4444" />
                </View>
                <View>
                  <Text style={styles.statLabel}>Expenses</Text>
                  <Text style={styles.statValue}>{balanceVisible ? formatPKR(monthlyExpense) : '••••'}</Text>
                </View>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity style={[styles.quickActionCard, { backgroundColor: themeColors.quickActionBg, borderColor: themeColors.border }]} onPress={() => navigation.navigate('Saving')}>
            <View style={[styles.quickActionIcon, { backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.2)' : '#D1FAE5' }]}>
              <Icon name="piggy-bank" size={24} color="#10B981" />
            </View>
            <Text style={[styles.quickActionText, { color: themeColors.text }]}>Savings</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.quickActionCard, { backgroundColor: themeColors.quickActionBg, borderColor: themeColors.border }]} onPress={() => navigation.navigate('CurrencyConverter')}>
            <View style={[styles.quickActionIcon, { backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.2)' : '#FEF3C7' }]}>
              <Icon name="swap-horizontal" size={24} color="#F59E0B" />
            </View>
            <Text style={[styles.quickActionText, { color: themeColors.text }]}>Converter</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.quickActionCard, { backgroundColor: themeColors.quickActionBg, borderColor: themeColors.border }]} onPress={() => setShowSalaryModal(true)}>
            <View style={[styles.quickActionIcon, { backgroundColor: isDarkMode ? 'rgba(99, 102, 241, 0.2)' : '#E0E7FF' }]}>
              <Icon name="chart-bar" size={24} color="#6366F1" />
            </View>
            <Text style={[styles.quickActionText, { color: themeColors.text }]}>Budget</Text>
          </TouchableOpacity>
        </View>

        {/* Budget Alert - Matching TransactionScreen style */}
        {!isBudgetSet && budgetStatus !== 'loading' && (
          <LinearGradient
            colors={['#FEF3C7', '#FDE68A']}
            style={styles.alertCard}
          >
            <View style={styles.alertIconContainer}>
              <Icon name="alert-circle" size={28} color="#F59E0B" />
            </View>
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>Budget Not Set!</Text>
              <Text style={styles.alertDescription}>
                You're {getDaysPassedInMonth()} {getDaysPassedInMonth() === 1 ? 'day' : 'days'} into {getCurrentMonthYear()}. Set your monthly budget now to track spending effectively.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.alertButton}
              onPress={() => setShowSalaryModal(true)}
            >
              <Icon name="arrow-right" size={20} color="#F59E0B" />
            </TouchableOpacity>
          </LinearGradient>
        )}

        {/* Budget Progress - Matching BudgetScreen style */}
        {isBudgetSet && (
          <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={[styles.cardTitle, { color: themeColors.text }]}>Monthly Budget</Text>
                <Text style={[styles.cardSubtitle, { color: themeColors.subText }]}>{getCurrentMonthYear()}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowSalaryModal(true)}>
                <Text style={styles.linkText}>Edit</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.budgetProgress}>
              <View style={styles.budgetInfo}>
                <Text style={[styles.budgetSpent, { color: themeColors.text }]}>{formatPKR(budgetSpent)}</Text>
                <Text style={[styles.budgetTotal, { color: themeColors.subText }]}>of {formatPKR(budgetTotal)}</Text>
              </View>
              <View style={[styles.budgetPercentageContainer, { backgroundColor: isDarkMode ? '#334155' : '#F3F4F6' }]}>
                <Text style={[styles.budgetPercentage, { color: themeColors.text }]}>{budgetPercentage.toFixed(0)}%</Text>
              </View>
            </View>

            <View style={[styles.progressBarBackground, { backgroundColor: isDarkMode ? '#334155' : '#F3F4F6' }]}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${Math.min(budgetPercentage, 100)}%`,
                    backgroundColor: budgetPercentage > 90 ? '#EF4444' : budgetPercentage > 70 ? '#F59E0B' : '#10B981'
                  }
                ]}
              />
            </View>

            <Text style={[styles.budgetRemaining, { color: themeColors.subText }]}>
              {formatPKR(Math.max(budgetTotal - budgetSpent, 0))} remaining this month
            </Text>
          </View>
        )}

        {/* Spending Categories - Matching TransactionScreen style */}
        {topCategoriesStatus === 'succeeded' && Array.isArray(topCategories) && topCategories.length > 0 && (
          <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={[styles.cardTitle, { color: themeColors.text }]}>Top Spending</Text>
                <Text style={[styles.cardSubtitle, { color: themeColors.subText }]}>This month's breakdown</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('Transaction')}>
                <Text style={styles.linkText}>See All</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.categoriesGrid}>
              {topCategories.slice(0, 4).map((cat, idx) => {
                const details = CATEGORY_DETAILS_MAP[cat.category] || CATEGORY_DETAILS_MAP['Miscellaneous'];
                return (
                  <View key={idx} style={[styles.categoryItem, { backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC', borderColor: themeColors.border }]}>
                    <View style={[styles.categoryIconContainer, { backgroundColor: details.color + '20' }]}>
                      <Icon name={details.icon} size={24} color={details.color} />
                    </View>
                    <Text style={[styles.categoryName, { color: themeColors.subText }]} numberOfLines={1}>{cat.category}</Text>
                    <Text style={[styles.categoryAmount, { color: themeColors.text }]}>{formatPKR(cat.total_spent)}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Savings Goal - Matching CategoryScreen style */}
        {goalsStatus === 'succeeded' && topGoal && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardTitle}>Savings Goal</Text>
                <Text style={styles.cardSubtitle}>Primary goal progress</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('Saving')}>
                <Text style={styles.linkText}>View All</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.savingsGoal}>
              <View style={styles.goalHeader}>
                <View style={styles.goalEmojiWrapper}>
                  <Text style={styles.goalEmoji}>{topGoal.emoji}</Text>
                </View>
                <View style={styles.goalInfo}>
                  <Text style={styles.goalName}>{topGoal.name}</Text>
                  <Text style={styles.goalProgress}>
                    {formatPKR(topGoal.current_amount)} of {formatPKR(topGoal.target_amount)}
                  </Text>
                </View>
                <View style={styles.goalPercentageBadge}>
                  <Text style={styles.goalPercentageText}>{savingsPercentage.toFixed(0)}%</Text>
                </View>
              </View>

              <View style={styles.progressBarBackground}>
                <View
                  style={[styles.progressBarFill, { width: `${Math.min(savingsPercentage, 100)}%`, backgroundColor: '#10B981' }]}
                />
              </View>

              <View style={styles.goalFooter}>
                <View style={styles.goalRemainingInfo}>
                  <Icon name="flag-checkered" size={16} color="#64748B" />
                  <Text style={styles.goalRemaining}>
                    {formatPKR(topGoal.remaining)} to go
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.goalAddButton}
                  onPress={() => navigation.navigate('Saving')}
                >
                  <Icon name="plus-circle" size={18} color="#3B82F6" />
                  <Text style={styles.goalAddButtonText}>Add Funds</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Recent Transactions - Matching TransactionScreen style */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Recent Transactions</Text>
              <Text style={styles.cardSubtitle}>Latest activity</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Transaction')}>
              <Text style={styles.linkText}>See All</Text>
            </TouchableOpacity>
          </View>

          {transactionsStatus === 'loading' ? (
            <ActivityIndicator size="small" color="#3B82F6" style={{ marginVertical: 20 }} />
          ) : transactionsStatus === 'succeeded' && latestTransactions.length > 0 ? (
            <View style={styles.transactionsList}>
              {latestTransactions.map((txn, index) => {
                const { type, icon } = getTransactionDetails(txn);
                const isIncome = type === 'credit';
                const details = CATEGORY_DETAILS_MAP[txn.purpose] || CATEGORY_DETAILS_MAP['Miscellaneous'];

                return (
                  <TouchableOpacity
                    key={txn.id}
                    style={[styles.transactionItem, index === latestTransactions.length - 1 && styles.lastTransaction]}
                  >
                    <View style={[styles.transactionIcon, { backgroundColor: details.color + '20' }]}>
                      <Icon name={icon} size={24} color={details.color} />
                    </View>

                    <View style={styles.transactionDetails}>
                      <Text style={styles.transactionName} numberOfLines={1}>
                        {txn.sender || txn.receiver || 'Transaction'}
                      </Text>
                      <Text style={styles.transactionMeta}>
                        {txn.purpose || 'Uncategorized'} • {new Date(txn.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </Text>
                    </View>

                    <View style={styles.transactionRight}>
                      <Text style={[styles.transactionAmount, isIncome ? styles.incomeAmount : styles.expenseAmount]}>
                        {isIncome ? '+' : '-'}{formatPKR(txn.amount)}
                      </Text>
                      <Icon
                        name={isIncome ? 'arrow-bottom-left' : 'arrow-top-right'}
                        size={16}
                        color={isIncome ? '#10B981' : '#64748B'}
                      />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Icon name="wallet-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyText}>No recent transactions</Text>
            </View>
          )}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      <UncategorizedTransactionsModal
        visible={showUncategorizedModal}
        transaction={pendingTransaction}
        onClose={handleCategorize}
      />

      {showSalaryModal && (
        <SalaryInputModal
          visible={showSalaryModal}
          onClose={() => setShowSalaryModal(false)}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 16,
    color: '#64748B',
    fontSize: 16,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  header: {
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingBottom: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    marginBottom: 24,
  },
  greeting: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  profileButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  profileInitials: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  balanceCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  balanceLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceLabelText: {
    fontSize: 14,
    color: '#CBD5E1',
    fontWeight: '500',
  },
  balanceAmount: {
    fontSize: 40,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  hiddenBalanceContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
    marginTop: 8,
  },
  hiddenDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#94A3B8',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 16,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 16,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 24,
    gap: 12,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    color: '#1E293B',
    fontWeight: '600',
  },
  alertCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  alertIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    color: '#92400E',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  alertDescription: {
    fontSize: 13,
    color: '#78350F',
    lineHeight: 18,
  },
  alertButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    color: '#1E293B',
    fontWeight: 'bold',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#64748B',
  },
  linkText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
  budgetProgress: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  budgetInfo: {
    flex: 1,
  },
  budgetSpent: {
    fontSize: 28,
    color: '#1E293B',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  budgetTotal: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  budgetPercentageContainer: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  budgetPercentage: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: 'bold',
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  budgetRemaining: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  categoryItem: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryName: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 4,
  },
  categoryAmount: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: 'bold',
  },
  savingsGoal: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalEmojiWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  goalEmoji: {
    fontSize: 24,
  },
  goalInfo: {
    flex: 1,
  },
  goalName: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '600',
    marginBottom: 4,
  },
  goalProgress: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  goalPercentageBadge: {
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  goalPercentageText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  goalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalRemainingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  goalRemaining: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  goalAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  goalAddButtonText: {
    fontSize: 13,
    color: '#3B82F6',
    fontWeight: '600',
  },
  transactionsList: {
    gap: 0,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  lastTransaction: {
    borderBottomWidth: 0,
  },
  transactionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  transactionMeta: {
    fontSize: 13,
    color: '#64748B',
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
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 12,
  },
});

export default HomeScreen;