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
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useDispatch } from 'react-redux';
import { fetchStatementReport, calculatePreviousStatement } from '../API/slice/API'; // You need to ensure this is exported from API.js
import { useSettings } from '../context/SettingsContext';

const StatementModal = ({ visible, onClose }) => {
    const dispatch = useDispatch();
    const { colors, isDarkMode } = useSettings();
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

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const monthStr = `${year}-${month}`;

        try {
            const result = await dispatch(fetchStatementReport(monthStr)).unwrap();
            setReport(result);
        } catch (err) {
            console.log("Fetch Report Error:", err);
            setError(err || "Failed to load statement");
        } finally {
            setLoading(false);
        }
    };

    const handleCalculate = async (force = false) => {
        setLoading(true);
        setError(null);
        setReport(null);

        const year = selectedMonth.getFullYear();
        const month = String(selectedMonth.getMonth() + 1).padStart(2, '0');
        const monthStr = `${year}-${month}`;

        try {
            // Passing object with force flag
            const result = await dispatch(calculatePreviousStatement({
                month: monthStr,
                force: force
            })).unwrap();

            setReport(result);
        } catch (err) {
            setError(err || "Calculation failed");
        } finally {
            setLoading(false);
        }
    };

    const handleSelectBalance = async (emailIndex, balanceValue) => {
        setLoading(true);
        setReport(null);

        const year = selectedMonth.getFullYear();
        const month = String(selectedMonth.getMonth() + 1).padStart(2, '0');
        const monthStr = `${year}-${month}`;

        try {
            // Confirm with selected balance
            const result = await dispatch(calculatePreviousStatement({
                month: monthStr,
                confirmed: true,
                user_selected_balance: balanceValue
            })).unwrap();

            setReport(result);
        } catch (err) {
            setError(err || "Confirmation failed");
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
        if (!data || Object.keys(data).length === 0) return <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No data available</Text>;

        return Object.entries(data).map(([category, amount]) => (
            <View key={category} style={styles.breakdownRow}>
                <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>{category}</Text>
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
            <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}>
                <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={colors.text} />
                        </TouchableOpacity>
                        <Text style={[styles.title, { color: colors.text }]}>E-Statement Analysis</Text>
                        <TouchableOpacity onPress={() => handleCalculate(true)}>
                            <Ionicons name="refresh" size={24} color={colors.primary} />
                        </TouchableOpacity>
                    </View>

                    {/* Month Selector */}
                    <View style={[styles.monthSelector, { backgroundColor: colors.card }]}>
                        <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.arrowBtn}>
                            <Ionicons name="chevron-back" size={20} color={colors.primary} />
                        </TouchableOpacity>
                        <View>
                            <Text style={[styles.monthText, { color: colors.text }]}>
                                {selectedMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                            </Text>
                            <Text style={[styles.subMonthText, { color: colors.textSecondary }]}>
                                (Visualizing: {report?.target_month || '...'})
                            </Text>
                        </View>
                        <TouchableOpacity onPress={() => changeMonth(1)} style={styles.arrowBtn}>
                            <Ionicons name="chevron-forward" size={20} color={colors.primary} />
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
                    ) : error ? (
                        <View style={[styles.statusCard, { backgroundColor: colors.card, padding: 30 }]}>
                            <Ionicons name="information-circle-outline" size={48} color={colors.primary} style={{ marginBottom: 16 }} />
                            <Text style={[styles.sectionTitle, { color: colors.text, textAlign: 'center', marginBottom: 8 }]}>
                                No Analysis Found
                            </Text>
                            <Text style={[styles.statusLabel, { color: colors.textSecondary, textAlign: 'center', fontWeight: '400', marginBottom: 20 }]}>
                                {typeof error === 'string' ? error : 'Data not available for this month.'}
                            </Text>

                            {/* Hide Retry button if it's a "Wait" message */}
                            {!String(error).includes("Wait") && (
                                <View style={{ flexDirection: 'row', gap: 10 }}>
                                    <TouchableOpacity onPress={onClose} style={[styles.retryBtn, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}>
                                        <Text style={[styles.retryText, { color: colors.text }]}>Close</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => handleCalculate()} style={[styles.retryBtn, { backgroundColor: colors.primary }]}>
                                        <Text style={styles.retryText}>Fetch from Email</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    ) : report ? (
                        report.requires_selection ? (
                            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                                <View style={[styles.statusCard, { backgroundColor: colors.primary + '10', borderColor: colors.primary, borderWidth: 1 }]}>
                                    <Ionicons name="shield-checkmark" size={32} color={colors.primary} style={{ marginBottom: 10 }} />
                                    <Text style={[styles.sectionTitle, { color: colors.text, textAlign: 'center' }]}>Manual Verification Required</Text>
                                    <Text style={[styles.statusLabel, { color: colors.textSecondary, textAlign: 'center', marginTop: 5 }]}>
                                        I found multiple potential balances in the PDF. Please select the correct Closing Balance:
                                    </Text>
                                </View>

                                {report.all_email_data.map((email, eIdx) => (
                                    <View key={eIdx} style={styles.emailBatch}>
                                        <View style={styles.emailHeader}>
                                            <Ionicons name="mail-outline" size={16} color={colors.textSecondary} />
                                            <Text style={[styles.emailHeaderText, { color: colors.textSecondary }]}>
                                                Statement Date: {new Date(email.date).toLocaleDateString()}
                                            </Text>
                                        </View>

                                        {email.balance_table.map((row, rIdx) => (
                                            <TouchableOpacity
                                                key={rIdx}
                                                style={[styles.balanceOption, { backgroundColor: colors.card, borderColor: colors.border }]}
                                                onPress={() => handleSelectBalance(eIdx, row.balance_value)}
                                            >
                                                <View style={styles.balanceInfo}>
                                                    <View style={[styles.typeTag, { backgroundColor: row.type === 'CLOSING' ? colors.primary + '20' : '#8882' }]}>
                                                        <Text style={[styles.typeTagText, { color: row.type === 'CLOSING' ? colors.primary : colors.textSecondary }]}>
                                                            {row.type}
                                                        </Text>
                                                    </View>
                                                    <Text style={[styles.balanceVal, { color: colors.text }]}>{formatCurrency(row.balance_value)}</Text>
                                                </View>
                                                <Text style={[styles.balanceDesc, { color: colors.textSecondary }]} numberOfLines={1}>
                                                    {row.description}
                                                </Text>
                                                <Ionicons name="chevron-forward" size={20} color={colors.primary} />
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                ))}

                                <TouchableOpacity
                                    style={[styles.retryBtn, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, marginTop: 20 }]}
                                    onPress={() => handleSelectBalance(0, report.suggested_balances.closing_balance)}
                                >
                                    <Text style={[styles.retryText, { color: colors.text }]}>Use Suggested: {formatCurrency(report.suggested_balances.closing_balance)}</Text>
                                </TouchableOpacity>
                            </ScrollView>
                        ) : (
                            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                                {/* Existing report view ... */}
                                <View style={[styles.statusCard, {
                                    backgroundColor: report.summary.status === 'Surplus'
                                        ? (colors.success + '20')
                                        : (colors.error + '20')
                                }]}>
                                    <Text style={[styles.statusLabel, { color: report.summary.status === 'Surplus' ? colors.success : colors.error }]}>
                                        {(report.summary.status || 'Unknown').toUpperCase()}
                                    </Text>
                                    <Text style={[styles.statusAmount, { color: report.summary.status === 'Surplus' ? colors.success : colors.error }]}>
                                        {formatCurrency(report.summary.net)}
                                    </Text>
                                </View>

                                {/* Processing Status Label */}
                                {report.processing_status && (
                                    <View style={[styles.processingLabel, {
                                        backgroundColor: report.processing_status === 'success' ? '#10B98110' : '#F59E0B20',
                                        borderColor: report.processing_status === 'success' ? '#10B981' : '#F59E0B',
                                        marginBottom: 16
                                    }]}>
                                        <Icon
                                            name={report.processing_status === 'success' ? 'check-circle' : 'alert-circle'}
                                            size={16}
                                            color={report.processing_status === 'success' ? '#10B981' : '#F59E0B'}
                                        />
                                        <Text style={[styles.processingLabelText, {
                                            color: report.processing_status === 'success' ? '#10B981' : '#F59E0B'
                                        }]}>
                                            {report.processing_status === 'success'
                                                ? 'Statement processed successfully'
                                                : `Processing: ${report.processing_status}`}
                                        </Text>
                                    </View>
                                )}

                                {/* Read/Unread Status Label */}
                                {report.read_status && (
                                    <View style={[styles.readStatusLabel, {
                                        backgroundColor: report.read_status === 'read' ? '#3B82F610' : '#EF444410',
                                        borderColor: report.read_status === 'read' ? '#3B82F6' : '#EF4444',
                                        marginBottom: 16
                                    }]}>
                                        <Icon
                                            name={report.read_status === 'read' ? 'eye' : 'eye-off'}
                                            size={16}
                                            color={report.read_status === 'read' ? '#3B82F6' : '#EF4444'}
                                        />
                                        <Text style={[styles.readStatusText, {
                                            color: report.read_status === 'read' ? '#3B82F6' : '#EF4444'
                                        }]}>
                                            {report.read_status === 'read'
                                                ? `✓ Read (Balance applied ${report.reviewed_at ? 'on ' + new Date(report.reviewed_at).toLocaleDateString() : ''})`
                                                : '⚠ Unread (Balance will be added on View)'}
                                        </Text>
                                    </View>
                                )}

                                {/* Balance Summary */}
                                <View style={styles.section}>
                                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Balance Summary</Text>

                                    {/* Balance Match Label */}
                                    {report.balance_matches !== undefined && (
                                        <View style={[styles.balanceLabel, {
                                            backgroundColor: report.balance_matches ? '#10B98120' : '#EF444420',
                                            borderColor: report.balance_matches ? '#10B981' : '#EF4444',
                                            marginBottom: 12
                                        }]}>
                                            <Icon
                                                name={report.balance_matches ? 'check-circle' : 'alert-circle'}
                                                size={18}
                                                color={report.balance_matches ? '#10B981' : '#EF4444'}
                                            />
                                            <Text style={[styles.balanceLabelText, {
                                                color: report.balance_matches ? '#10B981' : '#EF4444'
                                            }]}>
                                                {report.balance_matches
                                                    ? '✓ Closing balance matches account'
                                                    : '⚠ Closing balance mismatch'}
                                            </Text>
                                        </View>
                                    )}

                                    <View style={[styles.row, { backgroundColor: colors.card }]}>
                                        <View style={styles.col}>
                                            <Text style={[styles.label, { color: colors.textSecondary }]}>Opening</Text>
                                            <Text style={[styles.value, { color: colors.text }]}>{formatCurrency(report.opening_balance)}</Text>
                                        </View>
                                        <View style={styles.col}>
                                            <Text style={[styles.label, { color: colors.textSecondary }]}>Closing</Text>
                                            <Text style={[styles.value, { color: colors.text }]}>{formatCurrency(report.closing_balance)}</Text>
                                        </View>
                                    </View>

                                    {/* Account Balance Row */}
                                    {report.account_balance !== undefined && (
                                        <View style={[styles.row, { backgroundColor: colors.card, marginTop: 8 }]}>
                                            <View style={styles.col}>
                                                <Text style={[styles.label, { color: colors.textSecondary }]}>Account Balance</Text>
                                                <Text style={[styles.value, { color: colors.text }]}>{formatCurrency(report.account_balance)}</Text>
                                            </View>
                                            <View style={styles.col}>
                                                <Text style={[styles.label, { color: colors.textSecondary }]}>Difference</Text>
                                                <Text style={[styles.value, {
                                                    color: report.balance_matches ? colors.textSecondary : '#EF4444'
                                                }]}>
                                                    {formatCurrency(Math.abs(report.closing_balance - report.account_balance))}
                                                </Text>
                                            </View>
                                        </View>
                                    )}
                                </View>

                                {/* Income Breakdown */}
                                <View style={styles.section}>
                                    <View style={styles.sectionHeader}>
                                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Income (Money In)</Text>
                                        <Text style={[styles.sectionTitle, { color: colors.success }]}>{formatCurrency(report.summary.income)}</Text>
                                    </View>
                                    <View style={[styles.card, { backgroundColor: colors.card }]}>
                                        {renderBreakdown(report.breakdown?.income, colors.success)}
                                    </View>
                                </View>

                                {/* Expenses Breakdown */}
                                <View style={styles.section}>
                                    <View style={styles.sectionHeader}>
                                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Expenses (Money Out)</Text>
                                        <Text style={[styles.sectionTitle, { color: colors.error }]}>{formatCurrency(report.summary?.expenses)}</Text>
                                    </View>
                                    <View style={[styles.card, { backgroundColor: colors.card }]}>
                                        {renderBreakdown(report.breakdown?.expenses, colors.error)}
                                    </View>
                                </View>

                                {/* Transaction Table */}
                                {!!(report.data && report.data.length > 0) && (
                                    <View style={[styles.section, { paddingBottom: 40 }]}>
                                        <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 12 }]}>
                                            PROCESSED TRANSACTIONS
                                        </Text>

                                        {/* Table Header */}
                                        <View style={[styles.tableHeader, { backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9' }]}>
                                            <Text style={[styles.headerCell, { flex: 0.15, color: colors.textSecondary }]}>Date</Text>
                                            <Text style={[styles.headerCell, { flex: 0.55, color: colors.textSecondary }]}>Description</Text>
                                            <Text style={[styles.headerCell, { flex: 0.3, color: colors.textSecondary, textAlign: 'right' }]}>Amount</Text>
                                        </View>

                                        <View style={[styles.tableContainer, { backgroundColor: colors.card, borderColor: isDarkMode ? '#334155' : '#E2E8F0' }]}>
                                            {report.data.map((tx, idx) => {
                                                // Date Parsing (Extracting part of logic from HomeScreen)
                                                let displayDate = tx.date;
                                                return (
                                                    <View key={idx} style={[styles.tableRow, { borderBottomWidth: idx === report.data.length - 1 ? 0 : 1, borderBottomColor: isDarkMode ? '#1E293B' : '#F8FAFC' }]}>
                                                        <Text style={[styles.cell, { flex: 0.15, color: colors.textSecondary }]}>{displayDate.split('/')[0]}/{displayDate.split('/')[1]}</Text>
                                                        <Text style={[styles.cell, { flex: 0.55, color: colors.text }]} numberOfLines={1}>{tx.description}</Text>
                                                        <Text style={[styles.cell, { flex: 0.3, color: tx.type === 'credit' ? '#10B981' : '#EF4444', textAlign: 'right', fontWeight: 'bold' }]}>
                                                            {tx.type === 'credit' ? '+' : '-'}{tx.amount}
                                                        </Text>
                                                    </View>
                                                );
                                            })}
                                        </View>
                                    </View>
                                )}
                            </ScrollView>
                        )
                    ) : null}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalContent: {
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
    },
    monthSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
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
        textAlign: 'center',
    },
    subMonthText: {
        fontSize: 12,
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
    },
    card: {
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
        padding: 16,
        borderRadius: 12,
    },
    col: {
        flex: 1,
        alignItems: 'center',
    },
    label: {
        fontSize: 12,
        marginBottom: 4,
    },
    value: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    breakdownRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    breakdownLabel: {
        fontSize: 14,
    },
    breakdownAmount: {
        fontSize: 14,
        fontWeight: '600',
    },
    emptyText: {
        textAlign: 'center',
        fontSize: 14,
        fontStyle: 'italic',
    },
    errorContainer: {
        alignItems: 'center',
        marginTop: 40,
    },
    errorText: {
        marginBottom: 16,
    },
    retryBtn: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    retryText: {
        color: '#FFF',
        fontWeight: '600',
    },
    balanceLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 12,
        borderRadius: 10,
        borderWidth: 1.5,
    },
    balanceLabelText: {
        fontSize: 13,
        fontWeight: '600',
        flex: 1,
    },
    processingLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
    },
    processingLabelText: {
        fontSize: 12,
        fontWeight: '600',
        flex: 1,
    },
    readStatusLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
    },
    readStatusText: {
        fontSize: 12,
        fontWeight: '600',
        flex: 1,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    tableHeader: {
        flexDirection: 'row',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
    },
    headerCell: {
        fontSize: 12,
        fontWeight: '600',
    },
    tableContainer: {
        borderWidth: 1,
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
        overflow: 'hidden',
    },
    tableRow: {
        flexDirection: 'row',
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    cell: {
        fontSize: 12,
    },
    emailBatch: {
        marginBottom: 20,
    },
    emailHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 10,
        paddingHorizontal: 5,
    },
    emailHeaderText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    balanceOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
        gap: 12,
    },
    balanceInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    balanceVal: {
        fontSize: 15,
        fontWeight: 'bold',
    },
    balanceDesc: {
        flex: 1.5,
        fontSize: 11,
    },
    typeTag: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    typeTagText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
});

export default StatementModal;
