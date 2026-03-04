import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import axios from 'axios';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSettings } from '../context/SettingsContext';
import { useNavigation } from '@react-navigation/native';
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

export default function MonthlyCategories() {
    const navigation = useNavigation();
    const { colors, isDarkMode } = useSettings();
    const currentMonth = new Date().toISOString().slice(0, 7);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, [currentMonth]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/api/categories/monthly?month=${currentMonth}`);
            // Filter out Uncategorized
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

    const getCategoryDetails = (categoryName) => {
        if (CATEGORY_DETAILS_MAP[categoryName]) {
            return CATEGORY_DETAILS_MAP[categoryName];
        }
        return CATEGORY_DETAILS_MAP['Miscellaneous'];
    };

    return (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>Top Spending</Text>
                    <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                        {getMonthName(currentMonth)}
                    </Text>
                </View>
                <TouchableOpacity
                    style={[styles.monthButton, { backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC' }]}
                    onPress={() => navigation.navigate('MonthlyBreakdown')}
                >
                    <Icon name="chart-pie" size={16} color="#6366F1" style={{ marginRight: 6 }} />
                    <Text style={[styles.monthButtonText, { color: colors.text }]}>Breakdown</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#6366F1" />
                </View>
            ) : data.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={{ color: colors.textSecondary }}>No spending reported for {getMonthName(currentMonth)}</Text>
                </View>
            ) : (
                <View style={styles.listContainer}>
                    {data.map((item, index) => {
                        const percentage = totalSpending > 0 ? (item.total / totalSpending) * 100 : 0;
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
                                    <View style={[styles.iconCircle, { backgroundColor: `${getCategoryDetails(item.category).color}20` }]}>
                                        <Icon name={getCategoryDetails(item.category).icon} size={20} color={getCategoryDetails(item.category).color} />
                                    </View>
                                </View>
                                <View style={styles.categoryInfo}>
                                    <Text style={[styles.categoryName, { color: colors.text }]}>{item.category}</Text>
                                    <Text style={[styles.categoryPercent, { color: colors.textSecondary }]}>
                                        {percentage.toFixed(1)}% of total
                                    </Text>
                                </View>
                                <Text style={[styles.categoryAmount, { color: colors.text }]}>
                                    {formatCurrency(item.total)}
                                </Text>
                            </View>
                        );
                    })}
                </View>
            )}

        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        marginHorizontal: 16,
        marginBottom: 20,
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
        marginBottom: 16,
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
    loadingContainer: {
        paddingVertical: 20,
        alignItems: 'center',
    },
    emptyContainer: {
        paddingVertical: 20,
        alignItems: 'center',
    },
    listContainer: {
        marginTop: 8,
    },
    categoryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    lastRow: {
        borderBottomWidth: 0,
        paddingBottom: 4,
    },
    catIconContainer: {
        marginRight: 12,
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    categoryInfo: {
        flex: 1,
    },
    categoryName: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 4,
    },
    categoryPercent: {
        fontSize: 13,
    },
    categoryAmount: {
        fontSize: 15,
        fontWeight: '700',
    },
});
