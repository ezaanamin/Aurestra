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
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useSelector } from 'react-redux';
import { useSettings } from '../context/SettingsContext';

const { width } = Dimensions.get('window');

const CURRENCIES = [
  { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨', flag: '🇵🇰', rate: 1.0 },
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸', rate: 0.0036 },
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
  const [currencyData, setCurrencyData] = useState(CURRENCIES);
  const [selectedCurrency, setSelectedCurrency] = useState(CURRENCIES[1]);
  const [customAmount, setCustomAmount] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const { currency: baseCurrency, colors, isDarkMode } = useSettings();

  // Fetch live rates
  useEffect(() => {
    const fetchRates = async () => {
      try {
        const response = await fetch(`https://open.er-api.com/v6/latest/${baseCurrency}`);
        const data = await response.json();

        if (data && data.rates) {
          setLastUpdated(data.time_last_update_utc);
          const updatedCurrencies = CURRENCIES.map(curr => ({
            ...curr,
            rate: data.rates[curr.code] || curr.rate
          }));
          setCurrencyData(updatedCurrencies);
        }
      } catch (error) {
        console.error('Error fetching rates:', error);
      }
    };

    fetchRates();
  }, [baseCurrency]);

  useEffect(() => {
    if (selectedCurrency.code === baseCurrency) {
      const nextAvailable = currencyData.find(c => c.code !== baseCurrency) || currencyData[0];
      setSelectedCurrency(nextAvailable);
    }
  }, [baseCurrency, currencyData]);

  // Get account balances
  const { accounts, accountsStatus } = useSelector((state) => state.API);
  const totalBalance = accounts?.reduce((sum, acc) => sum + acc.balance, 0) || 0;

  const formatBase = (amount) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: baseCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatCurrency = (amount, currencyObj) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyObj.code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const convertAmount = (amount, targetCurrency) => {
    const targetRate = currencyData.find(c => c.code === targetCurrency.code)?.rate || targetCurrency.rate;
    return amount * targetRate;
  };

  const quickAmounts = [
    { label: 'Balance', value: totalBalance, icon: 'wallet' },
    { label: '10K', value: 10000, icon: 'cash-100' },
    { label: '50K', value: 50000, icon: 'cash-multiple' },
    { label: '100K', value: 100000, icon: 'bank' },
  ];

  const amountToConvert = showCustomInput && customAmount
    ? parseFloat(customAmount)
    : totalBalance;

  if (accountsStatus === 'loading') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle="light-content" backgroundColor={isDarkMode ? '#0F172A' : '#1E293B'} />
        <View style={styles.loadingContainer}>
          <LinearGradient
            colors={isDarkMode ? ['#0F172A', '#1E293B'] : ['#1E293B', '#334155']}
            style={styles.loadingGradient}
          >
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>Loading balances...</Text>
          </LinearGradient>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={isDarkMode ? '#0F172A' : '#1E293B'} />

      {/* Enhanced Header */}
      <LinearGradient 
        colors={isDarkMode ? ['#0F172A', '#1E293B', '#334155'] : ['#1E293B', '#334155', '#475569']} 
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <View style={styles.headerTitleRow}>
              <Icon name="swap-horizontal" size={22} color="#FFFFFF" />
              <Text style={styles.headerTitle}>Currency Converter</Text>
            </View>
            <Text style={styles.headerSubtitle}>Convert {baseCurrency} worldwide</Text>
          </View>
          <TouchableOpacity style={styles.refreshButton}>
            <Icon name="refresh" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Enhanced Amount Display Card */}
        <View style={styles.amountCard}>
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.08)']}
            style={styles.amountCardGradient}
          >
            <View style={styles.amountHeader}>
              <View style={styles.amountLabelRow}>
                <Icon name="cash" size={18} color="#94A3B8" />
                <Text style={styles.amountLabel}>Amount to Convert</Text>
              </View>
              <View style={styles.currencyBadge}>
                <Text style={styles.currencyBadgeText}>{baseCurrency}</Text>
              </View>
            </View>
            
            <Text style={styles.amountValue}>{formatBase(amountToConvert)}</Text>

            {/* Enhanced Quick Amount Buttons */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.quickAmountsScroll}
            >
              {quickAmounts.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.quickAmountButton}
                  onPress={() => {
                    setShowCustomInput(false);
                    setCustomAmount('');
                  }}
                  activeOpacity={0.7}
                >
                  {!showCustomInput && item.value === totalBalance ? (
                    <LinearGradient
                      colors={['#3B82F6', '#2563EB']}
                      style={styles.quickAmountButtonInner}
                    >
                      <Icon name={item.icon} size={16} color="#FFFFFF" />
                      <Text style={styles.quickAmountTextActive}>{item.label}</Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.quickAmountButtonInner}>
                      <Icon name={item.icon} size={16} color="#94A3B8" />
                      <Text style={styles.quickAmountText}>{item.label}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
              
              <TouchableOpacity
                style={styles.quickAmountButton}
                onPress={() => setShowCustomInput(true)}
                activeOpacity={0.7}
              >
                {showCustomInput ? (
                  <LinearGradient
                    colors={['#3B82F6', '#2563EB']}
                    style={styles.quickAmountButtonInner}
                  >
                    <Icon name="pencil" size={16} color="#FFFFFF" />
                    <Text style={styles.quickAmountTextActive}>Custom</Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.quickAmountButtonInner}>
                    <Icon name="pencil" size={16} color="#94A3B8" />
                    <Text style={styles.quickAmountText}>Custom</Text>
                  </View>
                )}
              </TouchableOpacity>
            </ScrollView>

            {/* Enhanced Custom Amount Input */}
            {showCustomInput && (
              <View style={styles.customInputContainer}>
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.15)']}
                  style={styles.customInputGradient}
                >
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
                  {customAmount && (
                    <TouchableOpacity onPress={() => setCustomAmount('')}>
                      <Icon name="close-circle" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                  )}
                </LinearGradient>
              </View>
            )}
          </LinearGradient>
        </View>
      </LinearGradient>

      {/* Currency List */}
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <View style={styles.sectionIconWrapper}>
              <LinearGradient
                colors={['#3B82F6', '#2563EB']}
                style={styles.sectionIconGradient}
              >
                <Icon name="earth" size={18} color="#FFFFFF" />
              </LinearGradient>
            </View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Available Currencies</Text>
          </View>
          <View style={styles.updateBadge}>
            <Icon name="update" size={12} color="#10B981" />
            <Text style={styles.updateBadgeText}>Live</Text>
          </View>
        </View>

        <View style={styles.currencyList}>
          {currencyData.filter(c => c.code !== baseCurrency).map((currency, index) => {
            const convertedAmount = convertAmount(amountToConvert, currency);
            const isSelected = selectedCurrency.code === currency.code;

            return (
              <TouchableOpacity
                key={currency.code}
                style={[
                  styles.currencyCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  isSelected && styles.currencyCardSelected
                ]}
                onPress={() => setSelectedCurrency(currency)}
                activeOpacity={0.7}
              >
                {isSelected && (
                  <LinearGradient
                    colors={['#3B82F615', '#2563EB08']}
                    style={styles.currencyCardGradient}
                  />
                )}
                
                <View style={styles.currencyLeft}>
                  <View style={styles.currencyIconContainer}>
                    <LinearGradient
                      colors={isDarkMode ? ['#1E293B', '#334155'] : ['#F8FAFC', '#F1F5F9']}
                      style={styles.currencyIconGradient}
                    >
                      <Text style={styles.currencyFlag}>{currency.flag}</Text>
                    </LinearGradient>
                  </View>
                  <View style={styles.currencyInfo}>
                    <Text style={[styles.currencyCode, { color: colors.text }]}>{currency.code}</Text>
                    <Text style={[styles.currencyName, { color: colors.textSecondary }]}>{currency.name}</Text>
                  </View>
                </View>

                <View style={styles.currencyRight}>
                  <Text style={[styles.currencyAmount, { color: isSelected ? '#3B82F6' : colors.text }]}>
                    {formatCurrency(convertedAmount, currency)}
                  </Text>
                  <View style={styles.currencyRateRow}>
                    <Icon name="swap-horizontal" size={10} color={colors.textSecondary} />
                    <Text style={[styles.currencyRate, { color: colors.textSecondary }]}>
                      1 = {(convertAmount(1, currency)).toFixed(4)}
                    </Text>
                  </View>
                </View>

                {isSelected && (
                  <View style={styles.selectedBadge}>
                    <LinearGradient
                      colors={['#3B82F6', '#2563EB']}
                      style={styles.selectedBadgeGradient}
                    >
                      <Icon name="check" size={14} color="#FFFFFF" />
                    </LinearGradient>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Enhanced Conversion Details Card */}
        {selectedCurrency && (
          <View style={styles.detailsCard}>
            <LinearGradient
              colors={['#3B82F6', '#2563EB', '#1D4ED8']}
              style={styles.detailsGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.detailsHeader}>
                <View>
                  <Text style={styles.detailsTitle}>Conversion Details</Text>
                  <Text style={styles.detailsSubtitle}>Real-time exchange rate</Text>
                </View>
                <View style={styles.detailsFlagWrapper}>
                  <Text style={styles.detailsFlag}>{selectedCurrency.flag}</Text>
                </View>
              </View>

              <View style={styles.conversionRow}>
                <View style={styles.conversionBox}>
                  <View style={[styles.conversionBoxInner, { backgroundColor: 'rgba(255, 255, 255, 0.15)' }]}>
                    <Text style={styles.conversionLabel}>From</Text>
                    <Text style={styles.conversionAmount}>{formatBase(amountToConvert)}</Text>
                    <Text style={styles.conversionCurrency}>{baseCurrency}</Text>
                  </View>
                </View>

                <View style={styles.conversionArrowWrapper}>
                  <View style={styles.conversionArrowCircle}>
                    <Icon name="arrow-right" size={24} color="#FFFFFF" />
                  </View>
                </View>

                <View style={styles.conversionBox}>
                  <View style={[styles.conversionBoxInner, { backgroundColor: 'rgba(255, 255, 255, 0.15)' }]}>
                    <Text style={styles.conversionLabel}>To</Text>
                    <Text style={styles.conversionAmount}>
                      {formatCurrency(convertAmount(amountToConvert, selectedCurrency), selectedCurrency)}
                    </Text>
                    <Text style={styles.conversionCurrency}>{selectedCurrency.code}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.rateInfo}>
                <Icon name="chart-line" size={16} color="rgba(255, 255, 255, 0.9)" />
                <Text style={styles.rateInfoText}>
                  1 {baseCurrency} = {(convertAmount(1, selectedCurrency)).toFixed(4)} {selectedCurrency.code}
                </Text>
              </View>

              <View style={styles.disclaimer}>
                <Icon name="clock-outline" size={14} color="rgba(255, 255, 255, 0.7)" />
                <Text style={styles.disclaimerText}>
                  Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleString() : 'Offline mode'}
                </Text>
              </View>
            </LinearGradient>
          </View>
        )}

        {/* Enhanced Account Breakdown */}
        {accounts && accounts.length > 0 && (
          <View style={styles.accountsSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <View style={styles.sectionIconWrapper}>
                  <LinearGradient
                    colors={['#10B981', '#059669']}
                    style={styles.sectionIconGradient}
                  >
                    <Icon name="wallet" size={18} color="#FFFFFF" />
                  </LinearGradient>
                </View>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Account Breakdown</Text>
              </View>
              <View style={styles.currencyInfoBadge}>
                <Text style={styles.currencyInfoBadgeText}>{selectedCurrency.code}</Text>
              </View>
            </View>

            {accounts.map((account) => {
              const convertedBalance = convertAmount(account.balance, selectedCurrency);

              return (
                <View 
                  key={account.id} 
                  style={[styles.accountBreakdownCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View style={styles.accountBreakdownLeft}>
                    <View style={styles.accountIconWrapper}>
                      <LinearGradient
                        colors={account.source === 'bank' ? ['#3B82F6', '#2563EB'] : ['#10B981', '#059669']}
                        style={styles.accountIconGradient}
                      >
                        <Icon
                          name={account.source === 'bank' ? 'bank' : 'wallet'}
                          size={20}
                          color="#FFFFFF"
                        />
                      </LinearGradient>
                    </View>
                    <View>
                      <Text style={[styles.accountBreakdownName, { color: colors.text }]}>
                        {account.source.charAt(0).toUpperCase() + account.source.slice(1)}
                      </Text>
                      <Text style={[styles.accountBreakdownPKR, { color: colors.textSecondary }]}>
                        {formatBase(account.balance)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.accountBreakdownRight}>
                    <Icon name="arrow-right" size={16} color={colors.textSecondary} />
                    <Text style={[styles.accountBreakdownConverted, { color: '#3B82F6' }]}>
                      {formatCurrency(convertedBalance, selectedCurrency)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Enhanced Popular Conversions */}
        <View style={styles.popularSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <View style={styles.sectionIconWrapper}>
                <LinearGradient
                  colors={['#F59E0B', '#D97706']}
                  style={styles.sectionIconGradient}
                >
                  <Icon name="star" size={18} color="#FFFFFF" />
                </LinearGradient>
              </View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Convert</Text>
            </View>
          </View>

          <View style={styles.popularGrid}>
            {[
              { amount: 1000, label: '1K', icon: 'cash' },
              { amount: 10000, label: '10K', icon: 'cash-100' },
              { amount: 100000, label: '100K', icon: 'cash-multiple' },
              { amount: 1000000, label: '1M', icon: 'bank' },
            ].map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.popularCard}
                onPress={() => {
                  setShowCustomInput(true);
                  setCustomAmount(item.amount.toString());
                }}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={isDarkMode ? ['#1E293B', '#334155'] : ['#FFFFFF', '#F8FAFC']}
                  style={styles.popularCardGradient}
                >
                  <View style={styles.popularIconWrapper}>
                    <LinearGradient
                      colors={['#3B82F615', '#2563EB08']}
                      style={styles.popularIconGradient}
                    >
                      <Icon name={item.icon} size={24} color="#3B82F6" />
                    </LinearGradient>
                  </View>
                  <Text style={[styles.popularLabel, { color: colors.text }]}>{item.label}</Text>
                  <View style={styles.popularDivider} />
                  <Text style={styles.popularConverted}>
                    {selectedCurrency.symbol}{(convertAmount(item.amount, selectedCurrency)).toFixed(2)}
                  </Text>
                  <Text style={[styles.popularCurrency, { color: colors.textSecondary }]}>
                    {selectedCurrency.code}
                  </Text>
                </LinearGradient>
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingGradient: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingBottom: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  amountCard: {
    marginHorizontal: 20,
    borderRadius: 24,
    overflow: 'hidden',
  },
  amountCardGradient: {
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 24,
  },
  amountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  amountLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  amountLabel: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
  },
  currencyBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  currencyBadgeText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  amountValue: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
    letterSpacing: -1,
  },
  quickAmountsScroll: {
    marginHorizontal: -4,
  },
  quickAmountButton: {
    marginHorizontal: 4,
    borderRadius: 14,
    overflow: 'hidden',
  },
  quickAmountButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 14,
  },
  quickAmountText: {
    fontSize: 13,
    color: '#CBD5E1',
    fontWeight: '600',
  },
  quickAmountTextActive: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  customInputContainer: {
    marginTop: 16,
    borderRadius: 14,
    overflow: 'hidden',
  },
  customInputGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 14,
  },
  customInputLabel: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginRight: 8,
  },
  customInput: {
    flex: 1,
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: 'bold',
    paddingVertical: 12,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionIconWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  sectionIconGradient: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: -0.3,
  },
  updateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10B98115',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  updateBadgeText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: 'bold',
  },
  currencyList: {
    marginBottom: 24,
  },
  currencyCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  currencyCardSelected: {
    borderColor: '#3B82F6',
    borderWidth: 2,
  },
  currencyCardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  currencyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    zIndex: 1,
  },
  currencyIconContainer: {
    borderRadius: 26,
    overflow: 'hidden',
    marginRight: 14,
  },
  currencyIconGradient: {
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currencyFlag: {
    fontSize: 32,
  },
  currencyInfo: {
    flex: 1,
  },
  currencyCode: {
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  currencyName: {
    fontSize: 13,
    fontWeight: '500',
  },
  currencyRight: {
    alignItems: 'flex-end',
    zIndex: 1,
  },
  currencyAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  currencyRateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  currencyRate: {
    fontSize: 11,
    fontWeight: '500',
  },
  selectedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    borderRadius: 12,
    overflow: 'hidden',
    zIndex: 2,
  },
  selectedBadgeGradient: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsCard: {
    marginBottom: 24,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  detailsGradient: {
    padding: 24,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  detailsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  detailsSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  detailsFlagWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsFlag: {
    fontSize: 36,
  },
  conversionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  conversionBox: {
    flex: 1,
  },
  conversionBoxInner: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  conversionLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  conversionAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  conversionCurrency: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
  },
  conversionArrowWrapper: {
    marginHorizontal: 12,
  },
  conversionArrowCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
  },
  rateInfoText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '600',
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  disclaimerText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  accountsSection: {
    marginBottom: 24,
  },
  currencyInfoBadge: {
    backgroundColor: '#10B98115',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  currencyInfoBadgeText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: 'bold',
  },
  accountBreakdownCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  accountBreakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  accountIconWrapper: {
    marginRight: 14,
    borderRadius: 22,
    overflow: 'hidden',
  },
  accountIconGradient: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountBreakdownName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  accountBreakdownPKR: {
    fontSize: 13,
    fontWeight: '500',
  },
  accountBreakdownRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accountBreakdownConverted: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: -0.3,
  },
  popularSection: {
    marginBottom: 24,
  },
  popularGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  popularCard: {
    width: (width - 52) / 2,
    borderRadius: 20,
    overflow: 'hidden',
  },
  popularCardGradient: {
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 20,
  },
  popularIconWrapper: {
    marginBottom: 12,
    borderRadius: 28,
    overflow: 'hidden',
  },
  popularIconGradient: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  popularLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  popularDivider: {
    width: 40,
    height: 2,
    backgroundColor: '#3B82F620',
    borderRadius: 1,
    marginVertical: 8,
  },
  popularConverted: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3B82F6',
    marginBottom: 2,
  },
  popularCurrency: {
    fontSize: 11,
    fontWeight: '600',
  },
});

export default CurrencyConverterScreen;