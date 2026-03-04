import AsyncStorage from '@react-native-async-storage/async-storage';

export let API_BASE_URL = 'https://pharmacology-reproductive-flexibility-william.trycloudflare.com';

export const setApiUrl = (url) => {
    if (!url) return;
    API_BASE_URL = url.replace(/\/$/, ""); // Remove trailing slash
};

export const loadApiUrl = async () => {
    try {
        const stored = await AsyncStorage.getItem('custom_api_url');
        if (stored) {
            setApiUrl(stored);
            console.log('🔗 Loaded Custom API URL:', API_BASE_URL);
        }
    } catch (e) {
        console.error('Failed to load API URL:', e);
    }
};
