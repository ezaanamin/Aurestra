import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSettings } from '../context/SettingsContext';

const Header = () => {
  const currentHour = new Date().getHours();
  const { colors } = useSettings();

  let financeGreeting = '';
  if (currentHour >= 6 && currentHour < 11) {
    financeGreeting = 'Rise and shine! Let’s make today profitable ';
  } else if (currentHour >= 11 && currentHour < 17) {
    financeGreeting = 'Keep grinding — every dollar counts ';
  } else if (currentHour >= 17 && currentHour < 21) {
    financeGreeting = 'Great job today! Time to review your spending ';
  } else {
    financeGreeting = 'Rest easy — your money’s still working while you sleep ';
  }

  return (
    <View style={styles.container}>
      <View style={styles.textWrapper}>
        <Text style={[styles.greeting, { color: colors.headerText }]}>
          Welcome back, boss — ready for today’s insights?
        </Text>
        <Text style={[styles.subGreeting, { color: colors.headerText }]}>{financeGreeting}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: 55,
    paddingBottom: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textWrapper: {
    flex: 1,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
    flexWrap: 'wrap',
    flexShrink: 1,
  },
  subGreeting: {
    fontSize: 15,
    color: '#fff',
    opacity: 0.85,
    flexWrap: 'wrap',
    flexShrink: 1,
    lineHeight: 20,
  },
});

export default Header;
