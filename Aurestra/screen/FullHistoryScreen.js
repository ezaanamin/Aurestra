import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    StatusBar,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    TextInput,
    Modal
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import StatementModal from '../components/StatementModal';
import { fetchAllTransactions, updateTransaction, fetchCategories } from '../API/slice/API'; // Added updateTransaction
import { useSettings } from '../context/SettingsContext';

const FullHistoryScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [sortMenuVisible, setSortMenuVisible] = useState(false);
    const [sortBy, setSortBy] = useState('date_desc'); // date_desc, date_asc, amount_desc, amount_asc

    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showStatementModal, setShowStatementModal] = useState(false);
    const [filterModalVisible, setFilterModalVisible] = useState(false);
    const [filterMonth, setFilterMonth] = useState(null); // 0-11
    const [filterYear, setFilterYear] = useState(null); // e.g. 2026

    const categories = useSelector((state) => state.API?.categories || []);

    useEffect(() => {
        loadTransactions();
    }, []);

    const loadTransactions = async () => {
        setLoading(true);
        try {
            dispatch(fetchCategories());
            const resultAction = await dispatch(fetchAllTransactions());
            if (fetchAllTransactions.fulfilled.match(resultAction)) {
                setData(resultAction.payload);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        applyFilters();
    }, [data, searchText, sortBy, filterMonth, filterYear]);

    const applyFilters = () => {
        let filtered = [...data];

        // 1. Text Search
        if (searchText) {
            const lower = searchText.toLowerCase();
            filtered = filtered.filter(item =>
                (item.purpose && item.purpose.toLowerCase().includes(lower)) ||
                (item.sender && item.sender.toLowerCase().includes(lower)) ||
                (item.notes && item.notes.toLowerCase().includes(lower)) ||
                (String(item.amount).includes(lower))
            );
        }

        // 2. Date Filter
        if (filterMonth !== null && filterYear !== null) {
            filtered = filtered.filter(item => {
                const itemDate = new Date(item.date);
                return itemDate.getMonth() === filterMonth && itemDate.getFullYear() === filterYear;
            });
        }

        // 3. Sort
        switch (sortBy) {
            case 'date_desc':
                filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
                break;
            case 'date_asc':
                filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
                break;
            case 'amount_desc':
                filtered.sort((a, b) => b.amount - a.amount);
                break;
            case 'amount_asc':
                filtered.sort((a, b) => a.amount - b.amount);
                break;
        }

        setFilteredData(filtered);
    };

    const handleSort = (sortType) => {
        setSortBy(sortType);
        setSortMenuVisible(false);
    };

    const handleSearch = (text) => {
        setSearchText(text);
    };

    const clearDateFilter = () => {
        setFilterMonth(null);
        setFilterYear(null);
        setFilterModalVisible(false);
    };

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const currentYear = new Date().getFullYear();
    const years = [currentYear, currentYear - 1, currentYear - 2];


    const [editCategory, setEditCategory] = useState('');
    const [editNote, setEditNote] = useState('');
    const [categorySearch, setCategorySearch] = useState('');

    const filteredCategories = categories.filter(cat =>
        cat.name.toLowerCase().includes(categorySearch.toLowerCase())
    );

    const handleEdit = (item) => {
        setSelectedTransaction(item);
        setEditCategory(item.purpose || '');
        setEditNote(item.notes || '');
        setShowEditModal(true);
    };

    const handleSaveEdit = async () => {
        if (!selectedTransaction) return;

        try {
            await dispatch(updateTransaction({
                id: selectedTransaction.id,
                data: {
                    purpose: editCategory,
                    notes: editNote
                }
            })).unwrap();

            // Refresh list but maintain search filter
            loadTransactions(true);
            setShowEditModal(false);
            setSelectedTransaction(null);
        } catch (e) {
            console.error("Edit failed:", e);
        }
    };

    const { currency, colors, isDarkMode } = useSettings();

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-PK', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const renderItem = ({ item }) => {
        const isIncome = item.type === 'credit';
        return (
            <TouchableOpacity
                style={[styles.transactionItem, { backgroundColor: colors.card, shadowColor: colors.textSecondary }]}
                onPress={() => handleEdit(item)}
            >
                <View style={[styles.iconWrapper, { backgroundColor: isIncome ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)' }]}>
                    <Ionicons
                        name={isIncome ? 'arrow-down-circle' : 'arrow-up-circle'}
                        size={24}
                        color={isIncome ? '#10B981' : '#EF4444'}
                    />
                </View>
                <View style={styles.details}>
                    <Text style={[styles.title, { color: colors.text }]}>{item.sender || item.purpose || 'Transaction'}</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{new Date(item.date).toLocaleDateString()} • {item.purpose}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.amount, { color: isIncome ? '#10B981' : '#EF4444' }]}>
                        {isIncome ? '+' : '-'}{formatCurrency(item.amount)}
                    </Text>
                    <Text style={{ fontSize: 10, color: colors.textSecondary, marginTop: 2 }}>Edit</Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle="light-content" backgroundColor={colors.headerBackground} />

            {/* Header */}
            <LinearGradient colors={isDarkMode ? ['#020617', '#1E293B'] : ['#1E293B', '#334155']} style={styles.header}>
                <View style={styles.headerContent}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Transaction History</Text>

                    <TouchableOpacity onPress={() => setShowStatementModal(true)} style={styles.statementButton}>
                        <Ionicons name="document-text-outline" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>

                {/* Search and Sort */}
                <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
                    <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
                    <TextInput
                        style={[styles.searchInput, { color: colors.text }]}
                        placeholder="Search transactions..."
                        placeholderTextColor={colors.textSecondary}
                        value={searchText}
                        onChangeText={handleSearch}
                    />
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <TouchableOpacity
                            onPress={() => setFilterModalVisible(true)}
                            style={[
                                styles.filterIconBadge,
                                (filterMonth !== null) && { backgroundColor: colors.primary + '20' }
                            ]}
                        >
                            <Ionicons
                                name="calendar"
                                size={20}
                                color={(filterMonth !== null) ? colors.primary : colors.textSecondary}
                            />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setSortMenuVisible(true)}>
                            <Ionicons name="funnel" size={20} color={colors.primary} />
                        </TouchableOpacity>
                    </View>
                </View>
                {filterMonth !== null && (
                    <View style={styles.activeFiltersRow}>
                        <View style={[styles.filterTag, { backgroundColor: colors.primary }]}>
                            <Text style={styles.filterTagText}>{months[filterMonth]} {filterYear}</Text>
                            <TouchableOpacity onPress={clearDateFilter}>
                                <Ionicons name="close-circle" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </LinearGradient>

            <View style={styles.content}>
                {loading ? (
                    <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 50 }} />
                ) : (
                    <FlatList
                        data={filteredData}
                        renderItem={renderItem}
                        keyExtractor={item => String(item.id)}
                        contentContainerStyle={{ padding: 20 }}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <Text style={{ textAlign: 'center', marginTop: 50, color: colors.textSecondary }}>No transactions found</Text>
                        }
                    />
                )}

                {/* Sort Modal */}
                <Modal
                    visible={sortMenuVisible}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setSortMenuVisible(false)}
                >
                    <TouchableOpacity
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={() => setSortMenuVisible(false)}
                    >
                        <View style={[styles.sortModalContent, { backgroundColor: colors.card }]}>
                            <Text style={[styles.sortTitle, { color: colors.text }]}>Sort Transactions</Text>

                            {[
                                { label: 'Newest First', value: 'date_desc', icon: 'calendar' },
                                { label: 'Oldest First', value: 'date_asc', icon: 'calendar-outline' },
                                { label: 'Highest Amount', value: 'amount_desc', icon: 'trending-up' },
                                { label: 'Lowest Amount', value: 'amount_asc', icon: 'trending-down' }
                            ].map((option) => (
                                <TouchableOpacity
                                    key={option.value}
                                    style={[
                                        styles.sortOption,
                                        sortBy === option.value && { backgroundColor: (colors.primary || '#8B5CF6') + '20' }
                                    ]}
                                    onPress={() => handleSort(option.value)}
                                >
                                    <Ionicons name={option.icon} size={20} color={colors.text} style={{ marginRight: 12 }} />
                                    <Text style={[
                                        styles.sortOptionText,
                                        { color: colors.text },
                                        sortBy === option.value && { color: colors.primary, fontWeight: 'bold' }
                                    ]}>
                                        {option.label}
                                    </Text>
                                    {sortBy === option.value && (
                                        <Ionicons name="checkmark" size={20} color={colors.primary} style={{ marginLeft: 'auto' }} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </TouchableOpacity>
                </Modal>

                {/* Date Filter Modal */}
                <Modal
                    visible={filterModalVisible}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setFilterModalVisible(false)}
                >
                    <TouchableOpacity
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={() => setFilterModalVisible(false)}
                    >
                        <TouchableOpacity activeOpacity={1} style={[styles.filterModalContent, { backgroundColor: colors.card }]}>
                            <Text style={[styles.sortTitle, { color: colors.text }]}>Filter by Month</Text>

                            <View style={styles.yearRow}>
                                {years.map(y => (
                                    <TouchableOpacity
                                        key={y}
                                        style={[
                                            styles.yearButton,
                                            filterYear === y && { backgroundColor: colors.primary }
                                        ]}
                                        onPress={() => setFilterYear(y)}
                                    >
                                        <Text style={[
                                            styles.yearButtonText,
                                            { color: filterYear === y ? '#FFFFFF' : colors.text }
                                        ]}>{y}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={styles.monthGrid}>
                                {months.map((m, index) => (
                                    <TouchableOpacity
                                        key={m}
                                        style={[
                                            styles.monthButton,
                                            filterMonth === index && { backgroundColor: colors.primary + '20', borderColor: colors.primary }
                                        ]}
                                        onPress={() => {
                                            setFilterMonth(index);
                                            if (!filterYear) setFilterYear(currentYear);
                                            setFilterModalVisible(false);
                                        }}
                                    >
                                        <Text style={[
                                            styles.monthButtonText,
                                            { color: colors.text },
                                            filterMonth === index && { color: colors.primary, fontWeight: 'bold' }
                                        ]}>
                                            {m.substring(0, 3)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <TouchableOpacity
                                style={[styles.clearFilterBtn, { borderColor: colors.border }]}
                                onPress={clearDateFilter}
                            >
                                <Text style={{ color: '#EF4444', fontWeight: 'bold' }}>Clear Filter</Text>
                            </TouchableOpacity>
                        </TouchableOpacity>
                    </TouchableOpacity>
                </Modal>

                {/* Edit Modal */}
                <Modal
                    visible={showEditModal}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setShowEditModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={[styles.editModalContent, { backgroundColor: colors.card }]}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Transaction</Text>

                            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Category</Text>
                            <View style={[styles.categorySearchBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                <Ionicons name="search" size={16} color={colors.textSecondary} />
                                <TextInput
                                    style={[styles.categorySearchInput, { color: colors.text }]}
                                    value={categorySearch}
                                    onChangeText={setCategorySearch}
                                    placeholder="Search categories..."
                                    placeholderTextColor={colors.textSecondary}
                                />
                            </View>

                            <View style={styles.categoriesListContainer}>
                                <FlatList
                                    data={filteredCategories}
                                    keyExtractor={(item) => item.id.toString()}
                                    nestedScrollEnabled={true}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={[
                                                styles.verticalCategoryItem,
                                                { backgroundColor: editCategory === item.name ? (colors.primary + '20') : 'transparent' },
                                                editCategory === item.name && { borderLeftWidth: 4, borderLeftColor: colors.primary }
                                            ]}
                                            onPress={() => setEditCategory(item.name)}
                                        >
                                            <View style={[styles.categoryIconCircle, { backgroundColor: item.color + '15' }]}>
                                                <Icon name={item.icon || 'tag'} size={18} color={item.color || colors.primary} />
                                            </View>
                                            <Text style={[
                                                styles.verticalCategoryText,
                                                { color: editCategory === item.name ? colors.primary : colors.text },
                                                editCategory === item.name && { fontWeight: '700' }
                                            ]}>
                                                {item.name}
                                            </Text>
                                            {editCategory === item.name && (
                                                <Ionicons name="checkmark-circle" size={20} color={colors.primary} style={{ marginLeft: 'auto' }} />
                                            )}
                                        </TouchableOpacity>
                                    )}
                                    contentContainerStyle={{ paddingBottom: 10 }}
                                />
                            </View>

                            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Notes</Text>
                            <TextInput
                                style={[styles.modalInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border, height: 80 }]}
                                value={editNote}
                                onChangeText={setEditNote}
                                placeholder="Notes"
                                placeholderTextColor={colors.textSecondary}
                                multiline
                            />

                            <View style={styles.modalButtonsGroup}>
                                <TouchableOpacity
                                    style={[styles.modalButton, { backgroundColor: colors.border }]}
                                    onPress={() => setShowEditModal(false)}
                                >
                                    <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalButton, { backgroundColor: colors.primary }]}
                                    onPress={handleSaveEdit}
                                >
                                    <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>Save</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* Statement Modal */}
                <StatementModal
                    visible={showStatementModal}
                    onClose={() => setShowStatementModal(false)}
                />
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    header: {
        paddingBottom: 24,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 16,
        marginBottom: 16,
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    statementButton: {
        padding: 8,
        marginRight: -8,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 12,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        marginHorizontal: 20,
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 48,
    },
    searchIcon: {
        marginRight: 12,
    },
    searchInput: {
        flex: 1,
        color: '#1E293B',
        fontSize: 16,
    },
    content: {
        flex: 1,
    },
    transactionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    iconWrapper: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    details: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1E293B',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 13,
        color: '#64748B',
    },
    amount: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sortModalContent: {
        width: '80%',
        borderRadius: 16,
        padding: 20,
        elevation: 5,
    },
    sortTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center'
    },
    sortOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    sortOptionText: {
        fontSize: 16,
    },
    editModalContent: {
        width: '90%',
        borderRadius: 20,
        padding: 20,
        elevation: 10,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    inputLabel: {
        fontSize: 14,
        marginBottom: 8,
        fontWeight: '600',
    },
    modalInput: {
        borderRadius: 12,
        borderWidth: 1,
        padding: 12,
        fontSize: 16,
        marginBottom: 20,
        textAlignVertical: 'top',
    },
    modalButtonsGroup: {
        flexDirection: 'row',
        gap: 12,
    },
    modalButton: {
        flex: 1,
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    modalButtonText: {
        fontWeight: 'bold',
        fontSize: 16,
    },
    categoriesListContainer: {
        marginBottom: 20,
        maxHeight: 200, // Limit height since it's now vertical
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        padding: 4,
    },
    categorySearchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        borderRadius: 10,
        borderWidth: 1,
        marginBottom: 10,
        height: 36,
    },
    categorySearchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 14,
        padding: 0,
    },
    verticalCategoryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 8,
        marginBottom: 4,
    },
    categoryIconCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    verticalCategoryText: {
        fontSize: 15,
        fontWeight: '500',
    },
    filterIconBadge: {
        padding: 6,
        borderRadius: 8,
    },
    activeFiltersRow: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginTop: 12,
    },
    filterTag: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        paddingHorizontal: 12,
        borderRadius: 20,
    },
    filterTagText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
    filterModalContent: {
        width: '85%',
        borderRadius: 20,
        padding: 20,
        elevation: 10,
    },
    yearRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
        marginBottom: 20,
    },
    yearButton: {
        paddingVertical: 6,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
    },
    yearButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    monthGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 8,
    },
    monthButton: {
        width: '30%',
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    monthButtonText: {
        fontSize: 14,
    },
    clearFilterBtn: {
        marginTop: 20,
        paddingVertical: 12,
        alignItems: 'center',
        borderTopWidth: 1,
    }
});

export default FullHistoryScreen;
