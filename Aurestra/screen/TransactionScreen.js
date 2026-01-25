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
    Modal,
    Animated,
    TextInput,
    Switch,
    Alert,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useSettings } from '../context/SettingsContext';
import { PieChart, LineChart } from 'react-native-chart-kit';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MCIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
    fetchTrendHistory,
    fetchLatestTransactions,
    fetchTopSpendingCategories,
    updateTransaction,
    createTransaction,
    fetchCategories,
    fetchTotalExpenses,
    fetchFinancialInsight
} from '../API/slice/API';
import LinearGradient from 'react-native-linear-gradient';

const { width } = Dimensions.get('window');
const chartWidth = width - 40;

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

const TransactionScreen = ({ navigation, route }) => {
    const dispatch = useDispatch();
    const [animatedValue] = useState(new Animated.Value(0));
    const [scrollY] = useState(new Animated.Value(0));

    // Redux Selectors
    const historyData = useSelector((state) => state.API?.fourMonthHistory || []);
    const trendHistory = useSelector((state) => state.API?.trendHistory || []);
    const historyStatus = useSelector((state) => state.API?.historyStatus || 'idle');

    const latestTransactions = useSelector((state) => state.API?.latestTransactions || []);
    const transactionsStatus = useSelector((state) => state.API?.transactionsStatus || 'idle');

    const topCategories = useSelector((state) => state.API?.topCategories || []);
    const topCategoriesStatus = useSelector((state) => state.API?.topCategoriesStatus || 'idle');

    const categories = useSelector((state) => state.API?.categories || []);
    const totalExpenses = useSelector((state) => state.API?.totalExpenses || 0);
    const financialInsight = useSelector((state) => state.API?.financialInsight || null);

    const [refreshing, setRefreshing] = useState(false);
    const [activeFilter, setActiveFilter] = useState('all');
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState(null);

    // Add Transaction State
    const [addModalVisible, setAddModalVisible] = useState(false);
    const [newAmount, setNewAmount] = useState('');
    const [newType, setNewType] = useState('debit');
    const [newCategory, setNewCategory] = useState('Miscellaneous');
    const [newNotes, setNewNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleAddTransaction = async () => {
        if (!newAmount || parseFloat(newAmount) <= 0) {
            Alert.alert('Error', 'Please enter a valid amount');
            return;
        }
        setIsSubmitting(true);
        try {
            await dispatch(createTransaction({
                amount: parseFloat(newAmount),
                type: newType,
                category: newCategory,
                notes: newNotes,
                date: new Date().toISOString().split('T')[0]
            })).unwrap();
            setAddModalVisible(false);
            setNewAmount('');
            setNewNotes('');
            setNewType('debit');
            setNewCategory('Miscellaneous');
            // Alert.alert('Success', 'Transaction added');
        } catch (e) {
            Alert.alert('Error', e || 'Failed to add transaction');
        } finally {
            setIsSubmitting(false);
        }
    };

    const openEditModal = (transaction) => {
        setSelectedTransaction(transaction);
        setModalVisible(true);
    };

    const handleCategorySelect = async (category) => {
        if (selectedTransaction) {
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
        dispatch(fetchTotalExpenses());
        dispatch(fetchFinancialInsight());
    };

    useEffect(() => {
        loadData(activeFilter);
    }, [activeFilter]);

    useEffect(() => {
        Animated.spring(animatedValue, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
        }).start();
    }, []);

    // Handle Deep Linking from Profile
    useEffect(() => {
        if (route.params?.openAddModal) {
            setAddModalVisible(true);
            // Clear param so it doesn't reopen on focus if not desired, 
            // but navigation.setParams might trigger re-render. 
            // Simpler to just open it.
            navigation.setParams({ openAddModal: undefined });
        }
    }, [route.params]);

    const onRefresh = () => {
        setRefreshing(true);
        Promise.all([
            dispatch(fetchTrendHistory(activeFilter)),
            dispatch(fetchLatestTransactions(50)),
            dispatch(fetchTopSpendingCategories(activeFilter))
        ]).finally(() => setRefreshing(false));
    };

    // Process Data
    const currentExpense = totalExpenses || historyData?.[0]?.actual?.expense || 0;
    const prevExpense = historyData?.[1]?.actual?.expense || 1;

    let trend = 0;
    if (prevExpense > 0) {
        trend = Math.round(((currentExpense - prevExpense) / prevExpense) * 100);
    }
    const isPositiveTrend = trend <= 0;

    // Line Chart Data
    let chartLabels = [];
    let chartValues = [];

    if (trendHistory && trendHistory.length > 0) {
        chartLabels = trendHistory.map(item => item.label);
        chartValues = trendHistory.map(item => Number(item.value) || 0);
    }

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
                color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
                strokeWidth: 3,
            },
        ],
    };

    // Pie Chart Data
    let pieData = [];
    let totalSpent = 0;

    if (topCategories && topCategories.length > 0) {
        pieData = topCategories.map((cat) => {
            const details = CATEGORY_DETAILS_MAP[cat.category] || CATEGORY_DETAILS_MAP['Miscellaneous'] || { color: '#808080', icon: 'help-circle' };
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
        pieData = [{ name: 'No Data', amount: 100, color: '#E2E8F0', legendFontColor: '#64748B', legendFontSize: 12 }];
    }

    const { currency, colors, isDarkMode } = useSettings();

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
        { id: 'all', label: 'All Time', icon: 'infinite' },
        { id: 'week', label: 'Week', icon: 'calendar' },
        { id: 'month', label: 'Month', icon: 'calendar-number' },
        { id: 'year', label: 'Year', icon: 'time' },
    ];

    const headerOpacity = scrollY.interpolate({
        inputRange: [0, 100],
        outputRange: [0, 1],
        extrapolate: 'clamp',
    });

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? '#0A0A0B' : '#F8F9FE' }]}>
            <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />

            {/* Floating Header */}
            <Animated.View style={[styles.floatingHeader, { opacity: headerOpacity }]}>
                <LinearGradient
                    colors={isDarkMode ? ['#1A1A1D', '#0A0A0B'] : ['#FFFFFF', '#F8F9FE']}
                    style={styles.floatingHeaderGradient}
                >
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.floatingBackButton}>
                        <View style={[styles.iconButton, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                            <Ionicons name="arrow-back" size={20} color={isDarkMode ? '#FFFFFF' : '#1A1A1D'} />
                        </View>
                    </TouchableOpacity>
                    <Text style={[styles.floatingTitle, { color: isDarkMode ? '#FFFFFF' : '#1A1A1D' }]}>Analytics</Text>
                    <View style={{ width: 40 }} />
                </LinearGradient>
            </Animated.View>

            <Animated.ScrollView
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: true }
                )}
                scrollEventThrottle={16}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#8B5CF6']} />
                }
            >
                {/* Hero Header */}
                <View style={styles.heroSection}>
                    <View style={styles.heroTop}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <View style={[styles.iconButton, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                                <Ionicons name="arrow-back" size={22} color={isDarkMode ? '#FFFFFF' : '#1A1A1D'} />
                            </View>
                        </TouchableOpacity>

                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity
                                style={styles.notificationButton}
                                onPress={() => setAddModalVisible(true)}
                            >
                                <View style={[styles.iconButton, { backgroundColor: isDarkMode ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.1)' }]}>
                                    <Ionicons name="add" size={24} color="#8B5CF6" />
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.heroContent}>
                        <Text style={[styles.heroGreeting, { color: isDarkMode ? '#A1A1AA' : '#71717A' }]}>
                            Your Financial Overview
                        </Text>
                        <Text style={[styles.heroTitle, { color: isDarkMode ? '#FFFFFF' : '#1A1A1D' }]}>
                            Analytics
                        </Text>
                    </View>
                </View>

                {/* Stats Cards */}
                <View style={styles.statsGrid}>
                    <Animated.View style={[
                        styles.statCard,
                        {
                            transform: [{
                                scale: animatedValue.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0.9, 1],
                                })
                            }],
                            opacity: animatedValue,
                        }
                    ]}>
                        <LinearGradient
                            colors={isDarkMode ? ['#8B5CF6', '#7C3AED'] : ['#8B5CF6', '#6D28D9']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.statGradient}
                        >
                            <View style={styles.statIconContainer}>
                                <Ionicons name="trending-down" size={24} color="#FFFFFF" />
                            </View>
                            <Text style={styles.statLabel}>Total Spent</Text>
                            <Text style={styles.statAmount}>{formatCurrency(currentExpense)}</Text>
                            <View style={styles.statBadge}>
                                <Ionicons
                                    name={isPositiveTrend ? 'arrow-down' : 'arrow-up'}
                                    size={12}
                                    color="#FFFFFF"
                                />
                                <Text style={styles.statBadgeText}>{Math.abs(trend)}%</Text>
                            </View>
                        </LinearGradient>
                    </Animated.View>

                    <View style={styles.miniStatsColumn}>
                        <Animated.View style={[
                            styles.miniStatCard,
                            {
                                backgroundColor: isDarkMode ? '#1A1A1D' : '#FFFFFF',
                                borderColor: isDarkMode ? '#27272A' : '#E4E4E7',
                                transform: [{
                                    translateX: animatedValue.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [50, 0],
                                    })
                                }],
                                opacity: animatedValue,
                            }
                        ]}>
                            <View style={[styles.miniStatIcon, { backgroundColor: '#10B98120' }]}>
                                <Ionicons name="arrow-up-circle" size={20} color="#10B981" />
                            </View>
                            <Text style={[styles.miniStatLabel, { color: isDarkMode ? '#A1A1AA' : '#71717A' }]}>
                                Income
                            </Text>
                            <Text style={[styles.miniStatValue, { color: isDarkMode ? '#FFFFFF' : '#1A1A1D' }]}>
                                {formatCurrency(0)}
                            </Text>
                        </Animated.View>

                        <Animated.View style={[
                            styles.miniStatCard,
                            {
                                backgroundColor: isDarkMode ? '#1A1A1D' : '#FFFFFF',
                                borderColor: isDarkMode ? '#27272A' : '#E4E4E7',
                                transform: [{
                                    translateX: animatedValue.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [50, 0],
                                    })
                                }],
                                opacity: animatedValue,
                            }
                        ]}>
                            <View style={[styles.miniStatIcon, { backgroundColor: '#F59E0B20' }]}>
                                <Ionicons name="wallet" size={20} color="#F59E0B" />
                            </View>
                            <Text style={[styles.miniStatLabel, { color: isDarkMode ? '#A1A1AA' : '#71717A' }]}>
                                Balance
                            </Text>
                            <Text style={[styles.miniStatValue, { color: isDarkMode ? '#FFFFFF' : '#1A1A1D' }]}>
                                {formatCurrency(0)}
                            </Text>
                        </Animated.View>
                    </View>
                </View>

                {/* Time Period Filter */}
                <View style={styles.filterSection}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                        {filters.map((filter) => (
                            <TouchableOpacity
                                key={filter.id}
                                style={[
                                    styles.filterChip,
                                    {
                                        backgroundColor: activeFilter === filter.id
                                            ? (isDarkMode ? '#8B5CF6' : '#8B5CF6')
                                            : (isDarkMode ? '#1A1A1D' : '#FFFFFF'),
                                        borderColor: activeFilter === filter.id
                                            ? '#8B5CF6'
                                            : (isDarkMode ? '#27272A' : '#E4E4E7'),
                                    }
                                ]}
                                onPress={() => setActiveFilter(filter.id)}
                            >
                                <Ionicons
                                    name={filter.icon}
                                    size={16}
                                    color={activeFilter === filter.id ? '#FFFFFF' : (isDarkMode ? '#A1A1AA' : '#71717A')}
                                />
                                <Text style={[
                                    styles.filterChipText,
                                    {
                                        color: activeFilter === filter.id ? '#FFFFFF' : (isDarkMode ? '#A1A1AA' : '#71717A')
                                    }
                                ]}>
                                    {filter.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Spending Trend Chart */}
                <View style={[styles.chartCard, {
                    backgroundColor: isDarkMode ? '#1A1A1D' : '#FFFFFF',
                    borderColor: isDarkMode ? '#27272A' : '#E4E4E7'
                }]}>
                    <View style={styles.chartHeader}>
                        <View>
                            <Text style={[styles.chartTitle, { color: isDarkMode ? '#FFFFFF' : '#1A1A1D' }]}>
                                Spending Trend
                            </Text>
                            <Text style={[styles.chartSubtitle, { color: isDarkMode ? '#A1A1AA' : '#71717A' }]}>
                                {activeFilter === 'week' ? 'Past 7 days' :
                                    activeFilter === 'month' ? 'Last 6 months' :
                                        activeFilter === 'year' ? 'Current year' : 'All time overview'}
                            </Text>
                        </View>
                        <TouchableOpacity style={[styles.chartMenu, {
                            backgroundColor: isDarkMode ? '#27272A' : '#F4F4F5'
                        }]}>
                            <Ionicons name="ellipsis-horizontal" size={18} color={isDarkMode ? '#FFFFFF' : '#71717A'} />
                        </TouchableOpacity>
                    </View>

                    {historyStatus === 'loading' ? (
                        <View style={styles.chartLoading}>
                            <ActivityIndicator color="#8B5CF6" size="large" />
                        </View>
                    ) : (
                        <LineChart
                            data={lineChartData}
                            width={chartWidth - 40}
                            height={220}
                            chartConfig={{
                                backgroundColor: 'transparent',
                                backgroundGradientFrom: isDarkMode ? '#1A1A1D' : '#FFFFFF',
                                backgroundGradientTo: isDarkMode ? '#1A1A1D' : '#FFFFFF',
                                decimalPlaces: 0,
                                color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
                                labelColor: (opacity = 1) => isDarkMode ? `rgba(161, 161, 170, ${opacity})` : `rgba(113, 113, 122, ${opacity})`,
                                style: {
                                    borderRadius: 16,
                                },
                                propsForDots: {
                                    r: '5',
                                    strokeWidth: '3',
                                    stroke: '#8B5CF6',
                                    fill: isDarkMode ? '#1A1A1D' : '#FFFFFF'
                                },
                                propsForBackgroundLines: {
                                    strokeDasharray: '5,5',
                                    stroke: isDarkMode ? '#27272A' : '#E4E4E7',
                                    strokeWidth: 1,
                                },
                            }}
                            style={styles.lineChart}
                            bezier
                            fromZero={true}
                            withVerticalLines={false}
                            withHorizontalLines={true}
                            withInnerLines={true}
                            withOuterLines={false}
                        />
                    )}
                </View>

                {/* Category Breakdown */}
                <View style={[styles.chartCard, {
                    backgroundColor: isDarkMode ? '#1A1A1D' : '#FFFFFF',
                    borderColor: isDarkMode ? '#27272A' : '#E4E4E7'
                }]}>
                    <View style={styles.chartHeader}>
                        <View>
                            <Text style={[styles.chartTitle, { color: isDarkMode ? '#FFFFFF' : '#1A1A1D' }]}>
                                Spending Breakdown
                            </Text>
                            <Text style={[styles.chartSubtitle, { color: isDarkMode ? '#A1A1AA' : '#71717A' }]}>
                                By category
                            </Text>
                        </View>
                    </View>

                    {topCategoriesStatus === 'loading' ? (
                        <View style={styles.chartLoading}>
                            <ActivityIndicator color="#8B5CF6" size="large" />
                        </View>
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
                                    color: (opacity = 1) => isDarkMode ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
                                }}
                                style={styles.pieChart}
                            />

                            <View style={styles.categoryList}>
                                {pieData.map((item, index) => {
                                    const percentage = totalSpent > 0 ? ((item.amount / totalSpent) * 100).toFixed(1) : 0;
                                    if (item.name === 'No Data') return null;

                                    return (
                                        <TouchableOpacity key={index} style={[styles.categoryItem, {
                                            backgroundColor: isDarkMode ? '#27272A' : '#F4F4F5'
                                        }]}>
                                            <View style={styles.categoryLeft}>
                                                <View style={[styles.categoryDot, { backgroundColor: item.color }]} />
                                                <View style={styles.categoryInfo}>
                                                    <Text style={[styles.categoryName, { color: isDarkMode ? '#FFFFFF' : '#1A1A1D' }]}>
                                                        {item.name}
                                                    </Text>
                                                    <Text style={[styles.categoryPercentage, { color: isDarkMode ? '#A1A1AA' : '#71717A' }]}>
                                                        {percentage}% of total
                                                    </Text>
                                                </View>
                                            </View>
                                            <View style={styles.categoryRight}>
                                                <Text style={[styles.categoryAmount, { color: isDarkMode ? '#FFFFFF' : '#1A1A1D' }]}>
                                                    {formatCurrency(item.amount)}
                                                </Text>
                                                <Ionicons name="chevron-forward" size={18} color={isDarkMode ? '#52525B' : '#A1A1AA'} />
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </>
                    )}
                </View>

                {/* AI Insight Card */}
                {financialInsight && (
                    <View style={styles.insightCard}>
                        <LinearGradient
                            colors={isPositiveTrend
                                ? (isDarkMode ? ['#065F46', '#047857'] : ['#D1FAE5', '#A7F3D0'])
                                : (isDarkMode ? ['#991B1B', '#B91C1C'] : ['#FEE2E2', '#FECACA'])
                            }
                            style={styles.insightGradient}
                        >
                            <View style={styles.insightIcon}>
                                <Ionicons
                                    name="sparkles"
                                    size={24}
                                    color={isPositiveTrend ? (isDarkMode ? '#D1FAE5' : '#059669') : (isDarkMode ? '#FEE2E2' : '#DC2626')}
                                />
                            </View>
                            <View style={styles.insightContent}>
                                <Text style={[styles.insightTitle, {
                                    color: isPositiveTrend ? (isDarkMode ? '#D1FAE5' : '#065F46') : (isDarkMode ? '#FEE2E2' : '#991B1B')
                                }]}>
                                    AI Financial Insight
                                </Text>
                                <Text style={[styles.insightText, {
                                    color: isPositiveTrend ? (isDarkMode ? '#A7F3D0' : '#047857') : (isDarkMode ? '#FECACA' : '#B91C1C')
                                }]}>
                                    {financialInsight.content}
                                </Text>
                            </View>
                        </LinearGradient>
                    </View>
                )}

                {/* Recent Transactions */}
                <View style={styles.transactionsSection}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: isDarkMode ? '#FFFFFF' : '#1A1A1D' }]}>
                            Recent Activity
                        </Text>
                        <TouchableOpacity>
                            <Text style={styles.seeAllText}>See All</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={[styles.transactionList, {
                        backgroundColor: isDarkMode ? '#1A1A1D' : '#FFFFFF',
                        borderColor: isDarkMode ? '#27272A' : '#E4E4E7'
                    }]}>
                        {transactionsStatus === 'loading' && (
                            <View style={styles.transactionLoading}>
                                <ActivityIndicator color="#8B5CF6" />
                            </View>
                        )}
                        {transactionsStatus !== 'loading' && latestTransactions && latestTransactions.length === 0 && (
                            <View style={styles.emptyState}>
                                <Ionicons name="receipt-outline" size={48} color={isDarkMode ? '#52525B' : '#D4D4D8'} />
                                <Text style={[styles.emptyText, { color: isDarkMode ? '#A1A1AA' : '#71717A' }]}>
                                    No transactions found
                                </Text>
                            </View>
                        )}

                        {latestTransactions && latestTransactions.slice(0, 8).map((transaction, index) => {
                            const categoryName = transaction.purpose || 'Other';
                            const details = CATEGORY_DETAILS_MAP[categoryName] || CATEGORY_DETAILS_MAP['Miscellaneous'];
                            const isIncome = transaction.type === 'credit';
                            const icon = isIncome ? 'arrow-down-circle' : details.icon;
                            const color = isIncome ? '#10B981' : details.color;

                            let rawTitle = transaction.notes || transaction.sender || transaction.receiver || 'General Transaction';
                            rawTitle = rawTitle.replace(/Payment method:\s*/gi, '').trim();
                            if (rawTitle.startsWith('ID#')) {
                                rawTitle = rawTitle.replace(/ID#\s*\d+\s*/, '').trim();
                            }
                            if (!rawTitle) rawTitle = 'Transaction';
                            const title = rawTitle.length > 28 ? rawTitle.substring(0, 28) + '...' : rawTitle;

                            return (
                                <TouchableOpacity
                                    key={transaction.id}
                                    style={[
                                        styles.transactionItem,
                                        index === latestTransactions.slice(0, 8).length - 1 && styles.transactionItemLast
                                    ]}
                                    onPress={() => openEditModal(transaction)}
                                >
                                    <View style={[styles.transactionIcon, { backgroundColor: color + '20' }]}>
                                        <Ionicons name={icon} size={22} color={color} />
                                    </View>

                                    <View style={styles.transactionInfo}>
                                        <Text style={[styles.transactionTitle, { color: isDarkMode ? '#FFFFFF' : '#1A1A1D' }]} numberOfLines={1}>
                                            {title}
                                        </Text>
                                        <View style={styles.transactionMeta}>
                                            <View style={[styles.categoryBadge, {
                                                backgroundColor: color + '15',
                                                borderColor: color + '30'
                                            }]}>
                                                <Text style={[styles.categoryBadgeText, { color: color }]}>
                                                    {transaction.purpose || 'Uncategorized'}
                                                </Text>
                                            </View>
                                            <Text style={[styles.transactionDate, { color: isDarkMode ? '#71717A' : '#A1A1AA' }]}>
                                                {new Date(transaction.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.transactionRight}>
                                        <Text
                                            style={[
                                                styles.transactionAmount,
                                                { color: isIncome ? '#10B981' : (isDarkMode ? '#FFFFFF' : '#1A1A1D') }
                                            ]}
                                        >
                                            {isIncome ? '+' : ''}{formatCurrency(transaction.amount)}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            )
                        })}
                    </View>
                </View>
            </Animated.ScrollView>

            {/* Edit Category Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity
                        style={styles.modalBackdrop}
                        activeOpacity={1}
                        onPress={() => setModalVisible(false)}
                    />
                    <View style={[styles.modalContent, {
                        backgroundColor: isDarkMode ? '#1A1A1D' : '#FFFFFF'
                    }]}>
                        <View style={styles.modalHandle} />

                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={[styles.modalTitle, { color: isDarkMode ? '#FFFFFF' : '#1A1A1D' }]}>
                                    Change Category
                                </Text>
                                <Text style={[styles.modalSubtitle, { color: isDarkMode ? '#A1A1AA' : '#71717A' }]}>
                                    Select a new category
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={[styles.manageButton, {
                                    backgroundColor: isDarkMode ? '#27272A' : '#F4F4F5'
                                }]}
                                onPress={() => {
                                    setModalVisible(false);
                                    navigation.navigate('CategoryManagement');
                                }}
                            >
                                <Ionicons name="settings-outline" size={18} color="#8B5CF6" />
                                <Text style={styles.manageButtonText}>Manage</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.categoryScroll} showsVerticalScrollIndicator={false}>
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
                                        style={[styles.categoryOption, {
                                            backgroundColor: selectedTransaction?.purpose === cat.name
                                                ? (isDarkMode ? '#8B5CF620' : '#8B5CF610')
                                                : 'transparent',
                                            borderBottomColor: isDarkMode ? '#27272A' : '#E4E4E7'
                                        }]}
                                        onPress={() => handleCategorySelect(cat.name)}
                                    >
                                        <View style={[styles.categoryOptionIcon, {
                                            backgroundColor: (cat.color || '#64748B') + '20'
                                        }]}>
                                            <MCIcon name={cat.icon} size={22} color={cat.color || '#64748B'} />
                                        </View>
                                        <Text style={[styles.categoryOptionName, {
                                            color: isDarkMode ? '#FFFFFF' : '#1A1A1D'
                                        }]}>
                                            {cat.name}
                                        </Text>
                                        {selectedTransaction?.purpose === cat.name && (
                                            <View style={styles.checkmark}>
                                                <Ionicons name="checkmark-circle" size={24} color="#8B5CF6" />
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Add Transaction Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={addModalVisible}
                onRequestClose={() => setAddModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.modalOverlay}
                >
                    <TouchableOpacity
                        style={styles.modalBackdrop}
                        activeOpacity={1}
                        onPress={() => setAddModalVisible(false)}
                    />
                    <View style={[styles.modalContent, {
                        backgroundColor: isDarkMode ? '#1A1A1D' : '#FFFFFF'
                    }]}>
                        <View style={styles.modalHandle} />

                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={[styles.modalTitle, { color: isDarkMode ? '#FFFFFF' : '#1A1A1D' }]}>
                                    New Transaction
                                </Text>
                                <Text style={[styles.modalSubtitle, { color: isDarkMode ? '#A1A1AA' : '#71717A' }]}>
                                    Add a manual entry
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={[styles.manageButton, {
                                    backgroundColor: isDarkMode ? '#27272A' : '#F4F4F5'
                                }]}
                                onPress={() => setAddModalVisible(false)}
                            >
                                <Ionicons name="close" size={20} color={isDarkMode ? '#A1A1AA' : '#71717A'} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
                            {/* Amount Input */}
                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, { color: isDarkMode ? '#A1A1AA' : '#71717A' }]}>Amount</Text>
                                <TextInput
                                    style={[styles.input, {
                                        backgroundColor: isDarkMode ? '#27272A' : '#F4F4F5',
                                        color: isDarkMode ? '#FFFFFF' : '#1A1A1D',
                                        borderColor: isDarkMode ? '#3F3F46' : '#E4E4E7'
                                    }]}
                                    placeholder="0.00"
                                    placeholderTextColor={isDarkMode ? '#71717A' : '#A1A1AA'}
                                    keyboardType="numeric"
                                    value={newAmount}
                                    onChangeText={setNewAmount}
                                />
                            </View>

                            {/* Type Selector */}
                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, { color: isDarkMode ? '#A1A1AA' : '#71717A' }]}>Type</Text>
                                <View style={{ flexDirection: 'row', gap: 12 }}>
                                    <TouchableOpacity
                                        style={[styles.typeButton, {
                                            backgroundColor: newType === 'debit' ? '#EF4444' : (isDarkMode ? '#27272A' : '#F4F4F5'),
                                            flex: 1
                                        }]}
                                        onPress={() => setNewType('debit')}
                                    >
                                        <Text style={[styles.typeButtonText, { color: newType === 'debit' ? '#FFFFFF' : (isDarkMode ? '#A1A1AA' : '#71717A') }]}>Expense</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.typeButton, {
                                            backgroundColor: newType === 'credit' ? '#10B981' : (isDarkMode ? '#27272A' : '#F4F4F5'),
                                            flex: 1
                                        }]}
                                        onPress={() => setNewType('credit')}
                                    >
                                        <Text style={[styles.typeButtonText, { color: newType === 'credit' ? '#FFFFFF' : (isDarkMode ? '#A1A1AA' : '#71717A') }]}>Income</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Category Selector */}
                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, { color: isDarkMode ? '#A1A1AA' : '#71717A' }]}>Category</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                                    {categories.map(cat => (
                                        <TouchableOpacity
                                            key={cat.id}
                                            style={[styles.chip, {
                                                backgroundColor: newCategory === cat.name ? '#8B5CF6' : (isDarkMode ? '#27272A' : '#F4F4F5')
                                            }]}
                                            onPress={() => setNewCategory(cat.name)}
                                        >
                                            <Text style={{ color: newCategory === cat.name ? '#FFFFFF' : (isDarkMode ? '#A1A1AA' : '#71717A'), fontSize: 12, fontWeight: '600' }}>
                                                {cat.name}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>

                            {/* Notes Input */}
                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, { color: isDarkMode ? '#A1A1AA' : '#71717A' }]}>Notes</Text>
                                <TextInput
                                    style={[styles.input, {
                                        backgroundColor: isDarkMode ? '#27272A' : '#F4F4F5',
                                        color: isDarkMode ? '#FFFFFF' : '#1A1A1D',
                                        borderColor: isDarkMode ? '#3F3F46' : '#E4E4E7'
                                    }]}
                                    placeholder="e.g. Lunch with friends"
                                    placeholderTextColor={isDarkMode ? '#71717A' : '#A1A1AA'}
                                    value={newNotes}
                                    onChangeText={setNewNotes}
                                />
                            </View>

                            <TouchableOpacity
                                style={[styles.saveButton, { opacity: isSubmitting ? 0.7 : 1 }]}
                                onPress={handleAddTransaction}
                                disabled={isSubmitting}
                            >
                                <LinearGradient
                                    colors={['#8B5CF6', '#7C3AED']}
                                    style={styles.saveButtonGradient}
                                >
                                    {isSubmitting ? (
                                        <ActivityIndicator color="#FFFFFF" />
                                    ) : (
                                        <Text style={styles.saveButtonText}>Add Transaction</Text>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    floatingHeader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        paddingTop: Platform.OS === 'ios' ? 44 : StatusBar.currentHeight,
    },
    floatingHeaderGradient: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    floatingBackButton: {},
    floatingTitle: {
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    scrollContent: {
        paddingTop: Platform.OS === 'ios' ? 44 : StatusBar.currentHeight,
        paddingBottom: 40,
    },
    heroSection: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 24,
    },
    heroTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    iconButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backButton: {},
    notificationButton: {
        position: 'relative',
    },
    notificationDot: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#EF4444',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    heroContent: {
        gap: 4,
    },
    heroGreeting: {
        fontSize: 14,
        fontWeight: '500',
    },
    heroTitle: {
        fontSize: 32,
        fontWeight: '800',
        letterSpacing: -1,
    },
    statsGrid: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 12,
        marginBottom: 24,
    },
    statCard: {
        flex: 2,
        borderRadius: 24,
        overflow: 'hidden',
    },
    statGradient: {
        padding: 20,
        minHeight: 200,
        justifyContent: 'space-between',
    },
    statIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.8)',
        marginBottom: 4,
    },
    statAmount: {
        fontSize: 28,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: -0.5,
        marginBottom: 8,
    },
    statBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    statBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    miniStatsColumn: {
        flex: 1,
        gap: 12,
    },
    miniStatCard: {
        flex: 1,
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        justifyContent: 'space-between',
    },
    miniStatIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    miniStatLabel: {
        fontSize: 11,
        fontWeight: '600',
        marginBottom: 4,
    },
    miniStatValue: {
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: -0.3,
    },
    filterSection: {
        marginBottom: 20,
    },
    filterScroll: {
        paddingHorizontal: 20,
        gap: 8,
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 16,
        borderWidth: 1,
    },
    filterChipText: {
        fontSize: 13,
        fontWeight: '700',
    },
    chartCard: {
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
    },
    chartHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    chartTitle: {
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: -0.3,
        marginBottom: 4,
    },
    chartSubtitle: {
        fontSize: 12,
        fontWeight: '500',
    },
    chartMenu: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    chartLoading: {
        height: 220,
        justifyContent: 'center',
        alignItems: 'center',
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
        gap: 8,
    },
    categoryItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 16,
    },
    categoryLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 12,
    },
    categoryDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    categoryInfo: {
        flex: 1,
    },
    categoryName: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 2,
    },
    categoryPercentage: {
        fontSize: 11,
        fontWeight: '500',
    },
    categoryRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    categoryAmount: {
        fontSize: 14,
        fontWeight: '800',
        letterSpacing: -0.2,
    },
    insightCard: {
        marginHorizontal: 20,
        marginBottom: 24,
        borderRadius: 24,
        overflow: 'hidden',
    },
    insightGradient: {
        padding: 20,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 16,
    },
    insightIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    insightContent: {
        flex: 1,
    },
    insightTitle: {
        fontSize: 16,
        fontWeight: '800',
        marginBottom: 6,
        letterSpacing: -0.3,
    },
    insightText: {
        fontSize: 13,
        fontWeight: '500',
        lineHeight: 20,
    },
    transactionsSection: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    seeAllText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#8B5CF6',
    },
    transactionList: {
        borderRadius: 24,
        borderWidth: 1,
        overflow: 'hidden',
    },
    transactionLoading: {
        padding: 40,
    },
    emptyState: {
        padding: 40,
        alignItems: 'center',
        gap: 12,
    },
    emptyText: {
        fontSize: 14,
        fontWeight: '500',
    },
    transactionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#27272A',
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
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 6,
        letterSpacing: -0.2,
    },
    transactionMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    categoryBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        borderWidth: 1,
    },
    categoryBadgeText: {
        fontSize: 10,
        fontWeight: '700',
    },
    transactionDate: {
        fontSize: 11,
        fontWeight: '500',
    },
    transactionRight: {
        alignItems: 'flex-end',
    },
    transactionAmount: {
        fontSize: 15,
        fontWeight: '800',
        letterSpacing: -0.3,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    modalContent: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingTop: 8,
        paddingBottom: 40,
        paddingHorizontal: 20,
        maxHeight: '80%',
    },
    modalHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#52525B',
        alignSelf: 'center',
        marginBottom: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: '800',
        letterSpacing: -0.5,
        marginBottom: 4,
    },
    modalSubtitle: {
        fontSize: 13,
        fontWeight: '500',
    },
    manageButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 12,
    },
    manageButtonText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#8B5CF6',
    },
    categoryScroll: {
        maxHeight: 400,
    },
    categoryOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 16,
        marginBottom: 8,
        borderBottomWidth: 1,
    },
    categoryOptionIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    categoryOptionName: {
        flex: 1,
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    checkmark: {
        marginLeft: 8,
    },
    // New Styles for Add Modal
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 8,
        letterSpacing: 0.3,
    },
    input: {
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 16,
        fontSize: 15,
        fontWeight: '600',
        borderWidth: 1,
    },
    typeButton: {
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    typeButtonText: {
        fontSize: 14,
        fontWeight: '700',
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
    },
    saveButton: {
        borderRadius: 16,
        overflow: 'hidden',
        marginTop: 12,
        marginBottom: 20,
    },
    saveButtonGradient: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
});

export default TransactionScreen;