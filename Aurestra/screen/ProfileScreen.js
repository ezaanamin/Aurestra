// screen/ProfileScreen.js

import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar, Image, ScrollView } from 'react-native';
import AnalysisHeader from '../components/AnalysisHeader';
import ProfileListItem from '../components/ProfileListItem';
import BottomBar from '../components/BottomBar';

const ProfileScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#34d399" />
      <View style={styles.headerBackground}>
        <SafeAreaView>
          <AnalysisHeader navigation={navigation} title="Profile" />
        </SafeAreaView>
      </View>
      <ScrollView style={styles.contentContainer}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <Image
            source={{ uri: 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png' }}
            style={styles.profileImage}
          />
          <Text style={styles.profileName}>John Smith</Text>
          <Text style={styles.profileId}>ID: 25030024</Text>
          <View style={styles.listContainer}>
            <ProfileListItem icon="account-circle-outline" label="Edit Profile" />
            <ProfileListItem icon="security" label="Security" />
            <ProfileListItem icon="cog-outline" label="Setting" />
            <ProfileListItem icon="help-circle-outline" label="Help" />
            <ProfileListItem icon="logout-variant" label="Logout" />
          </View>
        </View>
      </ScrollView>
      <BottomBar navigation={navigation} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerBackground: {
    backgroundColor: '#34d399',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingBottom: 20,
  },
  contentContainer: {
    flex: 1,
    marginTop: -20,
    marginHorizontal: 20,
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 20,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#34d399',
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2d3748',
  },
  profileId: {
    fontSize: 14,
    color: '#a0aec0',
    marginBottom: 20,
  },
  listContainer: {
    width: '100%',
    paddingHorizontal: 20,
  },
});

export default ProfileScreen;