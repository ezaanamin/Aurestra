// components/TransactionItem.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const TransactionItem = ({ item }) => {
  const amountColor = item.isPositive ? '#38a169' : '#e53e3e';
  const iconBgColor = item.isPositive ? '#e6fffa' : '#fee2e2';
  const iconColor = item.isPositive ? '#38b2ac' : '#e53e3e';
  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
        <Icon name={item.iconName} size={24} color={iconColor} />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.category}>{item.category}</Text>
        <Text style={styles.date}>{item.date}</Text>
      </View>
      <View style={styles.detailsContainer}>
        <Text style={styles.type}>{item.type}</Text>
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
    borderBottomColor: '#e2e8f0',
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
    color: '#2d3748',
  },
  date: {
    fontSize: 12,
    color: '#a0aec0',
  },
  detailsContainer: {
    alignItems: 'flex-end',
  },
  type: {
    fontSize: 14,
    color: '#718096',
  },
  amount: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 2,
  },
});

export default TransactionItem;