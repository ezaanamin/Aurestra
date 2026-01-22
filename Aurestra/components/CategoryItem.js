// components/CategoryItem.js

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSettings } from '../context/SettingsContext';

const CategoryItem = ({ name, icon }) => {
  const { colors } = useSettings();

  return (
    <TouchableOpacity style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
        <Icon name={icon} size={36} color={colors.primary} />
      </View>
      <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '30%', // Allows for 3 items per row with some spacing
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    marginTop: 10,
    fontSize: 14,
  },
});

export default CategoryItem;