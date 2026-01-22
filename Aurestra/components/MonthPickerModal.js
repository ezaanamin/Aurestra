import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width } = Dimensions.get('window');

const MonthPickerModal = ({ visible, onConfirm, onCancel, isDarkMode = false }) => {
    const [year, setYear] = useState(new Date().getFullYear());
    const currentYear = new Date().getFullYear();

    const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    const handleMonthSelect = (monthIndex) => {
        // Determine last day of the month for full range, or just 1st. 
        // Usually statement is for the whole month.
        // Create date as YYYY-MM-01
        const date = new Date(year, monthIndex, 1);
        onConfirm(date);
    };

    const changeYear = (delta) => {
        setYear(prev => prev + delta);
    };

    const backgroundColor = isDarkMode ? '#1E293B' : '#FFFFFF';
    const textColor = isDarkMode ? '#F8FAFC' : '#1E293B';
    const borderColor = isDarkMode ? '#334155' : '#E2E8F0';

    return (
        <Modal
            transparent={true}
            visible={visible}
            animationType="fade"
            onRequestClose={onCancel}
        >
            <View style={styles.overlay}>
                <View style={[styles.container, { backgroundColor }]}>

                    {/* Header with Year Selector */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => changeYear(-1)} style={styles.arrowButton}>
                            <Icon name="chevron-left" size={28} color={textColor} />
                        </TouchableOpacity>

                        <Text style={[styles.yearText, { color: textColor }]}>{year}</Text>

                        <TouchableOpacity
                            onPress={() => changeYear(1)}
                            style={[styles.arrowButton, year >= currentYear && styles.disabledArrow]}
                            disabled={year >= currentYear}
                        >
                            <Icon name="chevron-right" size={28} color={year >= currentYear ? '#94A3B8' : textColor} />
                        </TouchableOpacity>
                    </View>

                    {/* Month Grid */}
                    <View style={styles.grid}>
                        {months.map((month, index) => (
                            <TouchableOpacity
                                key={month}
                                style={[
                                    styles.monthButton,
                                    { borderColor },
                                    // Highlight current month if current year? Optional.
                                ]}
                                onPress={() => handleMonthSelect(index)}
                            >
                                <Text style={[styles.monthText, { color: textColor }]}>{month}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Footer - Cancel Only (Selection confirms) */}
                    <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
                        <Text style={styles.cancelText}>Cancel</Text>
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
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        width: width * 0.85,
        borderRadius: 16,
        padding: 20,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'transparent', // kept for structure
    },
    yearText: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    arrowButton: {
        padding: 8,
    },
    disabledArrow: {
        opacity: 0.5,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    monthButton: {
        width: '30%', // 3 columns
        paddingVertical: 12,
        marginBottom: 12,
        borderRadius: 8,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    monthText: {
        fontSize: 16,
        fontWeight: '500',
    },
    cancelButton: {
        marginTop: 8,
        alignSelf: 'center',
        padding: 10
    },
    cancelText: {
        color: '#EF4444',
        fontSize: 16,
        fontWeight: '600'
    }
});

export default MonthPickerModal;
