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
import { fetchCategories, addCategory, deleteCategory, updateCategory } from '../API/slice/API';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettings } from '../context/SettingsContext';

const CategoryManagementScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const { categories, categoriesStatus } = useSelector((state) => state.API);
    const { colors, isDarkMode } = useSettings();
    const [modalVisible, setModalVisible] = useState(false);
    const [newCatName, setNewCatName] = useState('');
    const [selectedIcon, setSelectedIcon] = useState('cash');
    const [selectedColor, setSelectedColor] = useState('#8B5CF6');
    const [catType, setCatType] = useState('spending'); // 'spending' or 'income'
    const [isAdding, setIsAdding] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);

    const colors_palette = [
        '#8B5CF6', '#EC4899', '#3B82F6', '#10B981', '#F59E0B',
        '#6366F1', '#F43F5E', '#06B6D4', '#84CC16', '#A855F7',
        '#FB923C', '#2DD4BF', '#FACC15', '#64748B', '#000000'
    ];

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

    const handleSubmit = async () => {
        if (!newCatName) {
            Alert.alert('Error', 'Please enter a category name');
            return;
        }
        setIsAdding(true);
        try {
            const data = {
                name: newCatName,
                icon: selectedIcon,
                color: selectedColor,
                cat_type: catType
            };

            if (editingCategory) {
                await dispatch(updateCategory({ id: editingCategory.id, data })).unwrap();
            } else {
                await dispatch(addCategory(data)).unwrap();
            }

            closeModal();
        } catch (error) {
            Alert.alert('Error', `Could not ${editingCategory ? 'update' : 'add'} category`);
        } finally {
            setIsAdding(false);
        }
    };

    const openEditModal = (category) => {
        setEditingCategory(category);
        setNewCatName(category.name);
        setSelectedIcon(category.icon || 'cash');
        setSelectedColor(category.color || '#8B5CF6');
        setCatType(category.cat_type || 'spending');
        setModalVisible(true);
    };

    const closeModal = () => {
        setNewCatName('');
        setSelectedIcon('cash');
        setSelectedColor('#8B5CF6');
        setCatType('spending');
        setEditingCategory(null);
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
        <TouchableOpacity
            onPress={() => openEditModal(item)}
            style={[styles.categoryItem, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
            <View style={[styles.iconContainer, { backgroundColor: (item.color || colors.background || '#F1F5F9') + '20' }]}>
                <Icon name={item.icon} size={24} color={item.color || colors.primary} />
            </View>
            <Text style={[styles.categoryName, { color: colors.text }]}>{item.name}</Text>
            {!item.is_default && (
                <TouchableOpacity onPress={(e) => {
                    e.stopPropagation();
                    handleDelete(item.id, item.name, item.is_default);
                }}>
                    <Icon name="delete-outline" size={24} color="#EF4444" />
                </TouchableOpacity>
            )}
            {item.is_default && (
                <View style={[styles.defaultBadge, { backgroundColor: (item.color || '#64748B') + '20' }]}>
                    <Text style={[styles.defaultBadgeText, { color: item.color || '#64748B' }]}>Default</Text>
                </View>
            )}
        </TouchableOpacity>
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
                onRequestClose={closeModal}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>
                            {editingCategory ? 'Edit Category' : 'Add Category'}
                        </Text>

                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Category Name</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                            placeholder="e.g. Groceries"
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

                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Select Icon & Color</Text>
                        <View style={{ height: 200, marginBottom: 10 }}>
                            <FlatList
                                data={icons}
                                numColumns={6}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={[
                                            styles.iconOption,
                                            { borderColor: selectedIcon === item ? selectedColor : 'transparent' }
                                        ]}
                                        onPress={() => setSelectedIcon(item)}
                                    >
                                        <Icon name={item} size={24} color={selectedIcon === item ? selectedColor : colors.text} />
                                    </TouchableOpacity>
                                )}
                                keyExtractor={(item) => item}
                                contentContainerStyle={{ gap: 8, paddingBottom: 10 }}
                            />
                        </View>

                        <View style={styles.colorPalette}>
                            {colors_palette.map((color) => (
                                <TouchableOpacity
                                    key={color}
                                    style={[
                                        styles.colorOption,
                                        { backgroundColor: color, borderColor: selectedColor === color ? colors.text : 'transparent' }
                                    ]}
                                    onPress={() => setSelectedColor(color)}
                                />
                            ))}
                        </View>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.cancelButton} onPress={closeModal}>
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveButton} onPress={handleSubmit} disabled={isAdding}>
                                {isAdding ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.saveButtonText}>
                                        {editingCategory ? 'Update' : 'Add'}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Floating Action Button */}
            <TouchableOpacity
                style={[styles.fab, { backgroundColor: colors.primary }]}
                onPress={() => setModalVisible(true)}
                activeOpacity={0.8}
            >
                <Icon name="plus" size={32} color="#FFFFFF" />
            </TouchableOpacity>
        </SafeAreaView>
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
    colorPalette: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 20,
        justifyContent: 'center'
    },
    colorOption: {
        width: 30,
        height: 30,
        borderRadius: 15,
        borderWidth: 2,
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
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.27,
        shadowRadius: 4.65,
    },
});

export default CategoryManagementScreen;
