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

const UncategorizedTransactionsModal = ({ visible, onClose, transaction }) => {
    const dispatch = useDispatch();
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
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.header}>
                        <Text style={styles.title}>{isEdit ? 'Edit Transaction' : 'New Transaction Detected'}</Text>
                    </View>

                    <View style={styles.txDetails}>
                        <Text style={[styles.amount, { color: isDebit ? '#EF4444' : '#10B981' }]}>
                            {isDebit ? '-' : '+'} Rs. {Math.abs(transaction.amount).toLocaleString()}
                        </Text>
                        <Text style={styles.merchant}>
                            {transaction.sender || transaction.receiver || 'Unknown Merchant'}
                        </Text>
                        <Text style={styles.date}>
                            {new Date(transaction.date).toLocaleString()}
                        </Text>
                    </View>

                    <Text style={styles.sectionTitle}>What was this for?</Text>

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
                                        selectedCategory?.id === cat.id && styles.categoryChipSelected,
                                    ]}
                                    onPress={() => setSelectedCategory(cat)}
                                >
                                    <Icon
                                        name={cat.icon}
                                        size={20}
                                        color={selectedCategory?.id === cat.id ? '#FFFFFF' : '#64748B'}
                                    />
                                    <Text
                                        style={[
                                            styles.categoryText,
                                            selectedCategory?.id === cat.id && styles.categoryTextSelected,
                                        ]}
                                    >
                                        {cat.name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                    </ScrollView>

                    <Text style={styles.sectionTitle}>Add a note (optional)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Lunch with friends"
                        placeholderTextColor="#94A3B8"
                        value={customNote}
                        onChangeText={setCustomNote}
                    />

                    <TouchableOpacity
                        style={[styles.saveButton, !selectedCategory && styles.saveButtonDisabled]}
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
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: '#FFFFFF',
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
        color: '#1E293B',
    },
    txDetails: {
        alignItems: 'center',
        marginBottom: 24,
        padding: 16,
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
    },
    amount: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    merchant: {
        fontSize: 16,
        color: '#64748B',
        marginBottom: 4,
    },
    date: {
        fontSize: 12,
        color: '#94A3B8',
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1E293B',
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
        backgroundColor: '#F1F5F9',
        borderRadius: 20,
        marginRight: 8,
        height: 40,
        gap: 8,
    },
    categoryChipSelected: {
        backgroundColor: '#3B82F6',
    },
    categoryText: {
        fontSize: 13,
        color: '#64748B',
        fontWeight: '500',
    },
    categoryTextSelected: {
        color: '#FFFFFF',
    },
    input: {
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        padding: 16,
        fontSize: 16,
        color: '#1E293B',
        marginBottom: 24,
    },
    saveButton: {
        backgroundColor: '#3B82F6',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
    },
    saveButtonDisabled: {
        backgroundColor: '#94A3B8',
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default UncategorizedTransactionsModal;
