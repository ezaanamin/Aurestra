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
} from '../API/slice/API';

const UncategorizedTransactionsScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const { currency, colors, isDarkMode } = useSettings();

    // Redux State
    const uncategorizedTransactions = useSelector((state) => state.API?.uncategorizedTransactions || []);
    const uncategorizedStatus = useSelector((state) => state.API?.uncategorizedStatus || 'idle');
    const categories = useSelector((state) => state.API?.categories || []);
    const categorysuggestion = useSelector((state) => state.API?.categorysuggestion);

    // Local State
    const [bulkMode, setBulkMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [rulePromptVisible, setRulePromptVisible] = useState(false);
    const [pendingRule, setPendingRule] = useState(null);
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
                await dispatch(updateTransaction({
                    id: selectedTransaction.id,
                    data: { category_id: category.id }
                })).unwrap();

                ToastAndroid.show('✓ Category updated', ToastAndroid.SHORT);

                const merchant = selectedTransaction.notes || selectedTransaction.sender || selectedTransaction.receiver || '';
                if (merchant && merchant.length > 3) {
                    setPendingRule({ merchant_pattern: merchant, category_id: category.id, category_name: category.name });
                    setRulePromptVisible(true);
                }

                setCategoryPickerVisible(false);
                dispatch(fetchUncategorizedTransactions());
            } catch (error) {
                ToastAndroid.show('✗ Update failed', ToastAndroid.SHORT);
            }
        }
    };

    const handleCreateRule = async () => {
        if (pendingRule) {
            try {
                await dispatch(createCategorizationRule({
                    merchant_pattern: pendingRule.merchant_pattern,
                    category_id: pendingRule.category_id
                })).unwrap();

                ToastAndroid.show('✓ Rule created', ToastAndroid.SHORT);
            } catch (error) {
                ToastAndroid.show('✗ Failed to create rule', ToastAndroid.SHORT);
            }
        }
        setRulePromptVisible(false);
        setPendingRule(null);
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

    const filteredCategories = categories.filter((cat) => {
        if (selectedTransaction?.type === 'debit') {
            return (cat.cat_type === 'spending' || cat.cat_type === 'both') &&
                cat.name.toLowerCase().includes(searchQuery.toLowerCase());
        } else {
            return (cat.cat_type === 'income' || cat.cat_type === 'both') &&
                cat.name.toLowerCase().includes(searchQuery.toLowerCase());
        }
    });

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
                        <Ionicons name="checkbox" size={20} color={colors.text} />
                        <Text style={[styles.toolbarText, { color: colors.text }]}>
                            {selectedIds.length} transaction{selectedIds.length !== 1 ? 's' : ''}
                        </Text>
                    </View>
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
                            <Ionicons name="pricetag" size={18} color="#FFFFFF" />
                            <Text style={styles.assignButtonText}>Assign Category</Text>
                        </LinearGradient>
                    </TouchableOpacity>
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

                        {/* Enhanced Suggestion */}
                        {categorysuggestion?.suggestion && !bulkMode && (
                            <View style={styles.suggestionContainer}>
                                <View style={styles.suggestionHeader}>
                                    <View style={styles.suggestionIconWrapper}>
                                        <LinearGradient
                                            colors={['#3B82F6', '#2563EB']}
                                            style={styles.suggestionIconGradient}
                                        >
                                            <Ionicons name="bulb" size={18} color="#FFFFFF" />
                                        </LinearGradient>
                                    </View>
                                    <Text style={[styles.suggestionLabel, { color: colors.text }]}>Smart Suggestion</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.suggestionCard}
                                    onPress={() => handleCategorySelect(categorysuggestion.suggestion)}
                                    activeOpacity={0.8}
                                >
                                    <LinearGradient
                                        colors={['#3B82F610', '#2563EB05']}
                                        style={styles.suggestionCardGradient}
                                    >
                                        <View style={[styles.categoryIconContainer, {
                                            backgroundColor: (categorysuggestion.suggestion.color || '#3B82F6') + '20'
                                        }]}>
                                            <MCIcon name={categorysuggestion.suggestion.icon || 'tag'} size={24} color={categorysuggestion.suggestion.color || '#3B82F6'} />
                                        </View>
                                        <Text style={[styles.suggestionCategoryName, { color: colors.text }]}>
                                            {categorysuggestion.suggestion.name}
                                        </Text>
                                        <View style={styles.suggestionBadge}>
                                            <Ionicons name="sparkles" size={12} color="#FFFFFF" />
                                            <Text style={styles.suggestionBadgeText}>AI</Text>
                                        </View>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Categories List */}
                        <ScrollView style={styles.categoryList} showsVerticalScrollIndicator={false}>
                            <Text style={[styles.categoryListTitle, { color: colors.textSecondary }]}>
                                All Categories
                            </Text>
                            {filteredCategories.map((cat, index) => (
                                <TouchableOpacity
                                    key={cat.id}
                                    style={[
                                        styles.categoryOption,
                                        { borderColor: colors.border },
                                        index === filteredCategories.length - 1 && styles.categoryOptionLast
                                    ]}
                                    onPress={() => handleCategorySelect(cat)}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.categoryIconContainer, { backgroundColor: (cat.color || '#64748B') + '20' }]}>
                                        <MCIcon name={cat.icon || 'tag'} size={22} color={cat.color || '#64748B'} />
                                    </View>
                                    <Text style={[styles.categoryOptionName, { color: colors.text }]}>{cat.name}</Text>
                                    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                                </TouchableOpacity>
                            ))}
                            {filteredCategories.length === 0 && (
                                <View style={styles.noResultsContainer}>
                                    <Ionicons name="search-outline" size={48} color={colors.textSecondary} />
                                    <Text style={[styles.noResultsText, { color: colors.textSecondary }]}>
                                        No categories found
                                    </Text>
                                </View>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Enhanced Rule Prompt Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={rulePromptVisible}
                onRequestClose={() => setRulePromptVisible(false)}
            >
                <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
                    <View style={[styles.rulePromptCard, { backgroundColor: colors.card }]}>
                        <View style={styles.ruleIconWrapper}>
                            <LinearGradient
                                colors={['#8B5CF6', '#7C3AED']}
                                style={styles.ruleIconGradient}
                            >
                                <Ionicons name="sparkles" size={32} color="#FFFFFF" />
                            </LinearGradient>
                        </View>
                        <Text style={[styles.rulePromptTitle, { color: colors.text }]}>Create Smart Rule?</Text>
                        <Text style={[styles.rulePromptMessage, { color: colors.textSecondary }]}>
                            Automatically categorize future transactions from{' '}
                            <Text style={{ fontWeight: 'bold', color: colors.text }}>"{pendingRule?.merchant_pattern}"</Text>
                            {' '}as{' '}
                            <Text style={{ fontWeight: 'bold', color: colors.text }}>"{pendingRule?.category_name}"</Text>
                        </Text>
                        <View style={styles.rulePromptButtons}>
                            <TouchableOpacity
                                style={styles.ruleButton}
                                onPress={() => setRulePromptVisible(false)}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.ruleButtonInner, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                    <Text style={[styles.ruleButtonText, { color: colors.textSecondary }]}>Not Now</Text>
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.ruleButton}
                                onPress={handleCreateRule}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={['#8B5CF6', '#7C3AED']}
                                    style={styles.ruleButtonGradient}
                                >
                                    <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                                    <Text style={styles.ruleButtonTextPrimary}>Yes, Create Rule</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
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
        fontSize: 15,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        padding: 24,
        maxHeight: '85%',
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
        maxHeight: 400,
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