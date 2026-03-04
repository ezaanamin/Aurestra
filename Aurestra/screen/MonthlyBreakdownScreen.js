import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, SafeAreaView, StatusBar } from 'react-native';
import axios from 'axios';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSettings } from '../context/SettingsContext';
import MonthPickerModal from '../components/MonthPickerModal';
import { API_BASE_URL } from '../API_URL';

const CATEGORY_DETAILS_MAP = {
    "Food & Snacks": { icon: 'food', color: '#FF6B6B' },
    "Movies": { icon: 'movie', color: '#EC4899' },
    "Tea": { icon: 'coffee', color: '#F59E0B' },
    "Therapy": { icon: 'brain', color: '#8B5CF6' },
    "Uber": { icon: 'car', color: '#4ECDC4' },
    "Audible Subscription": { icon: 'headphones', color: '#A78BFA' },
    "Google One Subscription": { icon: 'google', color: '#3B82F6' },
    "Subscription (Google one )": { icon: 'google', color: '#3B82F6' },
    "Ride / Transport": { icon: 'car', color: '#4ECDC4' },
    "Bills & Utilities": { icon: 'receipt', color: '#3B82F6' },
    "Shopping": { icon: 'shopping', color: '#A78BFA' },
    "Healthcare": { icon: 'hospital', color: '#10B981' },
    "Education": { icon: 'school', color: '#F59E0B' },
    "Groceries": { icon: 'cart', color: '#10B981' },
    "Personal Care": { icon: 'sparkles', color: '#8B5CF6' },
    "Online Services": { icon: 'web', color: '#3B82F6' },
    "Gym & Fitness": { icon: 'dumbbell', color: '#FF6B6B' },
    "Income": { icon: 'cash', color: '#10B981' },
    "Bonus": { icon: 'gift', color: '#F59E0B' },
    "Investment": { icon: 'trending-up', color: '#3B82F6' },
    "Uncategorized": { icon: 'help-circle', color: '#000000' },
    "Comic book ": { icon: 'chart-arc', color: '#EC4899' },
    "Bank reduction": { icon: 'bank-transfer-in', color: '#F59E0B' },
    "Research Expenses": { icon: 'receipt', color: '#6366F1' },
    "Reimbursement (Food expense)": { icon: 'human-greeting', color: '#F59E0B' },
    "Miscellaneous": { icon: 'dots-horizontal', color: '#64748B' },
    "Entertainment": { icon: 'movie', color: '#EC4899' }
};

export default function MonthlyBreakdownScreen({ navigation }) {
    const { colors, isDarkMode } = useSettings();
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showPicker, setShowPicker] = useState(false);

    useEffect(() => {
        fetchData();
    }, [month]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/api/categories/monthly?month=${month}`);
            const filteredData = res.data.filter(item => item.category.toLowerCase() !== 'uncategorized');
            setData(filteredData);
        } catch (err) {
            console.error('Error fetching monthly categories:', err);
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    const totalSpending = data.reduce((sum, item) => sum + item.total, 0);

    const formatCurrency = (amount) => {
        const safeAmount = Number(amount) || 0;
        return new Intl.NumberFormat('en-PK', {
            style: 'currency',
            currency: 'PKR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(safeAmount);
    };

    const getMonthName = (monthStr) => {
        try {
            const [y, m] = monthStr.split('-');
            const date = new Date(y, parseInt(m) - 1, 1);
            return date.toLocaleString('default', { month: 'long', year: 'numeric' });
        } catch {
            return monthStr;
        }
    };

    const handleConfirmMonth = (date) => {
        setMonth(date.toISOString().slice(0, 7));
        setShowPicker(false);
    };

    const getCategoryDetails = (categoryName) => {
        if (CATEGORY_DETAILS_MAP[categoryName]) {
            return CATEGORY_DETAILS_MAP[categoryName];
        }
        return CATEGORY_DETAILS_MAP['Miscellaneous'];
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.background} />

            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Icon name="arrow-left" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Monthly Breakdown</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.cardHeader}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.cardTitle, { color: colors.text }]}>Top Spending</Text>
                            <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                                {getMonthName(month)}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.monthButton, { backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC' }]}
                            onPress={() => setShowPicker(true)}
                        >
                            <Icon name="calendar-month" size={16} color="#6366F1" style={{ marginRight: 6 }} />
                            <Text style={[styles.monthButtonText, { color: colors.text }]}>Change Month</Text>
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <View style={styles.stateContainer}>
                            <ActivityIndicator size="large" color="#6366F1" />
                            <Text style={[styles.stateText, { color: colors.textSecondary }]}>Loading breakdown...</Text>
                        </View>
                    ) : data.length === 0 ? (
                        <View style={styles.stateContainer}>
                            <Icon name="basket-off" size={48} color={colors.textSecondary} style={{ marginBottom: 12 }} />
                            <Text style={[styles.stateText, { color: colors.textSecondary }]}>No categorized spending for {getMonthName(month)}</Text>
                        </View>
                    ) : (
                        <View style={styles.listContainer}>
                            {data.map((item, index) => {
                                const percentage = totalSpending > 0 ? (item.total / totalSpending) * 100 : 0;
                                const details = getCategoryDetails(item.category);

                                return (
                                    <View
                                        key={index}
                                        style={[
                                            styles.categoryRow,
                                            { borderBottomColor: colors.border },
                                            index === data.length - 1 && styles.lastRow
                                        ]}
                                    >
                                        <View style={styles.catIconContainer}>
                                            <View style={[styles.iconCircle, { backgroundColor: `${details.color}20` }]}>
                                                <Icon name={details.icon} size={24} color={details.color} />
                                            </View>
                                        </View>

                                        <View style={styles.categoryInfo}>
                                            <Text style={[styles.categoryName, { color: colors.text }]}>{item.category}</Text>

                                            <View style={styles.progressContainer}>
                                                <View style={[styles.progressBarBg, { backgroundColor: isDarkMode ? '#334155' : '#F1F5F9' }]}>
                                                    <View
                                                        style={[
                                                            styles.progressBarFill,
                                                            { width: `${Math.min(percentage, 100)}%`, backgroundColor: details.color }
                                                        ]}
                                                    />
                                                </View>
                                                <Text style={[styles.categoryPercent, { color: colors.textSecondary }]}>
                                                    {percentage.toFixed(0)}%
                                                </Text>
                                            </View>
                                        </View>

                                        <View style={styles.amountContainer}>
                                            <Text style={[styles.categoryAmount, { color: colors.text }]}>
                                                {formatCurrency(item.total)}
                                            </Text>
                                        </View>
                                    </View>
                                );
                            })}

                            <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
                                <Text style={[styles.totalLabel, { color: colors.text }]}>Total Categorized Spent</Text>
                                <Text style={[styles.totalAmount, { color: '#EF4444' }]}>{formatCurrency(totalSpending)}</Text>
                            </View>
                        </View>
                    )}
                </View>
            </ScrollView>

            <MonthPickerModal
                visible={showPicker}
                onConfirm={handleConfirmMonth}
                onCancel={() => setShowPicker(false)}
                isDarkMode={isDarkMode}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
        width: 40,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 40,
    },
    card: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 4,
    },
    cardSubtitle: {
        fontSize: 14,
    },
    monthButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    monthButtonText: {
        fontSize: 12,
        fontWeight: '600',
    },
    stateContainer: {
        paddingVertical: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stateText: {
        marginTop: 12,
        fontSize: 14,
    },
    listContainer: {
        marginTop: 8,
    },
    categoryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    lastRow: {
        borderBottomWidth: 0,
    },
    catIconContainer: {
        marginRight: 16,
    },
    iconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    categoryInfo: {
        flex: 1,
    },
    categoryName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 6,
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    progressBarBg: {
        flex: 1,
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
        marginRight: 8,
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    categoryPercent: {
        fontSize: 12,
        fontWeight: '500',
        width: 30,
    },
    amountContainer: {
        marginLeft: 12,
        alignItems: 'flex-end',
    },
    categoryAmount: {
        fontSize: 16,
        fontWeight: '700',
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 16,
        marginTop: 8,
        borderTopWidth: 1,
    },
    totalLabel: {
        fontSize: 16,
        fontWeight: '600',
    },
    totalAmount: {
        fontSize: 18,
        fontWeight: 'bold',
    }
});
