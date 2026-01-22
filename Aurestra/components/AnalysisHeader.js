// components/AnalysisHeader.js

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSettings } from '../context/SettingsContext';

// Now accepts a 'title' prop with a default value
const AnalysisHeader = ({ navigation, title = "Quickly Analysis" }) => {
  const { colors } = useSettings();

  const handleGoBack = () => {
    if (navigation && navigation.goBack) {
      navigation.goBack();
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={handleGoBack}>
        <Icon name="arrow-left" size={24} color={colors.headerText || colors.text} />
      </TouchableOpacity>
      <Text style={[styles.title, { color: colors.headerText || colors.text }]}>{title}</Text>
      <Icon name="bell-outline" size={24} color={colors.headerText || colors.text} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});

export default AnalysisHeader;