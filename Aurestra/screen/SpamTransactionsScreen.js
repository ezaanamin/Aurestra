import React, { useState, useEffect } from 'react';
import {
    View,
    StyleSheet,
    StatusBar,
    Text,
    FlatList,
    TouchableOpacity,
    SafeAreaView,
    ActivityIndicator,
    ToastAndroid,
    Modal,
    ScrollView,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useSettings } from '../context/SettingsContext';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MCIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import {
    fetchSpamTransactions,
    deleteTransaction,
    updateTransaction,
    fetchCategories,
} from '../API/slice/API';

const SpamTransactionsScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const { currency, colors, isDarkMode } = useSettings();

    // Redux State
    const spamTransactions = useSelector((state) => state.API?.spamTransactions || []);
    const spamStatus = useSelector((state) => state.API?.spamTransactionsStatus || 'idle');
    const categories = useSelector((state) => state.API?.categories || []);

    // Local State
    const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = () => {
        dispatch(fetchSpamTransactions());
        dispatch(fetchCategories());
    };

    const formatCurrency = (amount) => {
        const safeAmount = Number(amount);
        if (isNaN(safeAmount)) return new Intl.NumberFormat('en-PK', { style: 'currency', currency, minimumFractionDigits: 0 }).format(0);
        return new Intl.NumberFormat('en-PK', {
            style: 'currency',
            currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(safeAmount);
    };

    const handleTransactionPress = (transaction) => {
        setSelectedTransaction(transaction);
        setCategoryPickerVisible(true);
    };

    const handleCategorySelect = async (category) => {
        try {
            await dispatch(updateTransaction({
                id: selectedTransaction.id,
                data: { category_id: category.id, is_spam: false } // Unmark as spam when categorized
            })).unwrap();

            ToastAndroid.show('✓ Transaction restored and categorized', ToastAndroid.SHORT);
            setCategoryPickerVisible(false);
            dispatch(fetchSpamTransactions());
        } catch (error) {
            ToastAndroid.show('✗ Update failed', ToastAndroid.SHORT);
        }
    };

    const handleDelete = async (txnId) => {
        try {
            await dispatch(deleteTransaction(txnId)).unwrap();
            ToastAndroid.show('Transaction deleted permanently', ToastAndroid.SHORT);
            setCategoryPickerVisible(false);
            dispatch(fetchSpamTransactions());
        } catch (e) {
            ToastAndroid.show('Failed to delete', ToastAndroid.SHORT);
        }
    };

    const renderTransaction = ({ item }) => {
        const isIncome = item.type === 'credit';
        const merchant = item.notes || item.sender || item.receiver || 'Transaction';
        const amount = item.amount || 0;

        return (
            <TouchableOpacity
                style={[
                    styles.transactionRow,
                    { backgroundColor: colors.card, borderColor: colors.border }
                ]}
                onPress={() => handleTransactionPress(item)}
                activeOpacity={0.7}
            >
                <View style={styles.iconContainer}>
                    <LinearGradient
                        colors={['#94A3B8', '#64748B']}
                        style={styles.iconGradient}
                    >
                        <Ionicons
                            name="warning"
                            size={20}
                            color="#FFFFFF"
                        />
                    </LinearGradient>
                </View>

                <View style={styles.transactionDetails}>
                    <Text style={[styles.merchantName, { color: colors.text }]} numberOfLines={1}>
                        {merchant}
                    </Text>
                    <View style={styles.transactionMetaRow}>
                        <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} />
                        <Text style={[styles.transactionDate, { color: colors.textSecondary }]}>
                            {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </Text>
                    </View>
                </View>

                <View style={styles.rightSection}>
                    <Text style={[styles.amount, { color: colors.textSecondary, textDecorationLine: 'line-through' }]}>
                        {formatCurrency(Math.abs(amount))}
                    </Text>
                    <View style={styles.categoryChip}>
                        <LinearGradient
                            colors={['#64748B', '#475569']}
                            style={styles.categoryChipGradient}
                        >
                            <Ionicons name="alert-circle-outline" size={10} color="#FFFFFF" />
                            <Text style={styles.categoryChipText}>Spam</Text>
                        </LinearGradient>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar
                barStyle="light-content"
                backgroundColor={isDarkMode ? '#0F172A' : '#1E293B'}
            />

            <LinearGradient
                colors={isDarkMode ? ['#0F172A', '#1E293B', '#334155'] : ['#1E293B', '#334155', '#475569']}
                style={styles.header}
            >
                <View style={styles.headerContent}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <View style={styles.headerTitleRow}>
                            <Ionicons name="warning" size={22} color="#FFFFFF" />
                            <Text style={styles.headerTitle}>Spam Folder</Text>
                        </View>
                    </View>
                    <View style={{ width: 40 }} />
                </View>
            </LinearGradient>

            {spamStatus === 'loading' ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#F59E0B" />
                </View>
            ) : spamTransactions.length === 0 ? (
                <View style={styles.centerContainer}>
                    <Ionicons name="shield-checkmark-outline" size={80} color={colors.textSecondary} />
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>No Spam Found</Text>
                    <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                        Your inbox is clean of spam transactions
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={spamTransactions}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderTransaction}
                    contentContainerStyle={styles.listContent}
                />
            )}

            <Modal
                animationType="slide"
                transparent={true}
                visible={categoryPickerVisible}
                onRequestClose={() => setCategoryPickerVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Spam Action</Text>
                            <TouchableOpacity onPress={() => setCategoryPickerVisible(false)}>
                                <Ionicons name="close" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.specialActionsRow}>
                            <TouchableOpacity
                                style={[styles.specialActionButton, { backgroundColor: '#EF444415' }]}
                                onPress={() => handleDelete(selectedTransaction?.id)}
                            >
                                <Ionicons name="trash-outline" size={20} color="#EF4444" />
                                <Text style={[styles.specialActionText, { color: '#EF4444' }]}>Delete Permanently</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={[styles.categoryListTitle, { color: colors.textSecondary }]}>
                            Restore & Categorize
                        </Text>
                        <ScrollView style={styles.categoryList}>
                            {categories
                                .filter(cat => {
                                    const isSpending = !selectedTransaction || selectedTransaction.type === 'debit';
                                    if (isSpending) {
                                        return cat.cat_type === 'spending' || cat.cat_type === 'both';
                                    } else {
                                        return cat.cat_type === 'income' || cat.cat_type === 'both';
                                    }
                                })
                                .map((cat) => (
                                    <TouchableOpacity
                                        key={cat.id}
                                        style={[styles.categoryOption, { borderBottomColor: colors.border }]}
                                        onPress={() => handleCategorySelect(cat)}
                                    >
                                        <MCIcon name={cat.icon || 'tag'} size={22} color={cat.color || '#64748B'} />
                                        <Text style={[styles.categoryOptionName, { color: colors.text }]}>{cat.name}</Text>
                                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
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
    container: { flex: 1 },
    header: { paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
    headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16 },
    backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.1)', justifyContent: 'center', alignItems: 'center' },
    headerTitleContainer: { flex: 1, alignItems: 'center' },
    headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF' },
    transactionRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, marginHorizontal: 20 },
    iconContainer: { marginRight: 14 },
    iconGradient: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
    transactionDetails: { flex: 1 },
    merchantName: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
    transactionMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    transactionDate: { fontSize: 12 },
    rightSection: { alignItems: 'flex-end', gap: 6 },
    amount: { fontSize: 16, fontWeight: 'bold' },
    categoryChip: { borderRadius: 8, overflow: 'hidden' },
    categoryChipGradient: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 2 },
    categoryChipText: { fontSize: 10, fontWeight: 'bold', color: '#FFFFFF' },
    listContent: { paddingVertical: 20 },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    emptyTitle: { fontSize: 22, fontWeight: 'bold', marginTop: 16 },
    emptySubtitle: { fontSize: 14, textAlign: 'center', marginTop: 8 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 30, maxHeight: '80%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
    modalTitle: { fontSize: 18, fontWeight: 'bold' },
    specialActionsRow: { paddingHorizontal: 20, paddingBottom: 10 },
    specialActionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, gap: 8 },
    specialActionText: { fontSize: 14, fontWeight: 'bold' },
    categoryListTitle: { fontSize: 12, fontWeight: 'bold', paddingHorizontal: 20, paddingVertical: 10, textTransform: 'uppercase' },
    categoryList: { paddingHorizontal: 20 },
    categoryOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1 },
    categoryOptionName: { flex: 1, fontSize: 16, marginLeft: 12 },
});

export default SpamTransactionsScreen;
