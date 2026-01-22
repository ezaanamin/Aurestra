// components/TransactionItem.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSettings } from '../context/SettingsContext';

const TransactionItem = ({ item }) => {
  const { colors } = useSettings();

  // Use theme colors for success/error logic
  const successColor = colors.success;
  const errorColor = colors.error;

  const amountColor = item.isPositive ? successColor : errorColor;

  // Create subtle backgrounds with opacity
  const iconBgColor = item.isPositive
    ? (successColor + '20') // 20 hex opacity = ~12%
    : (errorColor + '20');

  const iconColor = item.isPositive ? successColor : errorColor;

  return (
    <View style={[styles.container, { borderBottomColor: colors.border }]}>
      <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
        <Icon name={item.iconName} size={24} color={iconColor} />
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.category, { color: colors.text }]}>{item.category}</Text>
        <Text style={[styles.date, { color: colors.textSecondary }]}>{item.date}</Text>
      </View>
      <View style={styles.detailsContainer}>
        <Text style={[styles.type, { color: colors.textSecondary }]}>{item.type}</Text>
        <Text style={[styles.amount, { color: amountColor }]}>
          {item.amount}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  iconContainer: {
    padding: 10,
    borderRadius: 15,
    marginRight: 15,
  },
  textContainer: {
    flex: 1,
  },
  category: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  date: {
    fontSize: 12,
  },
  detailsContainer: {
    alignItems: 'flex-end',
  },
  type: {
    fontSize: 14,
  },
  amount: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 2,
  },
});

export default TransactionItem;