import React from 'react';
import { View, StyleSheet } from 'react-native';
import BottomBar from './BottomBar';

export default function MainLayout({ children, navigation }) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {children}
      </View>

      <BottomBar navigation={navigation} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingBottom: 75, // space for bottom bar
  },
});
