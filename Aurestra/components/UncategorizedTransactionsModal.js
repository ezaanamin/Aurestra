import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    Modal,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCategories } from '../API/slice/API';
import { useSettings } from '../context/SettingsContext';

const UncategorizedTransactionsModal = ({ visible, onClose, transaction }) => {
    const dispatch = useDispatch();
    const { colors } = useSettings();
    const categories = useSelector((state) => state.API.categories || []);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [customNote, setCustomNote] = useState('');

    // Fetch categories on mount
    useEffect(() => {
        dispatch(fetchCategories());
    }, []);

    // Effect to pre-fill data if editing an existing transaction
    useEffect(() => {
        if (transaction) {
            // Find existing category if match
            if (transaction.purpose && transaction.purpose !== 'Uncategorized') {
                const found = categories.find(c => c.name === transaction.purpose);
                if (found) setSelectedCategory(found);
            } else {
                setSelectedCategory(null);
            }
            setCustomNote(transaction.notes || '');
        }
    }, [transaction]);

    if (!transaction) return null;

    // Default to debit/spending if type is missing or 'debit'
    const isDebit = !transaction.type || transaction.type === 'debit';
    const isEdit = transaction.purpose && transaction.purpose !== 'Uncategorized';

    const handleSave = () => {
        if (!selectedCategory) return;

        // Pass back the name of the category
        onClose(selectedCategory.name, customNote);

        // Reset
        setSelectedCategory(null);
        setCustomNote('');
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={() => onClose(null)}
        >
            <View style={[styles.overlay, { backgroundColor: colors.modalOverlay }]}>
                <View style={[styles.modalContainer, { backgroundColor: colors.card }]}>
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: colors.text }]}>{isEdit ? 'Edit Transaction' : 'New Transaction Detected'}</Text>
                    </View>

                    <View style={[styles.txDetails, { backgroundColor: colors.background }]}>
                        <Text style={[styles.amount, { color: isDebit ? colors.error : colors.success }]}>
                            {isDebit ? '-' : '+'} Rs. {Math.abs(transaction.amount).toLocaleString()}
                        </Text>
                        <Text style={[styles.merchant, { color: colors.textSecondary }]}>
                            {transaction.sender || transaction.receiver || 'Unknown Merchant'}
                        </Text>
                        <Text style={[styles.date, { color: colors.textSecondary }]}>
                            {new Date(transaction.date).toLocaleString()}
                        </Text>
                    </View>

                    <Text style={[styles.sectionTitle, { color: colors.text }]}>What was this for?</Text>

                    <ScrollView style={styles.categoriesList} horizontal showsHorizontalScrollIndicator={false}>
                        {categories
                            .filter(cat => {
                                if (isDebit) {
                                    return cat.cat_type === 'spending' || cat.cat_type === 'both';
                                } else {
                                    return cat.cat_type === 'income' || cat.cat_type === 'both';
                                }
                            })
                            .map((cat) => (
                                <TouchableOpacity
                                    key={cat.id}
                                    style={[
                                        styles.categoryChip,
                                        { backgroundColor: colors.background },
                                        selectedCategory?.id === cat.id && { backgroundColor: colors.primary },
                                    ]}
                                    onPress={() => setSelectedCategory(cat)}
                                >
                                    <Icon
                                        name={cat.icon}
                                        size={20}
                                        color={selectedCategory?.id === cat.id ? '#FFFFFF' : colors.textSecondary}
                                    />
                                    <Text
                                        style={[
                                            styles.categoryText,
                                            { color: colors.textSecondary },
                                            selectedCategory?.id === cat.id && styles.categoryTextSelected,
                                        ]}
                                    >
                                        {cat.name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                    </ScrollView>

                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Add a note (optional)</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                        placeholder="e.g. Lunch with friends"
                        placeholderTextColor={colors.textSecondary}
                        value={customNote}
                        onChangeText={setCustomNote}
                    />

                    <TouchableOpacity
                        style={[styles.saveButton, { backgroundColor: colors.primary }, !selectedCategory && styles.saveButtonDisabled]}
                        onPress={handleSave}
                        disabled={!selectedCategory}
                    >
                        <Text style={styles.saveButtonText}>Save Category</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalContainer: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        minHeight: 450,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    txDetails: {
        alignItems: 'center',
        marginBottom: 24,
        padding: 16,
        borderRadius: 16,
    },
    amount: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    merchant: {
        fontSize: 16,
        marginBottom: 4,
    },
    date: {
        fontSize: 12,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 12,
    },
    categoriesList: {
        flexDirection: 'row',
        marginBottom: 24,
        maxHeight: 50,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8,
        height: 40,
        gap: 8,
    },
    categoryText: {
        fontSize: 13,
        fontWeight: '500',
    },
    categoryTextSelected: {
        color: '#FFFFFF',
    },
    input: {
        borderRadius: 12,
        borderWidth: 1,
        padding: 16,
        fontSize: 16,
        marginBottom: 24,
    },
    saveButton: {
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
    },
    saveButtonDisabled: {
        backgroundColor: '#94A3B8',
        opacity: 0.5,
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default UncategorizedTransactionsModal;
