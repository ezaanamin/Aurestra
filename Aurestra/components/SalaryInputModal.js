import React, { useState } from 'react';
import {
    View,
    Text,
    Modal,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { API_BASE_URL } from '../API_URL';

const SalaryInputModal = ({ visible, onClose, onUpdate }) => {
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (!amount) return;

        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/set_salary`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ amount: parseFloat(amount) }),
            });

            const data = await response.json();
            if (response.ok) {
                if (onUpdate) onUpdate();
                onClose();
                setAmount('');
            } else {
                alert("Error updating salary: " + data.error);
            }
        } catch (e) {
            alert("Network error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            transparent={true}
            visible={visible}
            animationType="fade"
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.overlay}
            >
                <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />

                <View style={styles.modalContainer}>
                    <LinearGradient
                        colors={['#1F2937', '#111827']}
                        style={styles.card}
                    >
                        <View style={styles.header}>
                            <View style={[styles.iconContainer, { backgroundColor: '#10B981' }]}>
                                <Icon name="cash-multiple" size={24} color="#FFF" />
                            </View>
                            <Text style={styles.title}>Update Monthly Salary</Text>
                            <Text style={styles.subtitle}>Set your target income for this month</Text>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.currencyPrefix}>Rs.</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="0.00"
                                placeholderTextColor="#6B7280"
                                keyboardType="numeric"
                                value={amount}
                                onChangeText={setAmount}
                                autoFocus={true}
                            />
                        </View>

                        <View style={styles.actions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.saveBtn}
                                onPress={handleSave}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#FFF" size="small" />
                                ) : (
                                    <LinearGradient
                                        colors={['#10B981', '#059669']}
                                        style={styles.gradientBtn}
                                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                    >
                                        <Text style={styles.saveText}>Save Salary</Text>
                                        <Icon name="check" size={18} color="#FFF" style={{ marginLeft: 5 }} />
                                    </LinearGradient>
                                )}
                            </TouchableOpacity>
                        </View>
                    </LinearGradient>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    modalContainer: {
        width: '85%',
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    card: {
        padding: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 24,
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        elevation: 10,
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#F9FAFB',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: '#9CA3AF',
        textAlign: 'center',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#374151',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#4B5563',
    },
    currencyPrefix: {
        fontSize: 20,
        fontWeight: '600',
        color: '#9CA3AF',
        marginRight: 8,
    },
    input: {
        flex: 1,
        fontSize: 24,
        fontWeight: '600',
        color: '#F9FAFB',
        padding: 0,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cancelBtn: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 10,
        // backgroundColor: '#374151',
        marginRight: 10,
    },
    cancelText: {
        color: '#9CA3AF',
        fontSize: 16,
        fontWeight: '600',
    },
    saveBtn: {
        flex: 1,
        borderRadius: 10,
        overflow: 'hidden',
        height: 48,
    },
    gradientBtn: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    saveText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
});

export default SalaryInputModal;
