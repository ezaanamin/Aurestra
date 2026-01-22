import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TextInput,
    TouchableOpacity,
    StatusBar,
    ScrollView,
    ActivityIndicator,
    Image,
    Platform,
    PermissionsAndroid,
    Linking
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUserProfile } from '../API/slice/API';
import { API_BASE_URL } from '../API_URL';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomModal from '../components/CustomModal';
import { useSettings } from '../context/SettingsContext';

import { launchImageLibrary } from 'react-native-image-picker';

const EditProfileScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const { colors, isDarkMode } = useSettings();
    const { user } = useSelector((state) => state.API);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [loading, setLoading] = useState(false);

    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [modalConfig, setModalConfig] = useState({ title: '', message: '', type: 'info', onConfirm: null });

    const showModal = (title, message, type = 'info') => {
        setModalConfig({ title, message, type });
        setModalVisible(true);
    };

    useEffect(() => {
        if (user) {
            setName(user.full_name || '');
            setEmail(user.email || '');
            setAvatarUrl(user.avatar_url || '');
        }
    }, [user]);

    const handleSelectImage = async () => {
        if (Platform.OS === 'android') {
            try {
                let permission = Platform.Version >= 33
                    ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
                    : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;

                const hasPermission = await PermissionsAndroid.check(permission);
                if (hasPermission) {
                    // Already granted, proceed
                } else {
                    const result = await PermissionsAndroid.request(permission);
                    if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
                        showConfirm(
                            'Permission Required',
                            'Photo access is blocked. Please enable it in settings to upload a profile picture.',
                            () => Linking.openSettings()
                        );
                        return;
                    } else if (result !== PermissionsAndroid.RESULTS.GRANTED) {
                        showModal('Permission Denied', 'You denied photo access.', 'error');
                        return;
                    }
                }
            } catch (err) {
                console.warn("Permission Error:", err);
            }
        }

        const options = {
            mediaType: 'photo',
            includeBase64: false,
        };

        try {
            const result = await launchImageLibrary(options);

            if (result.didCancel) return;
            if (result.errorMessage) {
                showModal('Error', result.errorMessage, 'error');
                return;
            }

            if (result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                uploadImage(asset);
            }
        } catch (error) {
            console.error("Gallery Error:", error);
            showModal('Error', 'Failed to open gallery.', 'error');
        }
    };

    // Helper for confirm modal since our showModal is currently for info/error only
    const showConfirm = (title, message, onConfirm) => {
        setModalConfig({
            title,
            message,
            type: 'confirm',
            onConfirm: () => {
                onConfirm();
                setModalVisible(false);
            }
        });
        setModalVisible(true);
    };

    const uploadImage = async (asset) => {
        setLoading(true);
        try {
            const token = await AsyncStorage.getItem('userToken');

            const formData = new FormData();
            formData.append('avatar', {
                uri: asset.uri,
                type: asset.type,
                name: asset.fileName || 'profile.jpg',
            });

            const response = await fetch(`${API_BASE_URL}/api/upload/avatar`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    // Boundary is handled automatically by fetch/FormData
                },
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                setAvatarUrl(data.avatar_url); // This will be relative path
                showModal('Success', 'Image uploaded successfully!', 'success');
            } else {
                throw new Error(data.error || 'Upload failed');
            }
        } catch (error) {
            console.error('Upload Error:', error);
            showModal('Error', 'Failed to upload image.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!name.trim()) {
            showModal('Error', 'Name cannot be empty', 'error');
            return;
        }

        setLoading(true);
        try {
            const token = await AsyncStorage.getItem('userToken');
            const response = await axios.post(
                `${API_BASE_URL}/api/profile`,
                { full_name: name, email: email, avatar_url: avatarUrl },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.status === 200) {
                // Refresh global state
                await dispatch(fetchUserProfile());
                showModal('Success', 'Profile updated successfully!', 'success');
                // navigation.goBack() will be handled by user closing modal or separate timeout? 
                // Alternatively, onConfirm of modal can goBack.
                // For now let's just show success and then goBack after delay or on modal close?
                // Actually the user probably wants to see the success message.
            }
        } catch (error) {
            console.error('Update profile error:', error);
            showModal('Error', 'Failed to update profile. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle="light-content" backgroundColor={colors.headerBackground} />

            {/* Header */}
            <LinearGradient colors={isDarkMode ? ['#020617', '#1E293B'] : ['#1E293B', '#334155']} style={styles.header}>
                <View style={styles.headerContent}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Icon name="arrow-left" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Edit Profile</Text>
                    <View style={{ width: 40 }} />
                </View>
            </LinearGradient>

            <ScrollView contentContainerStyle={styles.content}>

                <View style={styles.avatarContainer}>
                    <Image
                        source={{
                            uri: avatarUrl
                                ? (avatarUrl.startsWith('http') ? avatarUrl : `${API_BASE_URL}${avatarUrl}`)
                                : (user?.avatar_url
                                    ? (user.avatar_url.startsWith('http') ? user.avatar_url : `${API_BASE_URL}${user.avatar_url}`)
                                    : 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png')
                        }}
                        style={styles.previewImage}
                    />
                    <TouchableOpacity onPress={handleSelectImage} style={styles.uploadButton}>
                        <Icon name="camera" size={20} color="#FFFFFF" />
                        <Text style={styles.uploadButtonText}>Upload Photo</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.formGroup}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Full Name</Text>
                    <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                        <Icon name="account" size={20} color={colors.textSecondary} />
                        <TextInput
                            style={[styles.input, { color: colors.text }]}
                            value={name}
                            onChangeText={setName}
                            placeholder="Enter your full name"
                            placeholderTextColor={colors.textSecondary}
                        />
                    </View>
                </View>

                <View style={styles.formGroup}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Email Address</Text>
                    <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                        <Icon name="email" size={20} color={colors.textSecondary} />
                        <TextInput
                            style={[styles.input, { color: colors.text }]}
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            placeholder="Enter email"
                            placeholderTextColor={colors.textSecondary}
                            editable={false} // Prevent email change for now if it's identity
                        />
                    </View>
                    <Text style={[styles.helperText, { color: colors.textSecondary }]}>Email cannot be changed directly.</Text>
                </View>

                {/* Avatar URL Input Removed as per user request */}

                <TouchableOpacity onPress={handleSave} disabled={loading}>
                    <LinearGradient
                        colors={['#3B82F6', '#2563EB']}
                        style={styles.saveButton}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={styles.saveButtonText}>Save Changes</Text>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            </ScrollView>

            <CustomModal
                visible={modalVisible}
                onClose={() => {
                    setModalVisible(false);
                    if (modalConfig.type === 'success') {
                        navigation.goBack();
                    }
                }}
                title={modalConfig.title}
                message={modalConfig.message}
                type={modalConfig.type}
                onConfirm={modalConfig.onConfirm}
                confirmText={modalConfig.type === 'confirm' ? "Open Settings" : "OK"}
                cancelText="Cancel"
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    header: {
        paddingBottom: 20,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 16,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    backButton: {
        padding: 8,
    },
    content: {
        padding: 20,
    },
    avatarContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    previewImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginBottom: 12,
        borderWidth: 2,
        borderColor: '#3B82F6',
    },
    uploadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#3B82F6',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 8,
    },
    uploadButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    formGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#334155',
        marginBottom: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: 10,
    },
    input: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 15,
        color: '#1E293B',
    },
    helperText: {
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 4,
        marginLeft: 4
    },
    saveButton: {
        marginTop: 20,
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default EditProfileScreen;
