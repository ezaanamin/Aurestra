import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Animated } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSettings } from '../context/SettingsContext';

const CustomAlert = ({ visible, type = 'error', title, message, onClose, onConfirm, showCancel }) => {
    const isError = type === 'error';
    const isSuccess = type === 'success';
    const isInfo = type === 'info';
    const { colors } = useSettings();

    const getIcon = () => {
        if (isError) return 'alert-circle-outline';
        if (isSuccess) return 'check-circle-outline';
        return 'information-outline';
    };

    const getColors = () => {
        if (isError) return [colors.error, colors.error]; // Could add darker variant if available
        if (isSuccess) return [colors.success, colors.success];
        return [colors.info, colors.info];
    };

    if (!visible) return null;

    return (
        <Modal
            transparent
            animationType="fade"
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={[styles.overlay, { backgroundColor: colors.modalOverlay }]}>
                <View style={[styles.alertBox, { backgroundColor: colors.card }]}>
                    <LinearGradient
                        colors={getColors()}
                        style={styles.iconContainer}
                    >
                        <Icon name={getIcon()} size={40} color="#FFFFFF" />
                    </LinearGradient>

                    <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
                    <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>

                    <View style={styles.buttonContainer}>
                        {showCancel && (
                            <TouchableOpacity
                                style={[styles.cancelButton, { backgroundColor: colors.background }]} // Use background or specific cancel bg
                                onPress={onClose}
                            >
                                <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
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
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    alertBox: {
        width: '100%',
        maxWidth: 340,
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
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
        borderColor: 'transparent', // Changed from white to transparent or match card bg if needed, but transparent is safer
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    message: {
        fontSize: 14,
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
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelText: {
        fontWeight: '600',
        fontSize: 16,
    },
});

export default CustomAlert;
