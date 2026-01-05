import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    FlatList
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useDispatch } from 'react-redux';
import { fetchStatementReport } from '../API/slice/API'; // You need to ensure this is exported from API.js

const StatementModal = ({ visible, onClose }) => {
    const dispatch = useDispatch();
    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(new Date()); // Default to current month
    const [error, setError] = useState(null);

    // Initial Fetch when modal opens
    useEffect(() => {
        if (visible) {
            fetchReport();
        }
    }, [visible]);

    const fetchReport = async (date = selectedMonth) => {
        setLoading(true);
        setError(null);
        setReport(null);

        const monthStr = date.toISOString().slice(0, 7); // YYYY-MM

        try {
            const result = await dispatch(fetchStatementReport(monthStr)).unwrap();
            setReport(result);
        } catch (err) {
            setError(err || "Failed to load statement");
        } finally {
            setLoading(false);
        }
    };

    const changeMonth = (offset) => {
        const newDate = new Date(selectedMonth);
        newDate.setMonth(newDate.getMonth() + offset);
        setSelectedMonth(newDate);
        fetchReport(newDate);
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-PK', {
            style: 'currency',
            currency: 'PKR',
            minimumFractionDigits: 0,
        }).format(amount || 0);
    };

    const renderBreakdown = (data, color) => {
        if (!data || Object.keys(data).length === 0) return <Text style={styles.emptyText}>No data available</Text>;

        return Object.entries(data).map(([category, amount]) => (
            <View key={category} style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>{category}</Text>
                <Text style={[styles.breakdownAmount, { color }]}>{formatCurrency(amount)}</Text>
            </View>
        ));
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color="#1E293B" />
                        </TouchableOpacity>
                        <Text style={styles.title}>E-Statement Analysis</Text>
                        <View style={{ width: 24 }} />
                    </View>

                    {/* Month Selector */}
                    <View style={styles.monthSelector}>
                        <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.arrowBtn}>
                            <Ionicons name="chevron-back" size={20} color="#3B82F6" />
                        </TouchableOpacity>
                        <View>
                            <Text style={styles.monthText}>
                                {selectedMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                            </Text>
                            <Text style={styles.subMonthText}>
                                (Visualizing: {report?.target_month || '...'})
                            </Text>
                        </View>
                        <TouchableOpacity onPress={() => changeMonth(1)} style={styles.arrowBtn}>
                            <Ionicons name="chevron-forward" size={20} color="#3B82F6" />
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 40 }} />
                    ) : error ? (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorText}>{typeof error === 'string' ? error : 'Failed to load data'}</Text>
                            <TouchableOpacity onPress={() => fetchReport()} style={styles.retryBtn}>
                                <Text style={styles.retryText}>Retry</Text>
                            </TouchableOpacity>
                        </View>
                    ) : report ? (
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                            {/* Status Card */}
                            <View style={[styles.statusCard, { backgroundColor: report.summary.status === 'Surplus' ? '#DCFCE7' : '#FEE2E2' }]}>
                                <Text style={[styles.statusLabel, { color: report.summary.status === 'Surplus' ? '#166534' : '#991B1B' }]}>
                                    {report.summary.status.toUpperCase()}
                                </Text>
                                <Text style={[styles.statusAmount, { color: report.summary.status === 'Surplus' ? '#166534' : '#991B1B' }]}>
                                    {formatCurrency(report.summary.net)}
                                </Text>
                            </View>

                            {/* Balance Summary */}
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Balance Summary</Text>
                                <View style={styles.row}>
                                    <View style={styles.col}>
                                        <Text style={styles.label}>Opening</Text>
                                        <Text style={styles.value}>{formatCurrency(report.opening_balance)}</Text>
                                    </View>
                                    <View style={styles.col}>
                                        <Text style={styles.label}>Closing</Text>
                                        <Text style={styles.value}>{formatCurrency(report.closing_balance)}</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Income Breakdown */}
                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <Text style={styles.sectionTitle}>Income (Money In)</Text>
                                    <Text style={[styles.sectionTitle, { color: '#10B981' }]}>{formatCurrency(report.summary.income)}</Text>
                                </View>
                                <View style={styles.card}>
                                    {renderBreakdown(report.breakdown.income, '#10B981')}
                                </View>
                            </View>

                            {/* Expenses Breakdown */}
                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <Text style={styles.sectionTitle}>Expenses (Money Out)</Text>
                                    <Text style={[styles.sectionTitle, { color: '#EF4444' }]}>{formatCurrency(report.summary.expenses)}</Text>
                                </View>
                                <View style={styles.card}>
                                    {renderBreakdown(report.breakdown.expenses, '#EF4444')}
                                </View>
                            </View>

                        </ScrollView>
                    ) : null}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#F8FAFC',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        height: '85%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1E293B',
    },
    monthSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    arrowBtn: {
        padding: 8,
    },
    monthText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1E293B',
        textAlign: 'center',
    },
    subMonthText: {
        fontSize: 12,
        color: '#64748B',
        textAlign: 'center',
        marginTop: 2
    },
    statusCard: {
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        marginBottom: 20,
    },
    statusLabel: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
        letterSpacing: 1,
    },
    statusAmount: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    section: {
        marginBottom: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1E293B',
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 12,
    },
    col: {
        flex: 1,
        alignItems: 'center',
    },
    label: {
        fontSize: 12,
        color: '#64748B',
        marginBottom: 4,
    },
    value: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1E293B',
    },
    breakdownRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    breakdownLabel: {
        fontSize: 14,
        color: '#334155',
    },
    breakdownAmount: {
        fontSize: 14,
        fontWeight: '600',
    },
    emptyText: {
        textAlign: 'center',
        color: '#94A3B8',
        fontSize: 14,
        fontStyle: 'italic',
    },
    errorContainer: {
        alignItems: 'center',
        marginTop: 40,
    },
    errorText: {
        color: '#EF4444',
        marginBottom: 16,
    },
    retryBtn: {
        backgroundColor: '#3B82F6',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    retryText: {
        color: '#FFF',
        fontWeight: '600',
    },
});

export default StatementModal;
