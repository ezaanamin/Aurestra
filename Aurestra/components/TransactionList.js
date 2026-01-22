// components/TransactionList.js
import React from 'react';
import { FlatList, View, StyleSheet } from 'react-native';
import TransactionItem from './TransactionItem';
import { transactions } from '../data/dummyData';
import { useSettings } from '../context/SettingsContext';

const TransactionList = () => {
  const { colors } = useSettings();

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TransactionItem item={item} />}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
    marginTop: 20,
  },
});

export default TransactionList;