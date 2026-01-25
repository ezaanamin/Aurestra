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
import Ionicons from 'react-native-vector-icons/Ionicons'; // Switched to Ionicons
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

    // Edit specific state
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showStatementModal, setShowStatementModal] = useState(false);

    useEffect(() => {
        loadTransactions();
    }, []);

    const loadTransactions = async () => {
        setLoading(true);
        try {
            dispatch(fetchCategories()); // Ensure categories are loaded for editing
            const resultAction = await dispatch(fetchAllTransactions());
            if (fetchAllTransactions.fulfilled.match(resultAction)) {
                setData(resultAction.payload);
                setFilteredData(resultAction.payload);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSort = (sortType) => {
        setSortBy(sortType);
        let sorted = [...filteredData];
        switch (sortType) {
            case 'date_desc':
                sorted.sort((a, b) => new Date(b.date) - new Date(a.date));
                break;
            case 'date_asc':
                sorted.sort((a, b) => new Date(a.date) - new Date(b.date));
                break;
            case 'amount_desc':
                sorted.sort((a, b) => b.amount - a.amount);
                break;
            case 'amount_asc':
                sorted.sort((a, b) => a.amount - b.amount);
                break;
        }
        setFilteredData(sorted);
        setSortMenuVisible(false);
    };

    const handleSearch = (text) => {
        setSearchText(text);
        if (!text) {
            setFilteredData(data);
            handleSort(sortBy); // Re-apply sort
            return;
        }
        const lower = text.toLowerCase();
        const filtered = data.filter(item =>
            (item.purpose && item.purpose.toLowerCase().includes(lower)) ||
            (item.sender && item.sender.toLowerCase().includes(lower)) ||
            (String(item.amount).includes(lower))
        );
        // Apply sort to filtered
        let sorted = [...filtered];
        // Re-use logic or just rely on next render if we extracted it, but inline for now:
        if (sortBy === 'date_desc') sorted.sort((a, b) => new Date(b.date) - new Date(a.date));
        if (sortBy === 'date_asc') sorted.sort((a, b) => new Date(a.date) - new Date(b.date));
        if (sortBy === 'amount_desc') sorted.sort((a, b) => b.amount - a.amount);
        if (sortBy === 'amount_asc') sorted.sort((a, b) => a.amount - b.amount);

        setFilteredData(sorted);
    };

    const handleEdit = (item) => {
        setSelectedTransaction(item);
        setShowEditModal(true);
    };

    const handleSaveEdit = async (category, note) => {
        if (!selectedTransaction) return;

        try {
            await dispatch(updateTransaction({
                id: selectedTransaction.id,
                data: {
                    purpose: category,
                    notes: note
                }
            })).unwrap();

            // Refresh list
            loadTransactions();
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
                    <TouchableOpacity onPress={() => setSortMenuVisible(true)}>
                        <Ionicons name="filter" size={20} color={colors.primary} />
                    </TouchableOpacity>
                </View>
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
                                        sortBy === option.value && { backgroundColor: colors.primary + '20' }
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
    }
});

export default FullHistoryScreen;
