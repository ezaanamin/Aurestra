import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width } = Dimensions.get('window');

const CustomModal = ({ visible, onClose, title, message, type = 'info', onConfirm, confirmText = 'OK', cancelText = 'Cancel' }) => {
    const getIcon = () => {
        switch (type) {
            case 'success': return { name: 'check-circle', color: '#10B981' };
            case 'error': return { name: 'alert-circle', color: '#EF4444' };
            case 'confirm': return { name: 'help-circle', color: '#3B82F6' };
            default: return { name: 'information', color: '#64748B' };
        }
    };

    const iconData = getIcon();

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={[styles.iconWrapper, { backgroundColor: iconData.color + '20' }]}>
                        <Icon name={iconData.name} size={32} color={iconData.color} />
                    </View>

                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.message}>{message}</Text>

                    <View style={styles.buttonContainer}>
                        {type === 'confirm' && (
                            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                                <Text style={styles.cancelButtonText}>{cancelText}</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            style={[
                                styles.confirmButton,
                                type === 'confirm' ? { flex: 1 } : { width: '100%' },
                                { backgroundColor: iconData.color }
                            ]}
                            onPress={onConfirm || onClose}
                        >
                            <Text style={styles.confirmButtonText}>{confirmText}</Text>
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
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    container: {
        width: width - 60,
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    iconWrapper: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1E293B',
        textAlign: 'center',
        marginBottom: 8,
    },
    message: {
        fontSize: 15,
        color: '#64748B',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#64748B',
    },
    confirmButton: {
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        elevation: 2
    },
    confirmButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    }
});

export default CustomModal;
