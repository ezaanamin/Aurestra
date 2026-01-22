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
    TextInput
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

    const handleSearch = (text) => {
        setSearchText(text);
        if (!text) {
            setFilteredData(data);
            return;
        }
        const lower = text.toLowerCase();
        const filtered = data.filter(item =>
            (item.purpose && item.purpose.toLowerCase().includes(lower)) ||
            (item.sender && item.sender.toLowerCase().includes(lower)) ||
            (String(item.amount).includes(lower))
        );
        setFilteredData(filtered);
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

                {/* Search Bar */}
                <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
                    <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
                    <TextInput
                        style={[styles.searchInput, { color: colors.text }]}
                        placeholder="Search transactions..."
                        placeholderTextColor={colors.textSecondary}
                        value={searchText}
                        onChangeText={handleSearch}
                    />
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
});

export default FullHistoryScreen;
