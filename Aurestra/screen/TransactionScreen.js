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
    ActivityIndicator,
    Modal
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useSettings } from '../context/SettingsContext';
import { PieChart, LineChart } from 'react-native-chart-kit';
import Ionicons from 'react-native-vector-icons/Ionicons'; // Switched to Ionicons
import MCIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
    fetchTrendHistory,
    fetchLatestTransactions,
    fetchTopSpendingCategories,
    updateTransaction,
    fetchCategories
} from '../API/slice/API';
import LinearGradient from 'react-native-linear-gradient';

const { width } = Dimensions.get('window');
const chartWidth = width - 40;

const CATEGORY_DETAILS_MAP = {
    "Food & Snacks": { icon: 'fast-food', color: '#FF6B6B' },
    "Ride / Transport": { icon: 'car', color: '#4ECDC4' },
    "Bills & Utilities": { icon: 'receipt', color: '#3B82F6' },
    "Shopping": { icon: 'cart', color: '#A78BFA' },
    "Healthcare": { icon: 'medkit', color: '#10B981' },
    "Entertainment": { icon: 'film', color: '#EC4899' },
    "Education": { icon: 'school', color: '#F59E0B' },
    "Groceries": { icon: 'basket', color: '#10B981' },
    "Personal Care": { icon: 'sparkles', color: '#8B5CF6' },
    "Online Services": { icon: 'globe', color: '#3B82F6' },
    "Gym & Fitness": { icon: 'barbell', color: '#F59E0B' },
    "Subscription (Google one )": { icon: 'card', color: '#A78BFA' },
    "Miscellaneous": { icon: 'grid', color: '#64748B' },
    "Income": { icon: 'log-in', color: '#10B981' },
};

const TransactionScreen = ({ navigation }) => {
    const dispatch = useDispatch();

    // Redux Selectors
    const historyData = useSelector((state) => state.API?.fourMonthHistory || []);
    const trendHistory = useSelector((state) => state.API?.trendHistory || []);
    const historyStatus = useSelector((state) => state.API?.historyStatus || 'idle');

    const latestTransactions = useSelector((state) => state.API?.latestTransactions || []);
    const transactionsStatus = useSelector((state) => state.API?.transactionsStatus || 'idle');

    const topCategories = useSelector((state) => state.API?.topCategories || []);
    const topCategoriesStatus = useSelector((state) => state.API?.topCategoriesStatus || 'idle');
    const categories = useSelector((state) => state.API?.categories || []);

    const [refreshing, setRefreshing] = useState(false);
    const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'week', 'month', 'year'

    // Edit Category Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState(null);

    const openEditModal = (transaction) => {
        setSelectedTransaction(transaction);
        setModalVisible(true);
    };

    const handleCategorySelect = async (category) => {
        if (selectedTransaction) {
            // Import updateTransaction (imported at top)
            try {
                await dispatch(updateTransaction({
                    id: selectedTransaction.id,
                    data: { purpose: category }
                }));
                setModalVisible(false);
            } catch (e) {
                // handle error
            }
        }
    };

    const loadData = (filter = activeFilter) => {
        dispatch(fetchTrendHistory(filter));
        dispatch(fetchLatestTransactions(50));
        dispatch(fetchTopSpendingCategories(filter));
        dispatch(fetchCategories());
    };

    // Initial Fetch and reload when filter changes
    useEffect(() => {
        loadData(activeFilter);
    }, [activeFilter]);

    const onRefresh = () => {
        setRefreshing(true);
        Promise.all([
            dispatch(fetchTrendHistory(activeFilter)),
            dispatch(fetchLatestTransactions(50)),
            dispatch(fetchTopSpendingCategories(activeFilter))
        ]).finally(() => setRefreshing(false));
    };

    // --- Process Data for UI ---

    // 1. Stats & Trend
    const currentExpense = historyData?.[0]?.actual?.expense || 0;
    // historyData[1] is previous month (if array is ordered descending by month which app.py does)
    const prevExpense = historyData?.[1]?.actual?.expense || 1;

    // Calculate trend
    let trend = 0;
    if (prevExpense > 0) {
        trend = Math.round(((currentExpense - prevExpense) / prevExpense) * 100);
    }
    const isPositiveTrend = trend <= 0; // Negative change in expense is "Positive" for wallet

    // 2. Line Chart Data
    let chartLabels = [];
    let chartValues = [];

    if (trendHistory && trendHistory.length > 0) {
        chartLabels = trendHistory.map(item => item.label);
        chartValues = trendHistory.map(item => Number(item.value) || 0);
    }

    // Fallback defaults if no data or single data point
    let finalLabels = chartLabels;
    let finalValues = chartValues;

    if (finalValues.length === 0) {
        finalLabels = ['No Data', 'No Data'];
        finalValues = [0, 0];
    } else if (finalValues.length === 1) {
        finalLabels = [...finalLabels, finalLabels[0]];
        finalValues = [...finalValues, finalValues[0]];
    }

    const lineChartData = {
        labels: finalLabels,
        datasets: [
            {
                data: finalValues,
                color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                strokeWidth: 3,
            },
        ],
    };

    // 3. Pie Chart Data
    let pieData = [];
    let totalSpent = 0;

    if (topCategories && topCategories.length > 0) {
        pieData = topCategories.map((cat) => {
            const details = CATEGORY_DETAILS_MAP[cat.category] || CATEGORY_DETAILS_MAP['Miscellaneous'];
            // Ensure numeric value
            const amount = Number(cat.total_spent) || 0;
            totalSpent += amount;
            return {
                name: cat.category,
                amount: amount,
                color: details.color,
                legendFontColor: '#64748B',
                legendFontSize: 12
            };
        });
    } else {
        // Empty placeholder
        pieData = [{ name: 'No Data', amount: 100, color: '#E2E8F0', legendFontColor: '#64748B', legendFontSize: 12 }];
    }

    // 4. Helpers
    const { currency } = useSettings();

    const formatCurrency = (amount) => {
        const safeAmount = Number(amount);
        if (isNaN(safeAmount)) return new Intl.NumberFormat('en-PK', { style: 'currency', currency: currency, minimumFractionDigits: 0 }).format(0);

        return new Intl.NumberFormat('en-PK', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(safeAmount);
    };

    const filters = [
        { id: 'all', label: 'All Time', icon: 'calendar' },
        { id: 'week', label: 'Week', icon: 'calendar-outline' },
        { id: 'month', label: 'Month', icon: 'calendar' },
        { id: 'year', label: 'Year', icon: 'calendar-number' },
    ];

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#1E293B" />

            {/* Modern Header */}
            <LinearGradient colors={['#1E293B', '#334155']} style={styles.header}>
                <View style={styles.headerContent}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitle}>Analytics</Text>
                        <Text style={styles.headerSubtitle}>Track your spending patterns</Text>
                    </View>
                    <TouchableOpacity style={styles.headerIconButton}>
                        <Ionicons name="filter" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>

                {/* Stats Overview Card */}
                <View style={styles.statsCard}>
                    <View style={styles.statsHeader}>
                        <Text style={styles.statsLabel}>Total Spending (This Month)</Text>
                        <View style={[styles.trendBadge, isPositiveTrend ? styles.trendBadgeGood : styles.trendBadgeBad]}>
                            <Ionicons
                                name={isPositiveTrend ? 'trending-down' : 'trending-up'}
                                size={14}
                                color={isPositiveTrend ? '#10B981' : '#EF4444'}
                            />
                            <Text style={[styles.trendText, isPositiveTrend ? styles.trendTextGood : styles.trendTextBad]}>
                                {Math.abs(trend)}%
                            </Text>
                        </View>
                    </View>
                    <Text style={styles.statsAmount}>{formatCurrency(currentExpense)}</Text>
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
                                <Ionicons
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
                            <Text style={styles.chartSubtitle}>
                                {activeFilter === 'week' ? 'Past 7 days' :
                                    activeFilter === 'month' ? 'Last 6 months' :
                                        activeFilter === 'year' ? 'Current year' : 'All time overview'}
                            </Text>
                        </View>
                        <TouchableOpacity style={styles.chartMenuButton}>
                            <Ionicons name="ellipsis-horizontal" size={24} color="#64748B" />
                        </TouchableOpacity>
                    </View>

                    {historyStatus === 'loading' ? (
                        <ActivityIndicator color="#3B82F6" />
                    ) : (
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
                            style={styles.lineChart}
                            fromZero={true}
                            withVerticalLines={false}
                            withHorizontalLines={true}
                            withInnerLines={true}
                            withOuterLines={false}
                            withVerticalLabels={true}
                            withHorizontalLabels={true}
                        />
                    )}
                </View>

                {/* Category Breakdown */}
                <View style={styles.chartCard}>
                    <View style={styles.chartHeader}>
                        <View>
                            <Text style={styles.chartTitle}>Spending by Category</Text>
                            <Text style={styles.chartSubtitle}>
                                {activeFilter === 'week' ? 'This week' :
                                    activeFilter === 'month' ? 'This month' :
                                        activeFilter === 'year' ? 'This year' : 'All time'} breakdown
                            </Text>
                        </View>
                    </View>

                    {topCategoriesStatus === 'loading' ? (
                        <ActivityIndicator color="#3B82F6" />
                    ) : (
                        <>
                            <PieChart
                                data={pieData}
                                width={chartWidth - 40}
                                height={200}
                                accessor="amount"
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
                                    // Avoid div by zero
                                    const percentage = totalSpent > 0 ? ((item.amount / totalSpent) * 100).toFixed(1) : 0;
                                    if (item.name === 'No Data') return null;

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
                                                <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </>
                    )}
                </View>

                {/* Recent Transactions */}
                <View style={styles.transactionsSection}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>All Transactions</Text>
                    </View>

                    <View style={styles.transactionList}>
                        {transactionsStatus === 'loading' && (
                            <View style={{ padding: 20 }}>
                                <ActivityIndicator color="#3B82F6" />
                            </View>
                        )}
                        {transactionsStatus !== 'loading' && latestTransactions && latestTransactions.length === 0 && (
                            <View style={{ padding: 20 }}>
                                <Text style={{ color: '#64748B', textAlign: 'center' }}>No transactions found</Text>
                            </View>
                        )}

                        {latestTransactions && latestTransactions.map((transaction, index) => {
                            const categoryName = transaction.purpose || 'Other';
                            const details = CATEGORY_DETAILS_MAP[categoryName] || CATEGORY_DETAILS_MAP['Miscellaneous'];
                            const isIncome = transaction.type === 'credit';
                            const icon = isIncome ? 'arrow-down-circle' : details.icon;
                            const color = isIncome ? '#10B981' : details.color;

                            return (
                                <TouchableOpacity
                                    key={transaction.id}
                                    style={[
                                        styles.transactionItem,
                                        index === latestTransactions.length - 1 && styles.transactionItemLast
                                    ]}
                                    onPress={() => openEditModal(transaction)}
                                >
                                    <View style={[styles.transactionIcon, { backgroundColor: color + '20' }]}>
                                        <Ionicons name={icon} size={24} color={color} />
                                    </View>
                                    <View style={styles.transactionInfo}>
                                        <Text style={styles.transactionTitle}>
                                            {transaction.sender || transaction.purpose || 'Transaction'}
                                        </Text>
                                        <Text style={styles.transactionCategory}>
                                            {transaction.purpose || 'Uncategorized'} • {new Date(transaction.date).toLocaleDateString()}
                                        </Text>
                                    </View>
                                    <View style={styles.transactionRight}>
                                        <Text
                                            style={[
                                                styles.transactionAmount,
                                                isIncome ? styles.transactionAmountIncome : styles.transactionAmountExpense,
                                            ]}
                                        >
                                            {isIncome ? '+' : ''}{formatCurrency(transaction.amount)}
                                        </Text>
                                        <Ionicons
                                            name={isIncome ? 'arrow-up-circle' : 'arrow-down-circle'}
                                            size={16}
                                            color={isIncome ? '#10B981' : '#64748B'}
                                        />
                                    </View>
                                </TouchableOpacity>
                            )
                        })}
                    </View>
                </View>

                {/* Insights Card */}
                <LinearGradient
                    colors={isPositiveTrend ? ['#D1FAE5', '#A7F3D0'] : ['#FEE2E2', '#FECACA']}
                    style={styles.insightCard}
                >
                    <View style={styles.insightIconWrapper}>
                        <Ionicons
                            name={isPositiveTrend ? 'bulb' : 'alert-circle'}
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

            {/* Edit Category Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Change Category</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                <TouchableOpacity
                                    onPress={() => {
                                        setModalVisible(false);
                                        navigation.navigate('CategoryManagement');
                                    }}
                                >
                                    <Text style={{ color: '#3B82F6', fontWeight: 'bold' }}>Manage</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setModalVisible(false)}>
                                    <Ionicons name="close" size={24} color="#64748B" />
                                </TouchableOpacity>
                            </View>
                        </View>
                        <Text style={{ color: '#64748B', marginBottom: 20 }}>
                            Select a new category for this transaction.
                        </Text>

                        <ScrollView style={{ maxHeight: 400 }}>
                            {categories
                                .filter(cat => {
                                    if (selectedTransaction?.type === 'debit') {
                                        return cat.cat_type === 'spending' || cat.cat_type === 'both';
                                    } else {
                                        return cat.cat_type === 'income' || cat.cat_type === 'both';
                                    }
                                })
                                .map((cat) => (
                                    <TouchableOpacity
                                        key={cat.id}
                                        style={styles.categoryOption}
                                        onPress={() => handleCategorySelect(cat.name)}
                                    >
                                        <View style={[styles.categoryIconContainer, { backgroundColor: (cat.color || '#64748B') + '20', width: 40, height: 40 }]}>
                                            <MCIcon name={cat.icon} size={20} color={cat.color || '#64748B'} />
                                        </View>
                                        <Text style={styles.categoryName}>{cat.name}</Text>
                                        {selectedTransaction?.purpose === cat.name && (
                                            <Ionicons name="checkmark" size={20} color="#3B82F6" style={{ marginLeft: 'auto' }} />
                                        )}
                                    </TouchableOpacity>
                                ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
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
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: '90%'
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1E293B'
    },
    categoryOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9'
    },
    categoryIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12
    }
});

export default TransactionScreen;
