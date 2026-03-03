import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import axios from 'axios';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSettings } from '../context/SettingsContext';
import MonthPickerModal from './MonthPickerModal';
import { API_BASE_URL } from '../API_URL';

export default function MonthlyCategories() {
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
            setData(res.data);
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

    return (
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
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#6366F1" />
                </View>
            ) : data.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={{ color: colors.textSecondary }}>No spending reported for {getMonthName(month)}</Text>
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

            <MonthPickerModal
                visible={showPicker}
                onConfirm={handleConfirmMonth}
                onCancel={() => setShowPicker(false)}
                isDarkMode={isDarkMode}
            />
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
