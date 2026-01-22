import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Switch,
  Modal,
  FlatList,
  Animated
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useDispatch, useSelector } from 'react-redux';
import { useSettings } from '../context/SettingsContext';

import { fetchUserProfile, registerDeviceToken, logout } from '../API/slice/API';
import { API_BASE_URL } from '../API_URL';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const LANGUAGES = ['English', 'Urdu', 'Arabic', 'French', 'Spanish'];
const CURRENCIES = ['PKR', 'USD', 'EUR', 'GBP', 'AED'];

const ProfileScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.API);
  const {
    isDarkMode,
    updateTheme,
    theme,
    notificationsEnabled,
    toggleNotifications,
    language,
    updateLanguage,
    currency,
    updateCurrency,
    t,
    colors
  } = useSettings();

  const [langModalVisible, setLangModalVisible] = useState(false);
  const [currModalVisible, setCurrModalVisible] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('');

  const lastCheck = useSelector(state => state.API.lastSmsCheck);

  React.useEffect(() => {
    dispatch(fetchUserProfile());
  }, [dispatch]);

  // Countdown Timer Logic
  React.useEffect(() => {
    if (!lastCheck) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const nextSync = lastCheck + (5 * 60 * 1000);
      const diff = nextSync - now;

      if (diff <= 0) {
        setTimeRemaining('Syncing now...');
      } else {
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setTimeRemaining(`${minutes}:${seconds < 10 ? '0' : ''}${seconds}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lastCheck]);

  const handleLogout = async () => {
    await AsyncStorage.removeItem('userToken');
    dispatch(logout());
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  const registerTokenIfAvailable = async () => {
    try {
      const pToken = await AsyncStorage.getItem('pushToken');
      if (pToken) {
        dispatch(registerDeviceToken(pToken));
      }
    } catch (e) {
      console.error('Profile register token fail:', e);
    }
  };

  // User Stats
  const userStats = [
    { label: t('transactions'), value: user?.stats?.transactions || '0', icon: 'swap-horizontal', color: '#3B82F6', gradient: ['#3B82F6', '#2563EB'] },
    { label: 'Categories', value: user?.stats?.categories || '0', icon: 'shape', color: '#8B5CF6', gradient: ['#8B5CF6', '#7C3AED'] },
    { label: 'Goals', value: user?.stats?.goals || '0', icon: 'target', color: '#10B981', gradient: ['#10B981', '#059669'] },
  ];

  // Menu Sections with enhanced icons
  const accountMenuItems = [
    { icon: 'account-edit', label: t('editProfile'), screen: 'EditProfile', color: '#3B82F6', gradient: ['#3B82F6', '#2563EB'] },
    { icon: 'wallet', label: t('paymentMethods'), screen: 'PaymentMethods', color: '#8B5CF6', gradient: ['#8B5CF6', '#7C3AED'] },
    { icon: 'bank', label: t('linkedAccounts'), screen: 'LinkedAccounts', color: '#10B981', gradient: ['#10B981', '#059669'] },
    { icon: 'shape', label: 'Categories', screen: 'CategoryManagement', color: '#EC4899', gradient: ['#EC4899', '#DB2777'] },
    { icon: 'brain', label: 'Financial Memories', screen: 'FinancialInsights', color: '#F59E0B', gradient: ['#F59E0B', '#D97706'] },
    { icon: 'file-document', label: t('transactionHistory'), screen: 'FullHistory', color: '#06B6D4', gradient: ['#06B6D4', '#0891B2'] },
  ];

  const preferencesMenuItems = [
    {
      icon: 'bell',
      label: t('notifications'),
      toggle: true,
      value: notificationsEnabled,
      setter: (val) => {
        toggleNotifications(val);
        if (val) {
          registerTokenIfAvailable();
        }
      },
      color: '#EF4444',
      gradient: ['#EF4444', '#DC2626']
    },
    {
      icon: 'theme-light-dark',
      label: t('darkMode'),
      toggle: true,
      value: isDarkMode,
      setter: (val) => updateTheme(val ? 'dark' : 'light'),
      color: '#64748B',
      gradient: ['#64748B', '#475569']
    },
    {
      icon: 'translate',
      label: t('language'),
      subtitle: language,
      action: () => setLangModalVisible(true),
      color: '#3B82F6',
      gradient: ['#3B82F6', '#2563EB']
    },
    {
      icon: 'currency-usd',
      label: t('currency'),
      subtitle: currency,
      action: () => setCurrModalVisible(true),
      color: '#10B981',
      gradient: ['#10B981', '#059669']
    },
  ];

  const supportMenuItems = [
    { icon: 'help-circle', label: t('helpCenter'), color: '#3B82F6', gradient: ['#3B82F6', '#2563EB'] },
    { icon: 'information', label: t('about'), color: '#8B5CF6', gradient: ['#8B5CF6', '#7C3AED'] },
    { icon: 'shield-check', label: t('privacyPolicy'), color: '#10B981', gradient: ['#10B981', '#059669'] },
    { icon: 'file-document-outline', label: t('termsOfService'), color: '#F59E0B', gradient: ['#F59E0B', '#D97706'] },
  ];

  const isScreenActive = (screenName) => {
    return screenName === 'Profile';
  };

  const renderMenuItem = (item, index, isLastItem) => {
    if (item.toggle) {
      return (
        <View 
          key={index} 
          style={[
            styles.menuItem, 
            isLastItem && styles.menuItemLast, 
            { borderBottomColor: colors.border }
          ]}
        >
          <View style={styles.menuIconContainer}>
            <LinearGradient
              colors={item.gradient}
              style={styles.menuIconWrapper}
            >
              <Icon name={item.icon} size={22} color="#FFFFFF" />
            </LinearGradient>
          </View>
          <View style={styles.menuTextContainer}>
            <Text style={[styles.menuLabel, { color: colors.text }]}>{item.label}</Text>
          </View>
          <Switch
            value={item.value}
            onValueChange={item.setter}
            trackColor={{ false: isDarkMode ? '#334155' : '#E2E8F0', true: item.color + '40' }}
            thumbColor={item.value ? item.color : '#FFFFFF'}
            ios_backgroundColor={isDarkMode ? '#334155' : '#E2E8F0'}
          />
        </View>
      );
    }

    return (
      <TouchableOpacity
        key={index}
        style={[
          styles.menuItem, 
          isLastItem && styles.menuItemLast, 
          { borderBottomColor: colors.border }
        ]}
        onPress={() => item.action ? item.action() : (item.screen && navigation.navigate(item.screen))}
        activeOpacity={0.7}
      >
        <View style={styles.menuIconContainer}>
          <LinearGradient
            colors={item.gradient}
            style={styles.menuIconWrapper}
          >
            <Icon name={item.icon} size={22} color="#FFFFFF" />
          </LinearGradient>
        </View>
        <View style={styles.menuTextContainer}>
          <Text style={[styles.menuLabel, { color: colors.text }]}>{item.label}</Text>
          {item.subtitle && (
            <Text style={[styles.menuSubtitle, { color: colors.textSecondary }]}>
              {item.subtitle}
            </Text>
          )}
        </View>
        <Icon name="chevron-right" size={22} color={colors.textSecondary} />
      </TouchableOpacity>
    );
  };

  const SelectionModal = ({ visible, onClose, title, data, onSelect, current }) => (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} onPress={onClose} style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{title}</Text>
              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                Choose your preferred option
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
              <Icon name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={data}
            keyExtractor={(item) => item}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                style={[
                  styles.modalItem, 
                  { borderBottomColor: colors.border },
                  index === data.length - 1 && styles.modalItemLast
                ]}
                onPress={() => { onSelect(item); onClose(); }}
                activeOpacity={0.7}
              >
                <View style={styles.modalItemContent}>
                  <Text style={[styles.modalItemText, { color: colors.text }]}>{item}</Text>
                  {current === item && (
                    <View style={styles.selectedBadge}>
                      <Text style={styles.selectedBadgeText}>Current</Text>
                    </View>
                  )}
                </View>
                {current === item && <Icon name="check-circle" size={24} color="#10B981" />}
              </TouchableOpacity>
            )}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor={isDarkMode ? '#0F172A' : '#1E293B'} 
      />

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Enhanced Header with Gradient */}
        <LinearGradient 
          colors={isDarkMode ? ['#0F172A', '#1E293B', '#334155'] : ['#1E293B', '#334155', '#475569']} 
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Header Navigation */}
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Icon name="arrow-left" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('profile')}</Text>
            <TouchableOpacity 
              style={styles.settingsButton}
              onPress={() => navigation.navigate('EditProfile')}
            >
              <Icon name="cog" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Enhanced Profile Card */}
          <View style={styles.profileCard}>
            <View style={styles.profileImageWrapper}>
              <LinearGradient
                colors={['#3B82F6', '#8B5CF6']}
                style={styles.profileImageBorder}
              >
                <Image
                  source={{
                    uri: user?.avatar_url
                      ? (user.avatar_url.startsWith('http') ? user.avatar_url : `${API_BASE_URL}${user.avatar_url}`)
                      : 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png'
                  }}
                  style={styles.profileImage}
                />
              </LinearGradient>
              <TouchableOpacity 
                style={styles.editImageButton} 
                onPress={() => navigation.navigate('EditProfile')}
              >
                <LinearGradient
                  colors={['#3B82F6', '#2563EB']}
                  style={styles.editImageGradient}
                >
                  <Icon name="camera" size={18} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
            <Text style={styles.profileName}>{user?.full_name || 'User'}</Text>
            <Text style={styles.profileEmail}>{user?.email || 'user@example.com'}</Text>
            <View style={styles.verifiedBadge}>
              <LinearGradient
                colors={['rgba(16, 185, 129, 0.2)', 'rgba(16, 185, 129, 0.1)']}
                style={styles.verifiedBadgeGradient}
              >
                <Icon name="check-decagram" size={16} color="#10B981" />
                <Text style={styles.verifiedText}>{t('verifiedAccount')}</Text>
              </LinearGradient>
            </View>
          </View>

          {/* Enhanced Stats Cards */}
          <View style={styles.statsContainer}>
            {userStats.map((stat, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.statCard}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[stat.color + '15', stat.color + '08']}
                  style={styles.statCardGradient}
                >
                  <View style={styles.statIconWrapper}>
                    <LinearGradient
                      colors={stat.gradient}
                      style={styles.statIconGradient}
                    >
                      <Icon name={stat.icon} size={22} color="#FFFFFF" />
                    </LinearGradient>
                  </View>
                  <Text style={[styles.statValue, { color: colors.text }]}>{stat.value}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{stat.label}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </LinearGradient>

        {/* Menu Sections */}
        <View style={styles.content}>
          {/* Account Section */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <View style={styles.sectionIconWrapper}>
                <LinearGradient
                  colors={['#3B82F6', '#2563EB']}
                  style={styles.sectionIconGradient}
                >
                  <Icon name="account-circle" size={18} color="#FFFFFF" />
                </LinearGradient>
              </View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('account')}</Text>
            </View>
          </View>
          <View style={[styles.menuSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {accountMenuItems.map((item, index) =>
              renderMenuItem(item, index, index === accountMenuItems.length - 1)
            )}
          </View>

          {/* Preferences Section */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <View style={styles.sectionIconWrapper}>
                <LinearGradient
                  colors={['#8B5CF6', '#7C3AED']}
                  style={styles.sectionIconGradient}
                >
                  <Icon name="tune" size={18} color="#FFFFFF" />
                </LinearGradient>
              </View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('preferences')}</Text>
            </View>
          </View>
          <View style={[styles.menuSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {preferencesMenuItems.map((item, index) =>
              renderMenuItem(item, index, index === preferencesMenuItems.length - 1)
            )}
          </View>

          {/* Support Section */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <View style={styles.sectionIconWrapper}>
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  style={styles.sectionIconGradient}
                >
                  <Icon name="lifebuoy" size={18} color="#FFFFFF" />
                </LinearGradient>
              </View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('support')}</Text>
            </View>
          </View>
          <View style={[styles.menuSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {supportMenuItems.map((item, index) =>
              renderMenuItem(item, index, index === supportMenuItems.length - 1)
            )}
          </View>

          {/* Enhanced Logout Button */}
          <TouchableOpacity 
            style={styles.logoutButton} 
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#EF4444', '#DC2626']}
              style={styles.logoutGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Icon name="logout" size={22} color="#FFFFFF" />
              <Text style={styles.logoutText}>{t('logout')}</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Enhanced App Info */}
          <View style={styles.appInfoContainer}>
            <View style={styles.versionBadge}>
              <Icon name="information-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.versionText, { color: colors.textSecondary }]}>
                Version 1.1.0
              </Text>
            </View>
            {lastCheck && (
              <View style={styles.syncInfoContainer}>
                <View style={styles.syncInfoRow}>
                  <Icon name="sync" size={14} color={colors.textSecondary} />
                  <Text style={[styles.syncInfoText, { color: colors.textSecondary }]}>
                    Last SMS Sync: {new Date(lastCheck).toLocaleTimeString()}
                  </Text>
                </View>
                <View style={styles.nextSyncBadge}>
                  <Icon name="clock-outline" size={14} color="#3B82F6" />
                  <Text style={styles.nextSyncText}>
                    Next: {timeRemaining || 'Calculating...'}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Enhanced Modals */}
      <SelectionModal
        visible={langModalVisible}
        onClose={() => setLangModalVisible(false)}
        title="Select Language"
        data={LANGUAGES}
        onSelect={updateLanguage}
        current={language}
      />
      <SelectionModal
        visible={currModalVisible}
        onClose={() => setCurrModalVisible(false)}
        title="Select Currency"
        data={CURRENCIES}
        onSelect={updateCurrency}
        current={currency}
      />

      {/* Enhanced Bottom Navigation */}
      <View style={[styles.bottomNav, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate('Home')}
          activeOpacity={0.7}
        >
          {isScreenActive('Home') && (
            <LinearGradient
              colors={['#3B82F6', '#2563EB']}
              style={styles.navIconActive}
            />
          )}
          <View style={[styles.navIconWrapper, isScreenActive('Home') && { zIndex: 1 }]}>
            <Icon
              name="home"
              size={24}
              color={isScreenActive('Home') ? '#FFFFFF' : colors.textSecondary}
            />
          </View>
          <Text style={[
            styles.navLabel, 
            { color: isScreenActive('Home') ? '#3B82F6' : colors.textSecondary }
          ]}>
            {t('home')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate('Budget')}
          activeOpacity={0.7}
        >
          {isScreenActive('Budget') && (
            <LinearGradient
              colors={['#3B82F6', '#2563EB']}
              style={styles.navIconActive}
            />
          )}
          <View style={[styles.navIconWrapper, isScreenActive('Budget') && { zIndex: 1 }]}>
            <Icon
              name="chart-bar"
              size={24}
              color={isScreenActive('Budget') ? '#FFFFFF' : colors.textSecondary}
            />
          </View>
          <Text style={[
            styles.navLabel, 
            { color: isScreenActive('Budget') ? '#3B82F6' : colors.textSecondary }
          ]}>
            {t('budget')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate('Transaction')}
          activeOpacity={0.7}
        >
          {isScreenActive('Transaction') && (
            <LinearGradient
              colors={['#3B82F6', '#2563EB']}
              style={styles.navIconActive}
            />
          )}
          <View style={[styles.navIconWrapper, isScreenActive('Transaction') && { zIndex: 1 }]}>
            <Icon
              name="swap-horizontal"
              size={24}
              color={isScreenActive('Transaction') ? '#FFFFFF' : colors.textSecondary}
            />
          </View>
          <Text style={[
            styles.navLabel, 
            { color: isScreenActive('Transaction') ? '#3B82F6' : colors.textSecondary }
          ]}>
            {t('transactions')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate('Saving')}
          activeOpacity={0.7}
        >
          {isScreenActive('Saving') && (
            <LinearGradient
              colors={['#3B82F6', '#2563EB']}
              style={styles.navIconActive}
            />
          )}
          <View style={[styles.navIconWrapper, isScreenActive('Saving') && { zIndex: 1 }]}>
            <Icon
              name="piggy-bank"
              size={24}
              color={isScreenActive('Saving') ? '#FFFFFF' : colors.textSecondary}
            />
          </View>
          <Text style={[
            styles.navLabel, 
            { color: isScreenActive('Saving') ? '#3B82F6' : colors.textSecondary }
          ]}>
            {t('savings')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate('Profile')}
          activeOpacity={0.7}
        >
          {isScreenActive('Profile') && (
            <LinearGradient
              colors={['#3B82F6', '#2563EB']}
              style={styles.navIconActive}
            />
          )}
          <View style={[styles.navIconWrapper, isScreenActive('Profile') && { zIndex: 1 }]}>
            <Icon
              name="account-circle"
              size={24}
              color={isScreenActive('Profile') ? '#FFFFFF' : colors.textSecondary}
            />
          </View>
          <Text style={[
            styles.navLabel, 
            { color: isScreenActive('Profile') ? '#3B82F6' : colors.textSecondary }
          ]}>
            {t('profile')}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCard: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  profileImageWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImageBorder: {
    padding: 4,
    borderRadius: 62,
  },
  profileImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 4,
    borderColor: '#1E293B',
  },
  editImageButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderRadius: 20,
    overflow: 'hidden',
  },
  editImageGradient: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#1E293B',
    borderRadius: 20,
  },
  profileName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  profileEmail: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 12,
    fontWeight: '500',
  },
  verifiedBadge: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  verifiedBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  verifiedText: {
    fontSize: 12,
    color: '#6EE7B7',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  statCardGradient: {
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
  },
  statIconWrapper: {
    marginBottom: 10,
    borderRadius: 22,
    overflow: 'hidden',
  },
  statIconGradient: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 2,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  content: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
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
  menuSection: {
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuIconContainer: {
    marginRight: 14,
  },
  menuIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuTextContainer: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  menuSubtitle: {
    fontSize: 13,
    marginTop: 2,
    fontWeight: '500',
  },
  logoutButton: {
    marginTop: 8,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  logoutGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  appInfoContainer: {
    alignItems: 'center',
    marginTop: 32,
    gap: 12,
  },
  versionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
    borderRadius: 12,
  },
  versionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  syncInfoContainer: {
    alignItems: 'center',
    gap: 8,
  },
  syncInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  syncInfoText: {
    fontSize: 11,
    fontWeight: '500',
  },
  nextSyncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  nextSyncText: {
    fontSize: 11,
    color: '#3B82F6',
    fontWeight: 'bold',
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  navItem: {
    alignItems: 'center',
    gap: 4,
    position: 'relative',
  },
  navIconWrapper: {
    padding: 8,
    borderRadius: 16,
  },
  navIconActive: {
    position: 'absolute',
    top: 0,
    left: '50%',
    marginLeft: -24,
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  navLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  modalSubtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalItemLast: {
    borderBottomWidth: 0,
  },
  modalItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalItemText: {
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  selectedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  selectedBadgeText: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default ProfileScreen;