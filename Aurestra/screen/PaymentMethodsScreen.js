import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    StatusBar,
    ScrollView,
    FlatList
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSettings } from '../context/SettingsContext';

const PaymentMethodsScreen = ({ navigation }) => {
    const { colors, isDarkMode } = useSettings();
    const methods = [
        { id: '1', type: 'Bank Account', name: 'Bank Al Habib', number: '**** 0981', icon: 'bank', color: '#10B981' },
        { id: '2', type: 'Debit Card', name: 'Visa Gold', number: '**** 4242', icon: 'credit-card', color: '#3B82F6' },
    ];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle="light-content" backgroundColor={colors.headerBackground} />

            <LinearGradient colors={isDarkMode ? ['#020617', '#1E293B'] : ['#1E293B', '#334155']} style={styles.header}>
                <View style={styles.headerContent}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Icon name="arrow-left" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Payment Methods</Text>
                    <TouchableOpacity style={styles.addButton}>
                        <Icon name="plus" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            <ScrollView contentContainerStyle={styles.content}>
                {methods.map((item) => (
                    <TouchableOpacity key={item.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={[styles.iconWrapper, { backgroundColor: item.color + '20' }]}>
                            <Icon name={item.icon} size={24} color={item.color} />
                        </View>
                        <View style={styles.cardInfo}>
                            <Text style={[styles.cardName, { color: colors.text }]}>{item.name}</Text>
                            <Text style={[styles.cardNumber, { color: colors.textSecondary }]}>{item.number}</Text>
                        </View>
                        <Icon name="dots-vertical" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    header: {
        paddingBottom: 20,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 16,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    backButton: {
        padding: 8,
    },
    addButton: {
        padding: 8,
    },
    content: {
        padding: 20,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    iconWrapper: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    cardInfo: {
        flex: 1,
    },
    cardName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1E293B',
    },
    cardNumber: {
        fontSize: 13,
        color: '#64748B',
        marginTop: 2,
    },
});

export default PaymentMethodsScreen;
