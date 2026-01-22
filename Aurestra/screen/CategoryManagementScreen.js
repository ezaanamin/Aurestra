import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    TextInput,
    Modal,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { fetchCategories, addCategory, deleteCategory } from '../API/slice/API';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettings } from '../context/SettingsContext';

const CategoryManagementScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const { categories, categoriesStatus } = useSelector((state) => state.API);
    const { colors, isDarkMode } = useSettings();
    const [modalVisible, setModalVisible] = useState(false);
    const [newCatName, setNewCatName] = useState('');
    const [selectedIcon, setSelectedIcon] = useState('cash');
    const [catType, setCatType] = useState('spending'); // 'spending' or 'income'

    const icons = [
        // Spending / General
        'food', 'food-apple', 'coffee', 'hamburger', 'pizza', 'ice-cream', 'glass-wine',
        'movie', 'video', 'music', 'controller', 'headphones',
        'car', 'bus', 'airplane', 'train', 'taxi', 'bike', 'gas-station',
        'shopping', 'cart', 'bag-personal', 'tag', 'ticket', 'gift',
        'home', 'water', 'flash', 'receipt', 'phone', 'wifi', 'web',
        'hospital', 'pill', 'bandage', 'doctor', 'tooth', 'glasses',
        'school', 'book', 'palette', 'camera', 'microphone',
        'dumbbell', 'run', 'soccer', 'basketball', 'tennis',
        'sparkles', 'brain', 'heart', 'star', 'fire', 'human-greeting',
        'dog', 'cat', 'tree', 'flower', 'weather-sunny',
        'hammer', 'wrench', 'briefcase', 'office-building', 'factory',
        'credit-card', 'bank', 'wallet', 'safe', 'piggy-bank', 'cash', 'cash-register',
        'chart-arc', 'chart-line', 'chart-pie', 'trending-up', 'trending-down',

        // Income / Bonus
        'bank-transfer-in', 'hand-coin', 'cash-plus', 'currency-usd', 'account-cash',
        'rocket', 'diamond', 'crown', 'trophy'
    ];

    useEffect(() => {
        dispatch(fetchCategories());
    }, []);

    const handleCreate = async () => {
        if (!newCatName) {
            Alert.alert('Error', 'Please enter a category name');
            return;
        }
        await dispatch(addCategory({
            name: newCatName,
            icon: selectedIcon,
            cat_type: catType
        }));
        setNewCatName('');
        setSelectedIcon('cash');
        setCatType('spending');
        setModalVisible(false);
    };

    const handleDelete = (id, name, isDefault) => {
        if (isDefault) {
            Alert.alert('Cannot Delete', 'Default categories cannot be deleted.');
            return;
        }
        Alert.alert(
            'Delete Category',
            `Are you sure you want to delete "${name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => dispatch(deleteCategory(id))
                },
            ]
        );
    };



    const renderItem = ({ item }) => (
        <View style={[styles.categoryItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.iconContainer, { backgroundColor: colors.background }]}>
                <Icon name={item.icon} size={24} color={colors.primary} />
            </View>
            <Text style={[styles.categoryName, { color: colors.text }]}>{item.name}</Text>
            {!item.is_default && (
                <TouchableOpacity onPress={() => handleDelete(item.id, item.name, item.is_default)}>
                    <Icon name="delete-outline" size={24} color="#EF4444" />
                </TouchableOpacity>
            )}
            {item.is_default && (
                <View style={styles.defaultBadge}>
                    <Text style={styles.defaultBadgeText}>Default</Text>
                </View>
            )}
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Icon name="arrow-left" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>Manage Categories</Text>
                <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addButton}>
                    <Icon name="plus" size={24} color={colors.primary} />
                </TouchableOpacity>
            </View>

            {categoriesStatus === 'loading' ? (
                <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={categories}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No categories found</Text>
                    }
                />
            )}

            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Add Category</Text>

                        <TextInput
                            style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                            placeholder="Category Name"
                            placeholderTextColor={colors.textSecondary}
                            value={newCatName}
                            onChangeText={setNewCatName}
                        />

                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Category Type</Text>
                        <View style={styles.typeSelector}>
                            {['spending', 'income', 'both'].map((type) => (
                                <TouchableOpacity
                                    key={type}
                                    style={[
                                        styles.typeButton,
                                        catType === type && { backgroundColor: colors.primary, borderColor: colors.primary }
                                    ]}
                                    onPress={() => setCatType(type)}
                                >
                                    <Text style={[
                                        styles.typeButtonText,
                                        catType === type && { color: '#FFFFFF' }
                                    ]}>
                                        {type.charAt(0).toUpperCase() + type.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Select Icon</Text>
                        <FlatList
                            data={icons}
                            numColumns={6}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.iconOption,
                                        { borderColor: selectedIcon === item ? colors.primary : colors.border }
                                    ]}
                                    onPress={() => setSelectedIcon(item)}
                                >
                                    <Icon name={item} size={24} color={colors.text} />
                                </TouchableOpacity>
                            )}
                            keyExtractor={(item) => item}
                            contentContainerStyle={{ gap: 12, paddingBottom: 10 }}
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveButton} onPress={handleCreate}>
                                <Text style={styles.saveButtonText}>Add</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal >
        </SafeAreaView >
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    title: { fontSize: 20, fontWeight: 'bold' },
    backButton: { padding: 4 },
    addButton: { padding: 4 },
    listContent: { padding: 20 },
    categoryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 12,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    categoryName: { flex: 1, fontSize: 16, fontWeight: '600' },
    defaultBadge: {
        backgroundColor: '#E2E8F0',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    defaultBadgeText: { fontSize: 10, color: '#64748B', fontWeight: 'bold' },
    emptyText: { textAlign: 'center', marginTop: 40 },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        borderRadius: 24,
        padding: 24,
    },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    input: {
        borderRadius: 12,
        borderWidth: 1,
        padding: 14,
        fontSize: 16,
        marginBottom: 20,
    },
    sectionTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 12 },
    iconsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 24,
    },
    iconOption: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    typeSelector: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 20,
    },
    typeButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
    },
    typeButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748B',
    },
    modalButtons: { flexDirection: 'row', gap: 12 },
    cancelButton: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
    },
    cancelButtonText: { fontWeight: 'bold', color: '#64748B' },
    saveButton: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        backgroundColor: '#3B82F6',
    },
    saveButtonText: { fontWeight: 'bold', color: '#FFFFFF' },
});

export default CategoryManagementScreen;
