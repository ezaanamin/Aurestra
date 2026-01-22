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
import { useDispatch } from 'react-redux';
import { setSalary } from '../API/slice/API';
import { API_BASE_URL } from '../API_URL';
import { useSettings } from '../context/SettingsContext';

const SalaryInputModal = ({ visible, onClose, onUpdate }) => {
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const { colors, isDarkMode } = useSettings();

    const dispatch = useDispatch();

    const handleSave = async () => {
        if (!amount) return;

        setLoading(true);
        try {
            await dispatch(setSalary(parseFloat(amount))).unwrap();

            if (onUpdate) onUpdate();
            onClose();
            setAmount('');
        } catch (error) {
            alert("Error updating salary: " + error);
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
                style={[styles.overlay, { backgroundColor: colors.modalOverlay }]}
            >
                <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />

                <View style={styles.modalContainer}>
                    <LinearGradient
                        colors={[colors.card, colors.card]}
                        style={styles.card}
                    >
                        <View style={styles.header}>
                            <View style={[styles.iconContainer, { backgroundColor: colors.success }]}>
                                <Icon name="cash-multiple" size={24} color="#FFF" />
                            </View>
                            <Text style={[styles.title, { color: colors.text }]}>Update Monthly Salary</Text>
                            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Set your target income for this month</Text>
                        </View>

                        <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground || colors.background, borderColor: colors.border }]}>
                            <Text style={[styles.currencyPrefix, { color: colors.textSecondary }]}>Rs.</Text>
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                placeholder="0.00"
                                placeholderTextColor={colors.textSecondary}
                                keyboardType="numeric"
                                value={amount}
                                onChangeText={setAmount}
                                autoFocus={true}
                            />
                        </View>

                        <View style={styles.actions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                                <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
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
                                        colors={[colors.primary, colors.primary]}
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
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        textAlign: 'center',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 24,
        borderWidth: 1,
    },
    currencyPrefix: {
        fontSize: 20,
        fontWeight: '600',
        marginRight: 8,
    },
    input: {
        flex: 1,
        fontSize: 24,
        fontWeight: '600',
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
        marginRight: 10,
    },
    cancelText: {
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
