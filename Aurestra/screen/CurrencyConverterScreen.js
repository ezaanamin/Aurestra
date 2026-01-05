import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useSelector } from 'react-redux';
import { useSettings } from '../context/SettingsContext';

const { width } = Dimensions.get('window');

const CURRENCIES = [
  { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨', flag: '🇵🇰', rate: 1.0 },
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸', rate: 0.0036 }, // 1 PKR = 0.0036 USD
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺', rate: 0.0033 },
  { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧', rate: 0.0028 },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', flag: '🇦🇪', rate: 0.013 },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'ر.س', flag: '🇸🇦', rate: 0.013 },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', flag: '🇨🇦', rate: 0.0049 },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺', rate: 0.0055 },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵', rate: 0.53 },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳', rate: 0.026 },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳', rate: 0.30 },
];

const CurrencyConverterScreen = ({ navigation }) => {
  // Initial currencies (fallback) used as initial state
  const [currencyData, setCurrencyData] = useState(CURRENCIES);
  const [selectedCurrency, setSelectedCurrency] = useState(CURRENCIES[1]); // Default to USD (or first non-base)
  const [customAmount, setCustomAmount] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const { currency: baseCurrency } = useSettings();

  // Fetch live rates when base currency changes
  useEffect(() => {
    const fetchRates = async () => {
      try {
        const response = await fetch(`https://open.er-api.com/v6/latest/${baseCurrency}`);
        const data = await response.json();

        if (data && data.rates) {
          setLastUpdated(data.time_last_update_utc);

          // Update rates in our currency list
          const updatedCurrencies = CURRENCIES.map(curr => ({
            ...curr,
            rate: data.rates[curr.code] || curr.rate // Use live rate or fallback
          }));

          setCurrencyData(updatedCurrencies);
        }
      } catch (error) {
        console.error('Error fetching rates:', error);
        // Fallback to static cross-calculation if fetch fails
      }
    };

    fetchRates();
  }, [baseCurrency]);

  // Update selected currency if it conflicts with base
  // Update selected currency if it conflicts with base
  useEffect(() => {
    if (selectedCurrency.code === baseCurrency) {
      const nextAvailable = currencyData.find(c => c.code !== baseCurrency) || currencyData[0];
      setSelectedCurrency(nextAvailable);
    }
  }, [baseCurrency, currencyData]);

  // Get account balances from Redux
  const { accounts, accountsStatus } = useSelector((state) => state.API);

  // Calculate total Balance (treating base/numerical value as 'units')
  const totalBalance = accounts?.reduce((sum, acc) => sum + acc.balance, 0) || 0;

  const formatBase = (amount) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: baseCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatCurrency = (amount, currencyCode) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode.code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const convertAmount = (amount, targetCurrency) => {
    // If we have live data, the rate is already relative to Base
    // So we just multiply: Amount (Base) * Rate (Base -> Target)

    // Find rate in state
    const targetRate = currencyData.find(c => c.code === targetCurrency.code)?.rate || targetCurrency.rate;
    return amount * targetRate;
  };

  // Quick amount buttons
  const quickAmounts = [
    { label: 'Total Balance', value: totalBalance },
    { label: '10,000', value: 10000 },
    { label: '50,000', value: 50000 },
    { label: '100,000', value: 100000 },
  ];

  const amountToConvert = showCustomInput && customAmount
    ? parseFloat(customAmount)
    : totalBalance;

  if (accountsStatus === 'loading') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1E293B" />
        <LinearGradient colors={['#1E293B', '#334155']} style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Loading balances...</Text>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E293B" />

      {/* Header */}
      <LinearGradient colors={['#1E293B', '#334155']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Currency Converter</Text>
            <Text style={styles.headerSubtitle}>Convert {baseCurrency} to world currencies</Text>
          </View>
          <View style={styles.backButton} />
        </View>

        {/* Amount Display Card */}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Your {baseCurrency} Amount</Text>
          <Text style={styles.amountValue}>{formatBase(amountToConvert)}</Text>

          {/* Quick Amount Buttons */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.quickAmountsScroll}
          >
            {quickAmounts.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.quickAmountButton,
                  !showCustomInput && item.value === totalBalance && styles.quickAmountButtonActive
                ]}
                onPress={() => {
                  setShowCustomInput(false);
                  setCustomAmount('');
                }}
              >
                <Text style={[
                  styles.quickAmountText,
                  !showCustomInput && item.value === totalBalance && styles.quickAmountTextActive
                ]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[
                styles.quickAmountButton,
                showCustomInput && styles.quickAmountButtonActive
              ]}
              onPress={() => setShowCustomInput(true)}
            >
              <Text style={[
                styles.quickAmountText,
                showCustomInput && styles.quickAmountTextActive
              ]}>
                Custom
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Custom Amount Input */}
          {showCustomInput && (
            <View style={styles.customInputContainer}>
              <Text style={styles.customInputLabel}>₨</Text>
              <TextInput
                style={styles.customInput}
                placeholder="Enter amount"
                placeholderTextColor="#CBD5E1"
                keyboardType="numeric"
                value={customAmount}
                onChangeText={setCustomAmount}
                autoFocus
              />
            </View>
          )}
        </View>
      </LinearGradient>

      {/* Currency List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionHeader}>
          <Icon name="earth" size={20} color="#64748B" />
          <Text style={styles.sectionTitle}>Available Currencies</Text>
        </View>

        <View style={styles.currencyList}>
          {currencyData.filter(c => c.code !== baseCurrency).map((currency, index) => {
            const convertedAmount = convertAmount(amountToConvert, currency);

            return (
              <TouchableOpacity
                key={currency.code}
                style={[
                  styles.currencyCard,
                  selectedCurrency.code === currency.code && styles.currencyCardActive
                ]}
                onPress={() => setSelectedCurrency(currency)}
              >
                <View style={styles.currencyLeft}>
                  <View style={styles.currencyIconContainer}>
                    <Text style={styles.currencyFlag}>{currency.flag}</Text>
                  </View>
                  <View style={styles.currencyInfo}>
                    <Text style={styles.currencyCode}>{currency.code}</Text>
                    <Text style={styles.currencyName}>{currency.name}</Text>
                  </View>
                </View>

                <View style={styles.currencyRight}>
                  <Text style={styles.currencyAmount}>
                    {formatCurrency(convertedAmount, selectedCurrency)}
                  </Text>
                  <Text style={styles.currencyRate}>
                    1 {baseCurrency} = {(convertAmount(1, currency)).toFixed(4)} {currency.code}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Conversion Details Card */}
        {selectedCurrency && (
          <View style={styles.detailsCard}>
            <LinearGradient
              colors={['#3B82F6', '#2563EB']}
              style={styles.detailsGradient}
            >
              <View style={styles.detailsHeader}>
                <Text style={styles.detailsTitle}>Conversion Details</Text>
                <Text style={styles.detailsFlag}>{selectedCurrency.flag}</Text>
              </View>

              <View style={styles.conversionRow}>
                <View style={styles.conversionBox}>
                  <Text style={styles.conversionLabel}>From</Text>
                  <Text style={styles.conversionAmount}>{formatBase(amountToConvert)}</Text>
                  <Text style={styles.conversionCurrency}>{baseCurrency}</Text>
                </View>

                <View style={styles.conversionArrow}>
                  <Icon name="arrow-right" size={32} color="#FFFFFF" />
                </View>

                <View style={styles.conversionBox}>
                  <Text style={styles.conversionLabel}>To</Text>
                  <Text style={styles.conversionAmount}>
                    {formatCurrency(convertAmount(amountToConvert, selectedCurrency), selectedCurrency)}
                  </Text>
                  <Text style={styles.conversionCurrency}>{selectedCurrency.name}</Text>
                </View>
              </View>

              <View style={styles.rateInfo}>
                <Icon name="information-outline" size={16} color="rgba(255, 255, 255, 0.8)" />
                <Text style={styles.rateInfoText}>
                  Exchange Rate: 1 {baseCurrency} = {(convertAmount(1, selectedCurrency)).toFixed(4)} {selectedCurrency.code}
                </Text>
              </View>

              <View style={styles.disclaimer}>
                <Icon name="alert-circle-outline" size={14} color="rgba(255, 255, 255, 0.6)" />
                <Text style={styles.disclaimerText}>
                  Rates are approximate. Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleDateString() : 'Offline'}
                </Text>
              </View>
            </LinearGradient>
          </View>
        )}

        {/* Account Breakdown */}
        {accounts && accounts.length > 0 && (
          <View style={styles.accountsSection}>
            <View style={styles.sectionHeader}>
              <Icon name="wallet" size={20} color="#64748B" />
              <Text style={styles.sectionTitle}>Your Accounts in {selectedCurrency.code}</Text>
            </View>

            {accounts.map((account) => {
              const convertedBalance = convertAmount(account.balance, selectedCurrency);

              return (
                <View key={account.id} style={styles.accountBreakdownCard}>
                  <View style={styles.accountBreakdownLeft}>
                    <View style={styles.accountBreakdownIcon}>
                      <Icon
                        name={account.source === 'bank' ? 'bank' : 'wallet'}
                        size={20}
                        color="#3B82F6"
                      />
                    </View>
                    <View>
                      <Text style={styles.accountBreakdownName}>
                        {account.source.charAt(0).toUpperCase() + account.source.slice(1)}
                      </Text>
                      <Text style={styles.accountBreakdownPKR}>
                        {formatBase(account.balance)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.accountBreakdownConverted}>
                    {formatCurrency(convertedBalance, selectedCurrency)}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Popular Conversions */}
        <View style={styles.popularSection}>
          <View style={styles.sectionHeader}>
            <Icon name="star" size={20} color="#64748B" />
            <Text style={styles.sectionTitle}>Popular Conversions</Text>
          </View>

          <View style={styles.popularGrid}>
            {[
              { amount: 1000, label: '1K' },
              { amount: 10000, label: '10K' },
              { amount: 100000, label: '100K' },
              { amount: 1000000, label: '1M' },
            ].map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.popularCard}
                onPress={() => {
                  setShowCustomInput(true);
                  setCustomAmount(item.amount.toString());
                }}
              >
                <Text style={styles.popularLabel}>{item.label}</Text>
                <Icon name="arrow-down" size={16} color="#94A3B8" style={{ marginVertical: 4 }} />
                <Text style={styles.popularConverted}>
                  {selectedCurrency.symbol}{(convertAmount(item.amount, selectedCurrency)).toFixed(2)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingBottom: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
    width: 40,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  amountCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  amountLabel: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
    marginBottom: 8,
  },
  amountValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  quickAmountsScroll: {
    marginTop: 8,
  },
  quickAmountButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  quickAmountButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  quickAmountText: {
    fontSize: 13,
    color: '#CBD5E1',
    fontWeight: '600',
  },
  quickAmountTextActive: {
    color: '#FFFFFF',
  },
  customInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  customInputLabel: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginRight: 8,
  },
  customInput: {
    flex: 1,
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: 'bold',
    paddingVertical: 12,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  currencyList: {
    marginBottom: 20,
  },
  currencyCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  currencyCardActive: {
    borderColor: '#3B82F6',
    borderWidth: 2,
    backgroundColor: '#EFF6FF',
  },
  currencyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  currencyIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  currencyFlag: {
    fontSize: 28,
  },
  currencyInfo: {
    flex: 1,
  },
  currencyCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 2,
  },
  currencyName: {
    fontSize: 13,
    color: '#64748B',
  },
  currencyRight: {
    alignItems: 'flex-end',
  },
  currencyAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3B82F6',
    marginBottom: 2,
  },
  currencyRate: {
    fontSize: 11,
    color: '#94A3B8',
  },
  detailsCard: {
    marginBottom: 20,
    borderRadius: 24,
    overflow: 'hidden',
  },
  detailsGradient: {
    padding: 20,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  detailsFlag: {
    fontSize: 32,
  },
  conversionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  conversionBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  conversionLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    marginBottom: 8,
  },
  conversionAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  conversionCurrency: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  conversionArrow: {
    marginHorizontal: 8,
  },
  rateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  rateInfoText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  disclaimerText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 16,
    flex: 1,
  },
  accountsSection: {
    marginBottom: 20,
  },
  accountBreakdownCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  accountBreakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  accountBreakdownIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  accountBreakdownName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  accountBreakdownPKR: {
    fontSize: 13,
    color: '#64748B',
  },
  accountBreakdownConverted: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  popularSection: {
    marginBottom: 100,
  },
  popularGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  popularCard: {
    width: (width - 52) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  popularLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  popularConverted: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
});

export default CurrencyConverterScreen;
