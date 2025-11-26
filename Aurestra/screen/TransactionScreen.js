import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  Text,
  ScrollView,
  RefreshControl,
  Dimensions,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { PieChart, LineChart } from 'react-native-chart-kit';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { fetchFourMonthHistory } from '../API/slice/API';
import LinearGradient from 'react-native-linear-gradient';

const { width } = Dimensions.get('window');
const chartWidth = width - 40;

const TransactionScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const historyData = useSelector((state) => state.API.fourMonthHistory);
  const historyStatus = useSelector((state) => state.API.historyStatus);

  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'week', 'month', 'year'
  const [selectedPeriod, setSelectedPeriod] = useState('This Month');

  useEffect(() => {
    if (historyStatus === 'idle') dispatch(fetchFourMonthHistory());
  }, [dispatch, historyStatus]);

  const onRefresh = () => {
    setRefreshing(true);
    dispatch(fetchFourMonthHistory()).finally(() => setRefreshing(false));
  };

  // Calculate trends
  const current = historyData?.[0]?.actual?.expense || 0;
  const prev = historyData?.[1]?.actual?.expense || 1;
  const trend = Math.round(((current - prev) / prev) * 100);
  const isPositiveTrend = trend <= 0;

  // Transaction data
  const transactions = [
    { id: 1, title: 'Groceries', category: 'Food', amount: -5000, date: 'Today, 2:30 PM', icon: 'cart', color: '#10B981' },
    { id: 2, title: 'Salary', category: 'Income', amount: 100000, date: 'Nov 22, 9:00 AM', icon: 'bank', color: '#3B82F6' },
    { id: 3, title: 'Netflix', category: 'Entertainment', amount: -1500, date: 'Nov 20, 6:15 PM', icon: 'netflix', color: '#EC4899' },
    { id: 4, title: 'Uber', category: 'Transport', amount: -800, date: 'Nov 19, 11:45 AM', icon: 'car', color: '#F59E0B' },
    { id: 5, title: 'Electricity', category: 'Bills', amount: -8000, date: 'Nov 18, 3:20 PM', icon: 'lightning-bolt', color: '#8B5CF6' },
  ];

  // Pie chart data
  const pieData = [
    { name: 'Food', amount: 15000, color: '#10B981', legendFontColor: '#64748B', legendFontSize: 12 },
    { name: 'Bills', amount: 12000, color: '#3B82F6', legendFontColor: '#64748B', legendFontSize: 12 },
    { name: 'Transport', amount: 8000, color: '#F59E0B', legendFontColor: '#64748B', legendFontSize: 12 },
    { name: 'Shopping', amount: 6000, color: '#8B5CF6', legendFontColor: '#64748B', legendFontSize: 12 },
    { name: 'Entertainment', amount: 4000, color: '#EC4899', legendFontColor: '#64748B', legendFontSize: 12 },
  ];

  const totalSpent = pieData.reduce((sum, item) => sum + item.amount, 0);

  // Line chart data for spending trend
  const lineChartData = {
    labels: ['Aug', 'Sep', 'Oct', 'Nov'],
    datasets: [
      {
        data: [28000, 32000, 29000, 35000],
        color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
        strokeWidth: 3,
      },
    ],
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(amount));
  };

  const filters = [
    { id: 'all', label: 'All Time', icon: 'calendar' },
    { id: 'week', label: 'Week', icon: 'calendar-week' },
    { id: 'month', label: 'Month', icon: 'calendar-month' },
    { id: 'year', label: 'Year', icon: 'calendar-range' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E293B" />

      {/* Modern Header */}
      <LinearGradient colors={['#1E293B', '#334155']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Analytics</Text>
            <Text style={styles.headerSubtitle}>Track your spending patterns</Text>
          </View>
          <TouchableOpacity style={styles.headerIconButton}>
            <Icon name="filter-variant" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Stats Overview Card */}
        <View style={styles.statsCard}>
          <View style={styles.statsHeader}>
            <Text style={styles.statsLabel}>Total Spending</Text>
            <View style={[styles.trendBadge, isPositiveTrend ? styles.trendBadgeGood : styles.trendBadgeBad]}>
              <Icon 
                name={isPositiveTrend ? 'trending-down' : 'trending-up'} 
                size={14} 
                color={isPositiveTrend ? '#10B981' : '#EF4444'} 
              />
              <Text style={[styles.trendText, isPositiveTrend ? styles.trendTextGood : styles.trendTextBad]}>
                {Math.abs(trend)}%
              </Text>
            </View>
          </View>
          <Text style={styles.statsAmount}>{formatCurrency(totalSpent)}</Text>
          <Text style={styles.statsSubtext}>
            {isPositiveTrend ? '🎉 Great job! Spending is down' : '⚠️ Spending increased from last month'}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3B82F6']} />
        }
      >
        {/* Period Filter */}
        <View style={styles.filterSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContainer}>
            {filters.map((filter) => (
              <TouchableOpacity
                key={filter.id}
                style={[styles.filterButton, activeFilter === filter.id && styles.filterButtonActive]}
                onPress={() => setActiveFilter(filter.id)}
              >
                <Icon 
                  name={filter.icon} 
                  size={18} 
                  color={activeFilter === filter.id ? '#FFFFFF' : '#64748B'} 
                />
                <Text style={[styles.filterText, activeFilter === filter.id && styles.filterTextActive]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Spending Trend Chart */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View>
              <Text style={styles.chartTitle}>Spending Trend</Text>
              <Text style={styles.chartSubtitle}>Last 4 months overview</Text>
            </View>
            <TouchableOpacity style={styles.chartMenuButton}>
              <Icon name="dots-horizontal" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <LineChart
            data={lineChartData}
            width={chartWidth - 40}
            height={200}
            chartConfig={{
              backgroundColor: '#FFFFFF',
              backgroundGradientFrom: '#FFFFFF',
              backgroundGradientTo: '#FFFFFF',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
              style: {
                borderRadius: 16,
              },
              propsForDots: {
                r: '6',
                strokeWidth: '2',
                stroke: '#3B82F6',
              },
              propsForBackgroundLines: {
                strokeDasharray: '',
                stroke: '#E2E8F0',
                strokeWidth: 1,
              },
            }}
            bezier
            style={styles.lineChart}
            withVerticalLines={false}
            withHorizontalLines={true}
            withInnerLines={true}
            withOuterLines={false}
            withVerticalLabels={true}
            withHorizontalLabels={true}
          />
        </View>

        {/* Category Breakdown */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View>
              <Text style={styles.chartTitle}>Spending by Category</Text>
              <Text style={styles.chartSubtitle}>This month's breakdown</Text>
            </View>
            <TouchableOpacity>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          <PieChart
            data={pieData.map((item) => ({
              name: item.name,
              population: item.amount,
              color: item.color,
              legendFontColor: item.legendFontColor,
              legendFontSize: item.legendFontSize,
            }))}
            width={chartWidth - 40}
            height={200}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            chartConfig={{
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            }}
            style={styles.pieChart}
          />

          {/* Category List */}
          <View style={styles.categoryList}>
            {pieData.map((item, index) => {
              const percentage = ((item.amount / totalSpent) * 100).toFixed(1);
              return (
                <TouchableOpacity key={index} style={styles.categoryItem}>
                  <View style={styles.categoryLeft}>
                    <View style={[styles.categoryDot, { backgroundColor: item.color }]} />
                    <View style={styles.categoryInfo}>
                      <Text style={styles.categoryName}>{item.name}</Text>
                      <Text style={styles.categoryPercentage}>{percentage}% of total</Text>
                    </View>
                  </View>
                  <View style={styles.categoryRight}>
                    <Text style={styles.categoryAmount}>{formatCurrency(item.amount)}</Text>
                    <Icon name="chevron-right" size={20} color="#CBD5E1" />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Recent Transactions */}
        <View style={styles.transactionsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.transactionList}>
            {transactions.map((transaction, index) => (
              <TouchableOpacity
                key={transaction.id}
                style={[
                  styles.transactionItem,
                  index === transactions.length - 1 && styles.transactionItemLast
                ]}
              >
                <View style={[styles.transactionIcon, { backgroundColor: transaction.color + '20' }]}>
                  <Icon name={transaction.icon} size={24} color={transaction.color} />
                </View>
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionTitle}>{transaction.title}</Text>
                  <Text style={styles.transactionCategory}>
                    {transaction.category} • {transaction.date}
                  </Text>
                </View>
                <View style={styles.transactionRight}>
                  <Text
                    style={[
                      styles.transactionAmount,
                      transaction.amount > 0 ? styles.transactionAmountIncome : styles.transactionAmountExpense,
                    ]}
                  >
                    {transaction.amount > 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                  </Text>
                  <Icon
                    name={transaction.amount > 0 ? 'arrow-bottom-left' : 'arrow-top-right'}
                    size={16}
                    color={transaction.amount > 0 ? '#10B981' : '#64748B'}
                  />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Insights Card */}
        <LinearGradient
          colors={isPositiveTrend ? ['#D1FAE5', '#A7F3D0'] : ['#FEE2E2', '#FECACA']}
          style={styles.insightCard}
        >
          <View style={styles.insightIconWrapper}>
            <Icon
              name={isPositiveTrend ? 'lightbulb-on' : 'alert-circle'}
              size={28}
              color={isPositiveTrend ? '#059669' : '#DC2626'}
            />
          </View>
          <View style={styles.insightContent}>
            <Text style={[styles.insightTitle, { color: isPositiveTrend ? '#065F46' : '#991B1B' }]}>
              {isPositiveTrend ? 'Smart Spending!' : 'Budget Alert'}
            </Text>
            <Text style={[styles.insightText, { color: isPositiveTrend ? '#047857' : '#B91C1C' }]}>
              {isPositiveTrend
                ? `You've reduced spending by ${Math.abs(trend)}% compared to last month. Keep it up!`
                : `Your spending increased by ${trend}% this month. Consider reviewing your budget.`}
            </Text>
          </View>
        </LinearGradient>
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
    paddingBottom: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  headerIconButton: {
    padding: 8,
  },
  statsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statsLabel: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  trendBadgeGood: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  trendBadgeBad: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  trendText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  trendTextGood: {
    color: '#6EE7B7',
  },
  trendTextBad: {
    color: '#FCA5A5',
  },
  statsAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  statsSubtext: {
    fontSize: 13,
    color: '#CBD5E1',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  filterSection: {
    paddingVertical: 16,
  },
  filterContainer: {
    paddingHorizontal: 20,
    gap: 10,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  chartSubtitle: {
    fontSize: 13,
    color: '#64748B',
  },
  chartMenuButton: {
    padding: 4,
  },
  viewAllText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
  lineChart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  pieChart: {
    marginVertical: 8,
  },
  categoryList: {
    marginTop: 16,
    gap: 12,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  categoryPercentage: {
    fontSize: 12,
    color: '#64748B',
  },
  categoryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryAmount: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  transactionsSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  transactionList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  transactionItemLast: {
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
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
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
    fontSize: 15,
    fontWeight: 'bold',
  },
  transactionAmountIncome: {
    color: '#10B981',
  },
  transactionAmountExpense: {
    color: '#1E293B',
  },
  insightCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  insightIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  insightText: {
    fontSize: 14,
    lineHeight: 20,
  },
});

export default TransactionScreen;