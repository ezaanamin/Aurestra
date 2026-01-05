import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Animated } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const CustomAlert = ({ visible, type = 'error', title, message, onClose, onConfirm, showCancel }) => {
    const isError = type === 'error';
    const isSuccess = type === 'success';
    const isInfo = type === 'info';

    const getIcon = () => {
        if (isError) return 'alert-circle-outline';
        if (isSuccess) return 'check-circle-outline';
        return 'information-outline';
    };

    const getColors = () => {
        if (isError) return ['#EF4444', '#DC2626'];
        if (isSuccess) return ['#10B981', '#059669'];
        return ['#3B82F6', '#2563EB'];
    };

    if (!visible) return null;

    return (
        <Modal
            transparent
            animationType="fade"
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.alertBox}>
                    <LinearGradient
                        colors={getColors()}
                        style={styles.iconContainer}
                    >
                        <Icon name={getIcon()} size={40} color="#FFFFFF" />
                    </LinearGradient>

                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.message}>{message}</Text>

                    <View style={styles.buttonContainer}>
                        {showCancel && (
                            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity style={styles.confirmButton} onPress={onConfirm || onClose}>
                            <LinearGradient
                                colors={getColors()}
                                style={styles.buttonGradient}
                            >
                                <Text style={styles.buttonText}>OK</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    alertBox: {
        width: '100%',
        maxWidth: 340,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 10,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        marginTop: -48,
        borderWidth: 4,
        borderColor: '#FFFFFF',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1E293B',
        marginBottom: 8,
        textAlign: 'center',
    },
    message: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    confirmButton: {
        flex: 1,
        borderRadius: 12,
        overflow: 'hidden',
    },
    buttonGradient: {
        paddingVertical: 12,
        alignItems: 'center',
    },
    buttonText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 16,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelText: {
        color: '#64748B',
        fontWeight: '600',
        fontSize: 16,
    },
});

export default CustomAlert;
