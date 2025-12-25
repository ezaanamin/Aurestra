import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import {
  fetchLatestTransactions,
  fetchTopSpendingCategories,
  fetchBudget,
} from "../API/slice/API"
import { useDispatch, useSelector } from 'react-redux';
import BottomBar from '../components/BottomBar';

const { width } = Dimensions.get('window');

const CATEGORY_DETAILS_MAP = {
  "Food & Snacks": { icon: 'food', color: '#FF6B6B', total_budget: 15000 },
  "Ride / Transport": { icon: 'car', color: '#4ECDC4', total_budget: 10000 },
  "Subscription (Google one )": { icon: 'credit-card-settings-outline', color: '#A78BFA', total_budget: 500 },
  "Miscellaneous": { icon: 'cash', color: '#3B82F6', total_budget: 3000 },
  Income: { icon: 'bank-transfer-in', color: '#10B981', total_budget: 0 },
  Other: { icon: 'cash', color: '#64748B', total_budget: 5000 },
};

const HomeScreen = ({ navigation }) => {
  const [balanceVisible, setBalanceVisible] = useState(true);
  const dispatch = useDispatch();

  // --- REDUX STATE INTEGRATION ---
  const { 
    latestTransactions, 
    topCategories,
    transactionsStatus, 
    topCategoriesStatus,
    budget,
    budgetStatus,
  } = useSelector((state) => state.API);

  useEffect(() => {
    dispatch(fetchLatestTransactions());
    dispatch(fetchTopSpendingCategories());
    dispatch(fetchBudget());
  }, [dispatch]);

  // Calculate days since month started
  const getDaysPassedInMonth = () => {
    const today = new Date();
    return today.getDate();
  };

  // Check if budget is set
  const isBudgetSet = budgetStatus === 'succeeded' && budget && budget.total_budget && budget.total_budget > 0;

  // --- Bank Accounts & Wallets Data ---
  const accounts = [
    { id: 1, name: 'HBL Account', icon: 'bank', balance: 45000, color: '#10B981' },
    { id: 3, name: 'JazzCash', icon: 'wallet', balance: 8500, color: '#F59E0B' },
    { id: 4, name: 'Easypaisa', icon: 'wallet-outline', balance: 6500, color: '#EF4444' },
  ];

  // Calculate total balance from all accounts
  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);

  const monthlyIncome = 120000;
  const monthlyExpense = 35000;
  const monthlySavings = 85000;

  // Budget Data (Still fake, as overall budget fetching is not implemented yet)
  const budgetTotal = 50000;
  const budgetSpent = 35000;
  const budgetPercentage = (budgetSpent / budgetTotal) * 100;

  // Savings Goal Data (Still fake)
  const savingsGoal = 500000;
  const currentSavings = 320000;
  const savingsPercentage = (currentSavings / savingsGoal) * 100;

  const formatPKR = (amount) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(amount));
  };

  const isScreenActive = (screenName) => {
    return screenName === 'Home';
  };

  // Helper function to determine icon and type for transactions
  const getTransactionDetails = (transaction) => {
      // Determine transaction type and icon based on amount sign
      const isIncome = transaction.amount >= 0;
      const type = isIncome ? 'income' : 'expense';

      // Use the category map for a slightly better icon guess
      const categoryName = transaction.purpose || 'Other';
      const mapDetails = CATEGORY_DETAILS_MAP[categoryName] || CATEGORY_DETAILS_MAP['Other'];
      const icon = isIncome ? 'bank-transfer-in' : mapDetails.icon;

      return { type, icon };
  };

  const getCurrentMonthYear = () => {
    return new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E293B" />
      
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header Section with Balance */}
        <LinearGradient
          colors={['#1E293B', '#334155', '#1E293B']}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.welcomeText}>Welcome back</Text>
              <Text style={styles.userName}>Muhammad Ali</Text>
            </View>
            <View style={styles.profileCircle}>
              <Text style={styles.profileInitials}>MA</Text>
            </View>
          </View>

          {/* Balance Card with Glassmorphism Effect */}
          <View style={styles.balanceCard}>
            <View style={styles.balanceHeader}>
              <View style={styles.balanceLabel}>
                <Text style={styles.balanceLabelText}>Total Balance</Text>
                <Icon name="lock-outline" size={14} color="#CBD5E1" style={{ marginLeft: 6 }} />
              </View>
              <TouchableOpacity onPress={() => setBalanceVisible(!balanceVisible)}>
                <Icon 
                  name={balanceVisible ? 'eye-off' : 'eye'} 
                  size={22} 
                  color="#CBD5E1" 
                />
              </TouchableOpacity>
            </View>

            {balanceVisible ? (
              <>
                <Text style={styles.balanceAmount}>{formatPKR(totalBalance)}</Text>
                
                {/* Individual Accounts Breakdown */}
                <View style={styles.accountsBreakdown}>
                  {accounts.map((account) => (
                    <View key={account.id} style={styles.accountItem}>
                      <View style={styles.accountLeft}>
                        <View style={[styles.accountIconWrapper, { backgroundColor: account.color + '20' }]}>
                          <Icon name={account.icon} size={14} color={account.color} />
                        </View>
                        <Text style={styles.accountName}>{account.name}</Text>
                      </View>
                      <Text style={styles.accountBalance}>{formatPKR(account.balance)}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <View style={styles.hiddenBalance}>
                {[...Array(6)].map((_, i) => (
                  <View key={i} style={styles.hiddenDot} />
                ))}
              </View>
            )}

            {/* Income and Expense Pills */}
            <View style={styles.incomExpenseRow}>
              <View style={[styles.miniCard, styles.incomeCard]}>
                <View style={styles.miniCardHeader}>
                  <Icon name="trending-up" size={16} color="#6EE7B7" />
                  <Text style={styles.miniCardLabel}>Income</Text>
                </View>
                <Text style={styles.miniCardAmount}>{formatPKR(monthlyIncome)}</Text>
              </View>
              
              <View style={[styles.miniCard, styles.expenseCard]}>
                <View style={styles.miniCardHeader}>
                  <Icon name="trending-down" size={16} color="#FCA5A5" />
                  <Text style={styles.miniCardLabel}>Expenses</Text>
                </View>
                <Text style={styles.miniCardAmount}>{formatPKR(monthlyExpense)}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Main Content */}
        <View style={styles.content}>
          {/* Budget Warning Banner */}
          {!isBudgetSet && budgetStatus !== 'loading' && (
            <View style={styles.warningBanner}>
              <LinearGradient
                colors={['#FEF3C7', '#FDE68A']}
                style={styles.warningGradient}
              >
                <View style={styles.warningHeader}>
                  <View style={styles.warningIconContainer}>
                    <Icon name="alert-circle" size={28} color="#F59E0B" />
                  </View>
                  <View style={styles.warningTextContainer}>
                    <Text style={styles.warningTitle}>Budget Not Set!</Text>
                    <Text style={styles.warningSubtitle}>
                      You're {getDaysPassedInMonth()} {getDaysPassedInMonth() === 1 ? 'day' : 'days'} into {getCurrentMonthYear()}
                    </Text>
                  </View>
                </View>
                
                <Text style={styles.warningDescription}>
                  Set your monthly budget now to track spending effectively and stay on top of your finances this month.
                </Text>
                
                <TouchableOpacity
                  style={styles.warningButton}
                  onPress={() => navigation.navigate('Budget')}
                >
                  <Icon name="plus-circle" size={18} color="#FFFFFF" />
                  <Text style={styles.warningButtonText}>Set Budget Now</Text>
                  <Icon name="arrow-right" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </LinearGradient>
            </View>
          )}

          {/* Monthly Budget Card - Only show if budget is set */}
          {isBudgetSet && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Monthly Budget</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Budget')}>
                  <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
              </View>
              
              <LinearGradient
                colors={['#F59E0B', '#EA580C']}
                style={styles.budgetCard}
              >
                <View style={styles.budgetHeader}>
                  <View>
                    <Text style={styles.budgetLabel}>Total Spent</Text>
                    <Text style={styles.budgetAmount}>{formatPKR(budgetSpent)}</Text>
                    <Text style={styles.budgetSubtext}>of {formatPKR(budgetTotal)}</Text>
                  </View>
                  <View style={styles.percentageBadge}>
                    <Text style={styles.percentageText}>{budgetPercentage.toFixed(0)}%</Text>
                  </View>
                </View>
                
                <View style={styles.progressBarContainer}>
                  <View style={[styles.progressBar, { width: `${budgetPercentage}%` }]} />
                </View>
                <Text style={styles.budgetRemaining}>{formatPKR(budgetTotal - budgetSpent)} remaining</Text>
              </LinearGradient>
            </>
          )}

          {/* Category Breakdown */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Top Spending Categories</Text>
          </View>
          <View style={styles.categoryGrid}>
            {topCategoriesStatus === 'loading' && (
              <ActivityIndicator size="large" color="#3B82F6" style={{ width: '100%' }} />
            )}
            {topCategoriesStatus === 'succeeded' && Array.isArray(topCategories) && topCategories.length > 0 ? (
              topCategories.map((cat, idx) => {
                const details = CATEGORY_DETAILS_MAP[cat.category] || CATEGORY_DETAILS_MAP['Other'];
                const categoryName = cat.category; 
                const iconName = details.icon || 'cash';
                const colorCode = details.color || '#3B82F6';
                const budgetAmount = details.total_budget || 1; 
                const rawPercentage = (cat.total_spent / budgetAmount) * 100;
                const displayPercentage = Math.min(Math.max(0, rawPercentage), 100);

                return (
                  <View key={idx} style={styles.categoryCard}>
                    <View style={[styles.categoryIcon, { backgroundColor: colorCode + '20' }]}>
                      <Icon name={iconName} size={24} color={colorCode} />
                    </View>
                    <Text style={styles.categoryName}>{categoryName}</Text>
                    <Text style={styles.categoryAmount}>{formatPKR(cat.total_spent)}</Text>
                    <View style={styles.categoryProgressBg}>
                      <View 
                        style={[
                          styles.categoryProgress, 
                          { width: `${displayPercentage}%`, backgroundColor: colorCode }
                        ]} 
                      />
                    </View>
                    <Text style={styles.categoryBudget}>
                      {details.total_budget && details.total_budget > 1 ? `of ${formatPKR(details.total_budget)}` : 'No Budget Set'}
                    </Text>
                  </View>
                );
              })
            ) : (
                topCategoriesStatus !== 'loading' && (
                    <Text style={styles.noDataText}>No spending categories found for this month.</Text>
                )
            )}
          </View>
          
          {/* Savings Goal */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Savings Goal</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Saving')}>
              <Text style={styles.viewAllText}>Manage</Text>
            </TouchableOpacity>
          </View>
          
          <LinearGradient
            colors={['#10B981', '#059669']}
            style={styles.savingsCard}
          >
            <View style={styles.budgetHeader}>
              <View>
                <Text style={styles.budgetLabel}>Emergency Fund 🎯</Text>
                <Text style={styles.budgetAmount}>{formatPKR(currentSavings)}</Text>
                <Text style={styles.budgetSubtext}>of {formatPKR(savingsGoal)} goal</Text>
              </View>
              <View style={styles.percentageBadge}>
                <Text style={styles.percentageText}>{savingsPercentage.toFixed(0)}%</Text>
              </View>
            </View>
            
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${savingsPercentage}%` }]} />
            </View>
            <Text style={styles.budgetRemaining}>{formatPKR(savingsGoal - currentSavings)} to go!</Text>
          </LinearGradient>

          {/* Recent Transactions */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Transaction')}>
              <Text style={styles.viewAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.transactionList}>
            {transactionsStatus === 'loading' && (
              <View style={{ padding: 20 }}>
                <ActivityIndicator size="small" color="#3B82F6" />
                <Text style={styles.loadingText}>Fetching transactions...</Text>
              </View>
            )}
            {transactionsStatus === 'succeeded' && latestTransactions.length > 0 ? (
                latestTransactions.map((txn) => {
                  const { type, icon } = getTransactionDetails(txn);

                  return (
                    <View key={txn.id} style={styles.transactionItem}>
                      <View style={styles.transactionLeft}>
                        <View style={styles.transactionIcon}>
                          <Icon name={icon} size={24} color="#64748B" />
                        </View>
                        <View>
                          <Text style={styles.transactionTitle}>{txn.sender}</Text>
                          <Text style={styles.transactionCategory}>
                            {txn.purpose || 'Uncategorized'} • {new Date(txn.date).toLocaleDateString()}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.transactionRight}>
                        <Text style={[
                          styles.transactionAmount,
                          styles.expenseText
                        ]}>
                          {type === 'income' ? '+' : '-'}{formatPKR(txn.amount)}
                        </Text>
                        <Icon 
                          name={'arrow-top-right'} 
                          size={18} 
                          color={'#64748B'} 
                        />
                      </View>
                    </View>
                  )
                })
            ) : (
              transactionsStatus !== 'loading' && (
                <View style={{padding: 16}}>
                    <Text style={styles.noDataText}>No recent transactions found.</Text>
                </View>
              )
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  welcomeText: {
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
  profileCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitials: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  balanceCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
    fontSize: 48,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginBottom: 20,
  },
  accountsBreakdown: {
    marginTop: 8,
    gap: 10,
  },
  accountItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  accountLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  accountIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountName: {
    fontSize: 13,
    color: '#E5E7EB',
    fontWeight: '600',
  },
  accountBalance: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  hiddenBalance: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 8,
  },
  hiddenDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#94A3B8',
  },
  incomExpenseRow: {
    flexDirection: 'row',
    gap: 12,
  },
  miniCard: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
  },
  incomeCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: 'rgba(110, 231, 183, 0.3)',
  },
  expenseCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: 'rgba(252, 165, 165, 0.3)',
  },
  miniCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  miniCardLabel: {
    fontSize: 12,
    color: '#E5E7EB',
    fontWeight: '500',
  },
  miniCardAmount: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  // Budget Warning Banner Styles
  warningBanner: {
    marginBottom: 20,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  warningGradient: {
    padding: 20,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  warningIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  warningTextContainer: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#92400E',
    marginBottom: 2,
  },
  warningSubtitle: {
    fontSize: 13,
    color: '#B45309',
    fontWeight: '600',
  },
  warningDescription: {
    fontSize: 14,
    color: '#78350F',
    lineHeight: 20,
    marginBottom: 16,
  },
  warningButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F59E0B',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    gap: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  warningButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    color: '#1E293B',
    fontWeight: 'bold',
  },
  viewAllText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
  budgetCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
  },
  savingsCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  budgetLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    marginBottom: 8,
  },
  budgetAmount: {
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  budgetSubtext: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  percentageBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  percentageText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
  },
  budgetRemaining: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20,
  },
  categoryCard: {
    width: (width - 52) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryName: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '600',
    marginBottom: 4,
  },
  categoryAmount: {
    fontSize: 18,
    color: '#1E293B',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  categoryProgressBg: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  categoryProgress: {
    height: '100%',
    borderRadius: 3,
  },
  categoryBudget: {
    fontSize: 12,
    color: '#64748B',
  },
  transactionList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  transactionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionTitle: {
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  transactionCategory: {
    fontSize: 13,
    color: '#64748B',
  },
  transactionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  incomeText: {
    color: '#10B981',
  },
  expenseText: {
    color: '#1E293B',
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  navItem: {
    alignItems: 'center',
    gap: 4,
  },
  navIconWrapper: {
    padding: 8,
    borderRadius: 16,
  },
  navIconActive: {
    backgroundColor: '#3B82F6',
  },
  navLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  navLabelActive: {
    color: '#3B82F6',
  },
  loadingText: {
    marginTop: 8,
    textAlign: 'center',
    color: '#64748B'
  },
  noDataText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    padding: 12,
    width: '100%',
  }
});

export default HomeScreen;