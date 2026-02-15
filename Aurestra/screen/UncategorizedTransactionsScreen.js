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
    TextInput,
    Animated,
    Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useSettings } from '../context/SettingsContext';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MCIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import {
    fetchUncategorizedTransactions,
    bulkCategorizeTransactions,
    updateTransaction,
    fetchCategories,
    getSuggestedCategory,
    createCategorizationRule,
    deleteTransaction,
    markAsSpam,
    bulkDeleteTransactions,
    bulkMarkAsSpam,
} from '../API/slice/API';

const UncategorizedTransactionsScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const { currency, colors, isDarkMode } = useSettings();

    // Redux State
    const uncategorizedTransactions = useSelector((state) => state.API?.uncategorizedTransactions || []);
    const uncategorizedStatus = useSelector((state) => state.API?.uncategorizedStatus || 'idle');
    const categories = useSelector((state) => state.API?.categories || []);

    // Local State
    const [bulkMode, setBulkMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = () => {
        dispatch(fetchUncategorizedTransactions());
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
        if (bulkMode) {
            toggleSelection(transaction.id);
        } else {
            const merchant = transaction.notes || transaction.sender || transaction.receiver || '';
            if (merchant) {
                dispatch(getSuggestedCategory(merchant));
            }
            setSelectedTransaction(transaction);
            setCategoryPickerVisible(true);
        }
    };

    const toggleSelection = (id) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );
    };

    const selectAll = () => {
        setSelectedIds(uncategorizedTransactions.map((t) => t.id));
    };

    const deselectAll = () => {
        setSelectedIds([]);
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;

        Alert.alert(
            'Delete Transactions',
            `Are you sure you want to delete ${selectedIds.length} transactions?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await dispatch(bulkDeleteTransactions({ transaction_ids: selectedIds })).unwrap();
                            ToastAndroid.show(`✓ ${selectedIds.length} transactions deleted`, ToastAndroid.SHORT);
                            setSelectedIds([]);
                            setBulkMode(false);
                        } catch (error) {
                            ToastAndroid.show('✗ Failed to delete', ToastAndroid.SHORT);
                        }
                    }
                }
            ]
        );
    };

    const handleBulkSpam = async () => {
        if (selectedIds.length === 0) return;

        try {
            await dispatch(bulkMarkAsSpam({ transaction_ids: selectedIds })).unwrap();
            ToastAndroid.show(`✓ ${selectedIds.length} marked as spam`, ToastAndroid.SHORT);
            setSelectedIds([]);
            setBulkMode(false);
        } catch (error) {
            ToastAndroid.show('✗ Failed to mark as spam', ToastAndroid.SHORT);
        }
    };

    const handleCategorySelect = async (category) => {
        if (bulkMode) {
            try {
                await dispatch(bulkCategorizeTransactions({
                    transaction_ids: selectedIds,
                    category_id: category.id
                })).unwrap();

                ToastAndroid.show(`✓ ${selectedIds.length} transactions categorized`, ToastAndroid.SHORT);
                setSelectedIds([]);
                setBulkMode(false);
                setCategoryPickerVisible(false);
            } catch (error) {
                ToastAndroid.show('✗ Failed to categorize', ToastAndroid.SHORT);
            }
        } else {
            try {
                const response = await dispatch(updateTransaction({
                    id: selectedTransaction.id,
                    data: {
                        purpose: category.name,
                        category_id: category.id
                    }
                })).unwrap();

                ToastAndroid.show('✓ Category updated', ToastAndroid.SHORT);
                setCategoryPickerVisible(false);
                dispatch(fetchUncategorizedTransactions());
            } catch (error) {
                console.error("Update error:", error);
                ToastAndroid.show('✗ Update failed', ToastAndroid.SHORT);
            }
        }
    };



    const renderTransaction = ({ item, index }) => {
        const isSelected = selectedIds.includes(item.id);
        const isIncome = item.type === 'credit';
        const merchant = item.notes || item.sender || item.receiver || 'Transaction';
        const amount = item.amount || 0;

        return (
            <TouchableOpacity
                style={[
                    styles.transactionRow,
                    { backgroundColor: colors.card, borderColor: colors.border },
                    isSelected && styles.transactionRowSelected
                ]}
                onPress={() => handleTransactionPress(item)}
                activeOpacity={0.7}
            >
                {bulkMode && (
                    <View style={styles.checkbox}>
                        {isSelected ? (
                            <LinearGradient
                                colors={['#3B82F6', '#2563EB']}
                                style={styles.checkboxSelected}
                            >
                                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                            </LinearGradient>
                        ) : (
                            <View style={[styles.checkboxUnselected, { borderColor: colors.border }]} />
                        )}
                    </View>
                )}

                <View style={styles.iconContainer}>
                    <LinearGradient
                        colors={isIncome ? ['#10B981', '#059669'] : ['#64748B', '#475569']}
                        style={styles.iconGradient}
                    >
                        <Ionicons
                            name={isIncome ? 'arrow-down' : 'arrow-up'}
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
                    <Text style={[styles.amount, { color: isIncome ? '#10B981' : colors.text }]}>
                        {isIncome ? '+' : '-'}{formatCurrency(Math.abs(amount))}
                    </Text>
                    <View style={styles.categoryChip}>
                        <LinearGradient
                            colors={['#F59E0B', '#D97706']}
                            style={styles.categoryChipGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <Ionicons name="pricetag-outline" size={10} color="#FFFFFF" />
                            <Text style={styles.categoryChipText}>Uncategorized</Text>
                        </LinearGradient>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const finalCategories = categories.filter((cat) => {
        const query = searchQuery.toLowerCase();
        const matchesSearch = (cat.name || '').toLowerCase().includes(query);

        if (!matchesSearch) return false;

        // If a transaction is selected, we try to match the type (income vs spending)
        if (selectedTransaction && !searchQuery) {
            const isIncome = selectedTransaction.type === 'credit';
            const catType = (cat.cat_type || '').toLowerCase();

            if (isIncome) {
                return catType === 'income' || catType === 'both';
            } else {
                return catType === 'spending' || catType === 'both';
            }
        }

        // Default or search mode: show all matching categories
        return true;
    });

    // Final fallback: if no categories match the type, show all that match the search
    const displayCategories = finalCategories.length > 0
        ? finalCategories
        : categories.filter(cat => (cat.name || '').toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar
                barStyle="light-content"
                backgroundColor={isDarkMode ? '#0F172A' : '#1E293B'}
            />

            {/* Enhanced Header */}
            <LinearGradient
                colors={isDarkMode ? ['#0F172A', '#1E293B', '#334155'] : ['#1E293B', '#334155', '#475569']}
                style={styles.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={styles.headerContent}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <View style={styles.headerTitleRow}>
                            <Ionicons name="file-tray-full" size={22} color="#FFFFFF" />
                            <Text style={styles.headerTitle}>Uncategorized</Text>
                        </View>
                        <View style={styles.headerBadge}>
                            <Text style={styles.headerBadgeText}>
                                {uncategorizedTransactions.length} transaction{uncategorizedTransactions.length !== 1 ? 's' : ''}
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={styles.bulkModeButton}
                        onPress={() => {
                            setBulkMode(!bulkMode);
                            setSelectedIds([]);
                        }}
                    >
                        <LinearGradient
                            colors={bulkMode ? ['#EF4444', '#DC2626'] : ['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
                            style={styles.bulkModeGradient}
                        >
                            <Ionicons name={bulkMode ? 'close' : 'checkbox-outline'} size={22} color="#FFFFFF" />
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* Enhanced Bulk Mode Header */}
                {bulkMode && (
                    <View style={styles.bulkHeader}>
                        <View style={styles.bulkHeaderLeft}>
                            <View style={styles.selectedCountBadge}>
                                <LinearGradient
                                    colors={['#3B82F6', '#2563EB']}
                                    style={styles.selectedCountGradient}
                                >
                                    <Text style={styles.selectedCountText}>{selectedIds.length}</Text>
                                </LinearGradient>
                            </View>
                            <Text style={styles.bulkHeaderText}>selected</Text>
                        </View>
                        <View style={styles.bulkActions}>
                            <TouchableOpacity onPress={selectAll} style={styles.bulkActionButton}>
                                <Ionicons name="checkbox" size={16} color="#FFFFFF" />
                                <Text style={styles.bulkActionText}>All</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={deselectAll} style={styles.bulkActionButton}>
                                <Ionicons name="close-circle" size={16} color="#FFFFFF" />
                                <Text style={styles.bulkActionText}>Clear</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </LinearGradient>

            {/* Transaction List */}
            {uncategorizedStatus === 'loading' ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                    <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                        Loading transactions...
                    </Text>
                </View>
            ) : uncategorizedTransactions.length === 0 ? (
                <View style={styles.centerContainer}>
                    <View style={styles.emptyIconWrapper}>
                        <LinearGradient
                            colors={['#10B981', '#059669']}
                            style={styles.emptyIconGradient}
                        >
                            <Ionicons name="checkmark-circle" size={64} color="#FFFFFF" />
                        </LinearGradient>
                    </View>
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>All Caught Up!</Text>
                    <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                        You have no uncategorized transactions
                    </Text>
                    <TouchableOpacity
                        style={styles.emptyActionButton}
                        onPress={() => navigation.goBack()}
                    >
                        <LinearGradient
                            colors={['#3B82F6', '#2563EB']}
                            style={styles.emptyActionGradient}
                        >
                            <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
                            <Text style={styles.emptyActionText}>Go Back</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={uncategorizedTransactions}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderTransaction}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            )}

            {/* Enhanced Bulk Edit Toolbar */}
            {bulkMode && selectedIds.length > 0 && (
                <View style={[styles.bulkToolbar, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.toolbarLeft}>
                        <View style={styles.toolbarSelectionCount}>
                            <Text style={styles.toolbarSelectionText}>{selectedIds.length}</Text>
                        </View>
                        <Text style={[styles.toolbarText, { color: colors.text }]}>Selected</Text>
                    </View>

                    <View style={styles.toolbarActions}>
                        <TouchableOpacity
                            onPress={handleBulkSpam}
                            style={[styles.toolbarIconAction, { backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.1)' : '#FEF3C7' }]}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="warning" size={20} color="#F59E0B" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleBulkDelete}
                            style={[styles.toolbarIconAction, { backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.1)' : '#FEE2E2' }]}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="trash" size={20} color="#EF4444" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.assignButton}
                            onPress={() => {
                                setSelectedTransaction(null);
                                setCategoryPickerVisible(true);
                            }}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={['#3B82F6', '#2563EB']}
                                style={styles.assignButtonGradient}
                            >
                                <Ionicons name="pricetag" size={16} color="#FFFFFF" />
                                <Text style={styles.assignButtonText}>Assign</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Enhanced Category Picker Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={categoryPickerVisible}
                onRequestClose={() => setCategoryPickerVisible(false)}
            >
                <View style={[styles.modalOverlay, { backgroundColor: isDarkMode ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.6)' }]}>
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={[styles.modalTitle, { color: colors.text }]}>
                                    {bulkMode ? 'Bulk Categorize' : 'Select Category'}
                                </Text>
                                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                                    {bulkMode ? `${selectedIds.length} transactions selected` : 'Choose the right category'}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => setCategoryPickerVisible(false)}
                                style={styles.modalCloseButton}
                            >
                                <Ionicons name="close" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {/* Special Actions (Delete/Spam) */}
                        {!bulkMode && (
                            <View style={styles.specialActionsRow}>
                                <TouchableOpacity
                                    style={[styles.specialActionButton, { backgroundColor: '#EF444415' }]}
                                    onPress={async () => {
                                        try {
                                            await dispatch(deleteTransaction(selectedTransaction.id)).unwrap();
                                            ToastAndroid.show('Transaction deleted permanently', ToastAndroid.SHORT);
                                            setCategoryPickerVisible(false);
                                        } catch (e) {
                                            ToastAndroid.show('Failed to delete', ToastAndroid.SHORT);
                                        }
                                    }}
                                >
                                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                                    <Text style={[styles.specialActionText, { color: '#EF4444' }]}>Delete</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.specialActionButton, { backgroundColor: '#F59E0B15' }]}
                                    onPress={async () => {
                                        try {
                                            await dispatch(markAsSpam(selectedTransaction.id)).unwrap();
                                            ToastAndroid.show('Marked as spam', ToastAndroid.SHORT);
                                            setCategoryPickerVisible(false);
                                        } catch (e) {
                                            ToastAndroid.show('Failed to mark as spam', ToastAndroid.SHORT);
                                        }
                                    }}
                                >
                                    <Ionicons name="warning-outline" size={20} color="#F59E0B" />
                                    <Text style={[styles.specialActionText, { color: '#F59E0B' }]}>Spam</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Search Bar */}
                        <View style={[styles.searchContainer, { backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
                            <Ionicons name="search" size={20} color={colors.textSecondary} />
                            <TextInput
                                style={[styles.searchInput, { color: colors.text }]}
                                placeholder="Search categories..."
                                placeholderTextColor={colors.textSecondary}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchQuery('')}>
                                    <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                                </TouchableOpacity>
                            )}
                        </View>



                        {/* Categories List */}
                        <Text style={[styles.categoryListTitle, { color: isDarkMode ? '#94A3B8' : '#64748B', marginLeft: 4, marginBottom: 8 }]}>
                            All Categories
                        </Text>
                        <ScrollView
                            style={styles.categoryList}
                            contentContainerStyle={styles.categoryListContent}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        >
                            {displayCategories.map((cat, index) => (
                                <TouchableOpacity
                                    key={cat.id}
                                    style={[
                                        styles.categoryOption,
                                        { borderColor: colors.border },
                                        index === displayCategories.length - 1 && styles.categoryOptionLast
                                    ]}
                                    onPress={() => handleCategorySelect(cat)}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.categoryIconContainer, { backgroundColor: (cat.color || (isDarkMode ? '#334155' : '#F1F5F9')) + '20' }]}>
                                        <MCIcon name={cat.icon || 'tag'} size={22} color={cat.color || (isDarkMode ? '#94A3B8' : '#64748B')} />
                                    </View>
                                    <Text style={[styles.categoryOptionName, { color: colors.text }]}>{cat.name}</Text>
                                    <Ionicons name="chevron-forward" size={12} color={colors.textSecondary} />
                                </TouchableOpacity>
                            ))}
                            {(displayCategories.length === 0 && categories.length > 0) && (
                                <Text style={{ textAlign: 'center', padding: 20, color: colors.textSecondary }}>
                                    No categories found
                                </Text>
                            )}
                            {categories.length === 0 && (
                                <View style={styles.noResultsContainer}>
                                    <ActivityIndicator size="small" color={colors.primary} />
                                    <Text style={[styles.noResultsText, { color: colors.textSecondary }]}>
                                        Loading categories...
                                    </Text>
                                </View>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>


        </SafeAreaView >
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingBottom: 24,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 16,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: 'center',
        gap: 8,
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFFFFF',
        letterSpacing: -0.5,
    },
    headerBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    headerBadgeText: {
        fontSize: 12,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    bulkModeButton: {
        borderRadius: 20,
        overflow: 'hidden',
    },
    bulkModeGradient: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    bulkHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 16,
    },
    bulkHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    selectedCountBadge: {
        borderRadius: 14,
        overflow: 'hidden',
    },
    selectedCountGradient: {
        paddingHorizontal: 12,
        paddingVertical: 4,
    },
    selectedCountText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    bulkHeaderText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    bulkActions: {
        flexDirection: 'row',
        gap: 8,
    },
    bulkActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.15)',
    },
    bulkActionText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    loadingText: {
        fontSize: 14,
        marginTop: 16,
        fontWeight: '500',
    },
    emptyIconWrapper: {
        marginBottom: 24,
        borderRadius: 80,
        overflow: 'hidden',
    },
    emptyIconGradient: {
        width: 140,
        height: 140,
        borderRadius: 70,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyTitle: {
        fontSize: 26,
        fontWeight: 'bold',
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    emptySubtitle: {
        fontSize: 15,
        textAlign: 'center',
        marginBottom: 24,
    },
    emptyActionButton: {
        borderRadius: 14,
        overflow: 'hidden',
        elevation: 4,
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    emptyActionGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 24,
        paddingVertical: 14,
    },
    emptyActionText: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    listContent: {
        padding: 20,
    },
    transactionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
        marginBottom: 12,
        borderWidth: 1,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    transactionRowSelected: {
        backgroundColor: '#3B82F615',
        borderColor: '#3B82F6',
        borderWidth: 2,
    },
    checkbox: {
        marginRight: 12,
    },
    checkboxSelected: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxUnselected: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
    },
    iconContainer: {
        marginRight: 14,
        borderRadius: 24,
        overflow: 'hidden',
    },
    iconGradient: {
        width: 48,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
    },
    transactionDetails: {
        flex: 1,
    },
    merchantName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 6,
        letterSpacing: -0.2,
    },
    transactionMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    transactionDate: {
        fontSize: 12,
        fontWeight: '500',
    },
    rightSection: {
        alignItems: 'flex-end',
        gap: 8,
    },
    amount: {
        fontSize: 17,
        fontWeight: 'bold',
        letterSpacing: -0.3,
    },
    categoryChip: {
        borderRadius: 10,
        overflow: 'hidden',
    },
    categoryChipGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    categoryChipText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    bulkToolbar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderTopWidth: 1,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    toolbarLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    toolbarText: {
        fontSize: 15,
        fontWeight: '600',
    },
    assignButton: {
        borderRadius: 14,
        overflow: 'hidden',
    },
    assignButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    assignButtonText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    toolbarActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    toolbarIconAction: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    toolbarSelectionCount: {
        backgroundColor: '#3B82F6',
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 2,
        marginRight: 4,
    },
    toolbarSelectionText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: 'bold',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        maxHeight: '85%',
        flex: 1, // Added flex: 1 to ensure children like ScrollView can expand
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 4,
        letterSpacing: -0.5,
    },
    modalSubtitle: {
        fontSize: 13,
        fontWeight: '500',
    },
    modalCloseButton: {
        padding: 4,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 20,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
    },
    suggestionContainer: {
        marginBottom: 24,
    },
    suggestionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    suggestionIconWrapper: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    suggestionIconGradient: {
        width: 28,
        height: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    suggestionLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        letterSpacing: -0.2,
    },
    suggestionCard: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    suggestionCardGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderWidth: 1,
        borderColor: '#3B82F620',
        borderRadius: 16,
    },
    suggestionCategoryName: {
        fontSize: 16,
        fontWeight: '600',
        flex: 1,
        marginLeft: 12,
    },
    suggestionBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#3B82F6',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
    },
    suggestionBadgeText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#FFFFFF',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    categoryList: {
        flex: 1,
        marginTop: 10,
    },
    categoryListContent: {
        paddingBottom: 40,
    },
    specialActionsRow: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingBottom: 20,
        gap: 12,
    },
    specialActionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        gap: 8,
    },
    specialActionText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    categoryListTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 12,
    },
    categoryOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        marginBottom: 8,
        borderBottomWidth: 1,
    },
    categoryOptionLast: {
        borderBottomWidth: 0,
    },
    categoryIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    categoryOptionName: {
        fontSize: 16,
        fontWeight: '500',
        flex: 1,
        letterSpacing: -0.2,
    },
    noResultsContainer: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    noResultsText: {
        fontSize: 14,
        marginTop: 12,
        fontWeight: '500',
    },
    rulePromptCard: {
        margin: 24,
        padding: 32,
        borderRadius: 24,
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
    },
    ruleIconWrapper: {
        marginBottom: 20,
        borderRadius: 40,
        overflow: 'hidden',
    },
    ruleIconGradient: {
        width: 80,
        height: 80,
        justifyContent: 'center',
        alignItems: 'center',
    },
    rulePromptTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 12,
        letterSpacing: -0.5,
    },
    rulePromptMessage: {
        fontSize: 15,
        textAlign: 'center',
        marginBottom: 28,
        lineHeight: 22,
    },
    rulePromptButtons: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    ruleButton: {
        flex: 1,
    },
    ruleButtonInner: {
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
        borderWidth: 1,
    },
    ruleButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 14,
    },
    ruleButtonText: {
        fontSize: 15,
        fontWeight: '600',
    },
    ruleButtonTextPrimary: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
});

export default UncategorizedTransactionsScreen;