import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    StatusBar,
    FlatList,
    TouchableOpacity,
    ActivityIndicator
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUserAccounts } from '../API/slice/API';
import { useSettings } from '../context/SettingsContext';
import CustomModal from '../components/CustomModal';

const LinkedAccountsScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const { accounts, accountsStatus } = useSelector((state) => state.API);
    const { t, isDarkMode } = useSettings();

    const [modalVisible, setModalVisible] = useState(false);
    const [modalConfig, setModalConfig] = useState({ title: '', message: '', type: 'info', onConfirm: null });

    const showConfirm = (title, message, onConfirm) => {
        setModalConfig({ title, message, type: 'confirm', onConfirm });
        setModalVisible(true);
    };

    const showAlert = (title, message) => {
        setModalConfig({ title, message, type: 'info', onConfirm: null });
        setModalVisible(true);
    };

    useEffect(() => {
        dispatch(fetchUserAccounts());
    }, [dispatch]);

    const handleUnlink = (accountId) => {
        showConfirm(
            t('unlinkAccount') || "Unlink Account",
            t('unlinkConfirm') || "Are you sure you want to unlink this account?",
            () => {
                // Dispatch unlink action here
                console.log("Unlinking account:", accountId);
                setModalVisible(false);
                // Ideally show success toast/modal
            }
        );
    };

    const handleAddAccount = () => {
        showAlert("Add Account", "This feature will connect to Plaid/Bank API.");
    };

    const themeStyles = {
        container: isDarkMode ? '#0F172A' : '#F8FAFC',
        text: isDarkMode ? '#F1F5F9' : '#1E293B',
        cardBg: isDarkMode ? '#1E293B' : '#FFFFFF',
        headerGradient: isDarkMode ? ['#020617', '#1E293B'] : ['#1E293B', '#334155'],
        subText: isDarkMode ? '#94A3B8' : '#64748B',
        border: isDarkMode ? '#334155' : '#E2E8F0'
    };

    const renderItem = ({ item }) => (
        <View style={[styles.accountCard, { backgroundColor: themeStyles.cardBg, borderColor: themeStyles.border }]}>
            <View style={styles.cardLeft}>
                <View style={[styles.iconWrapper, { backgroundColor: item.source === 'bank' ? '#EFF6FF' : '#F0FDF4' }]}>
                    <Icon
                        name={item.source === 'bank' ? 'bank' : 'wallet'}
                        size={24}
                        color={item.source === 'bank' ? '#3B82F6' : '#10B981'}
                    />
                </View>
                <View style={styles.accountInfo}>
                    <Text style={[styles.accountName, { color: themeStyles.text }]}>
                        {item.source === 'bank' ? 'Bank Account' : 'Digital Wallet'}
                    </Text>
                    <Text style={[styles.accountNumber, { color: themeStyles.subText }]}>
                        {item.account_number ? `**** ${item.account_number.slice(-4)}` : 'Main Wallet'}
                    </Text>
                </View>
            </View>
            <TouchableOpacity onPress={() => handleUnlink(item.id)} style={styles.unlinkButton}>
                <Icon name="link-off" size={20} color="#EF4444" />
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: themeStyles.container }]}>
            <StatusBar barStyle="light-content" backgroundColor={themeStyles.headerGradient[0]} />

            {/* Header */}
            <LinearGradient colors={themeStyles.headerGradient} style={styles.header}>
                <View style={styles.headerContent}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Icon name="arrow-left" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{t('linkedAccounts')}</Text>
                    <TouchableOpacity onPress={handleAddAccount} style={styles.addButton}>
                        <Icon name="plus" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            <View style={styles.content}>
                {accountsStatus === 'loading' ? (
                    <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 20 }} />
                ) : (
                    <FlatList
                        data={accounts}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={renderItem}
                        contentContainerStyle={styles.listContent}
                        ListEmptyComponent={
                            <Text style={[styles.emptyText, { color: themeStyles.subText }]}>No linked accounts found.</Text>
                        }
                    />
                )}
            </View>

            <CustomModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                title={modalConfig.title}
                message={modalConfig.message}
                type={modalConfig.type}
                onConfirm={modalConfig.onConfirm}
                confirmText="Yes"
                cancelText="No"
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingBottom: 20,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 16,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    addButton: {
        padding: 8,
    },
    content: {
        flex: 1,
    },
    listContent: {
        padding: 20,
    },
    accountCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
    },
    cardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconWrapper: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    accountInfo: {
        gap: 2,
    },
    accountName: {
        fontSize: 16,
        fontWeight: '600',
    },
    accountNumber: {
        fontSize: 13,
    },
    unlinkButton: {
        padding: 8,
        backgroundColor: '#FEF2F2',
        borderRadius: 8,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 40,
        fontSize: 16,
    }
});

export default LinkedAccountsScreen;
