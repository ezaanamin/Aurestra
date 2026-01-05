import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';
import axios from 'axios';
import { API_BASE_URL } from '../API_URL';
import { translations } from '../constants/translations';

const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
    const [theme, setTheme] = useState('light'); // 'light', 'dark', 'system'
    const [language, setLanguage] = useState('English');
    const [currency, setCurrency] = useState('PKR');
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);

    useEffect(() => {
        loadSettings();
    }, []);

    useEffect(() => {
        console.log('Settings State Changed:', { theme, language, currency, notificationsEnabled });
    }, [theme, language, currency, notificationsEnabled]);

    const loadSettings = async () => {
        try {
            const storedTheme = await AsyncStorage.getItem('settings_theme');
            const storedLang = await AsyncStorage.getItem('settings_language');
            const storedCurr = await AsyncStorage.getItem('settings_currency');
            const storedNotif = await AsyncStorage.getItem('settings_notifications');

            if (storedTheme) setTheme(storedTheme);
            if (storedLang) setLanguage(storedLang);
            if (storedCurr) setCurrency(storedCurr);
            if (storedNotif !== null) setNotificationsEnabled(storedNotif === 'true');
        } catch (e) {
            console.error('Failed to load settings', e);
        }
    };

    const updateTheme = async (newTheme) => {
        setTheme(newTheme);
        await AsyncStorage.setItem('settings_theme', newTheme);
    };

    const updateLanguage = async (newLang) => {
        setLanguage(newLang);
        await AsyncStorage.setItem('settings_language', newLang);
    };

    const updateCurrency = async (newCurr) => {
        setCurrency(newCurr);
        await AsyncStorage.setItem('settings_currency', newCurr);
    };

    const toggleNotifications = async (value) => {
        setNotificationsEnabled(value);
        await AsyncStorage.setItem('settings_notifications', String(value));

        // Sync with Backend
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (token) {
                await axios.post(
                    `${API_BASE_URL}/api/profile`,
                    { notifications_enabled: value },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
            }
        } catch (error) {
            console.error("Failed to sync notification setting:", error);
        }
    };

    // Computed dark mode boolean
    const isDarkMode = theme === 'dark' || (theme === 'system' && Appearance.getColorScheme() === 'dark');

    return (
        <SettingsContext.Provider value={{
            theme,
            isDarkMode,
            language,
            currency,
            notificationsEnabled,
            updateTheme,
            updateLanguage,
            updateCurrency,
            toggleNotifications,
            t: (key) => {
                const lang = language || 'English';
                return (translations[lang] && translations[lang][key])
                    ? translations[lang][key]
                    : translations['English'][key] || key;
            }
        }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => useContext(SettingsContext);
