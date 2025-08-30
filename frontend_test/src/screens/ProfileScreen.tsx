import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import {
  Card,
  Button,
  TextInput,
  Avatar,
  Divider,
  List,
  ActivityIndicator,
} from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, typography, spacing, borderRadius } from '../config/theme';
import { authService } from '../services/authService';
import { UserProfile } from '../types';

export default function ProfileScreen() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    displayName: '',
    email: '',
  });
  // Add state for app statistics
  const [appStats, setAppStats] = useState({
    resumesUploaded: 0,
    jobsAnalyzed: 0,
    reportsGenerated: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    loadUserProfile();
    loadAppStatistics();
  }, []);

  const loadUserProfile = async () => {
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      const profile = await authService.getUserProfile(currentUser.uid);
      if (profile) {
        setUser(profile);
        setEditForm({
          displayName: profile.displayName || '',
          email: profile.email,
        });
      }
    }
  };

  const loadAppStatistics = async () => {
    try {
      setStatsLoading(true);
      
      // Check if resume is uploaded
      const resumeId = await AsyncStorage.getItem('resume_id');
      const resumesUploaded = resumeId ? 1 : 0;
      
      // Check jobs analyzed (from stored job analyses or jobs data)
      const jobsData = await AsyncStorage.getItem('jobs_data');
      let jobsAnalyzed = 0;
      if (jobsData) {
        try {
          const parsedJobs = JSON.parse(jobsData);
          jobsAnalyzed = Array.isArray(parsedJobs) ? parsedJobs.length : 0;
        } catch (error) {
          console.error('Error parsing jobs data:', error);
        }
      }
      
      // For now, reports generated is 0 (you can implement this based on your app logic)
      const reportsGenerated = 0;
      
      setAppStats({
        resumesUploaded,
        jobsAnalyzed,
        reportsGenerated,
      });
    } catch (error) {
      console.error('Error loading app statistics:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const success = await authService.updateUserProfile(user.uid, {
        displayName: editForm.displayName,
      });

      if (success) {
        setUser({ ...user, displayName: editForm.displayName });
        setEditing(false);
        Alert.alert('Success', 'Profile updated successfully!');
      } else {
        Alert.alert('Error', 'Failed to update profile');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  // FIXED LOGOUT HANDLER
  const handleLogout = useCallback(() => {
    console.log('handleLogout called');
    
    if (signingOut) {
      console.log('Already signing out, ignoring duplicate call');
      return;
    }

    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            console.log('Sign out confirmed');
            setSigningOut(true);
            
            try {
              const result = await authService.logout();
              console.log('Logout result:', result);
              
              if (!result.success) {
                Alert.alert('Error', result.message);
                setSigningOut(false);
              }
              // If successful, the auth state change will handle navigation
              // No need to manually navigate or show success message
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
              setSigningOut(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  }, [signingOut]);

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[600]} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.profileCard}>
        <Card.Content style={styles.profileContent}>
          <Avatar.Text
            size={80}
            label={user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
            style={styles.avatar}
          />
          
          {editing ? (
            <View style={styles.editForm}>
              <TextInput
                label="Display Name"
                value={editForm.displayName}
                onChangeText={(displayName) => setEditForm({ ...editForm, displayName })}
                mode="outlined"
                style={styles.input}
              />
              
              <View style={styles.editActions}>
                <Button
                  mode="outlined"
                  onPress={() => {
                    setEditing(false);
                    setEditForm({
                      displayName: user.displayName || '',
                      email: user.email,
                    });
                  }}
                  style={styles.cancelButton}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={handleSave}
                  loading={loading}
                  disabled={loading}
                  style={styles.saveButton}
                >
                  Save
                </Button>
              </View>
            </View>
          ) : (
            <View style={styles.profileInfo}>
              <Text style={styles.displayName}>
                {user.displayName || 'No name set'}
              </Text>
              <Text style={styles.email}>{user.email}</Text>
              <Button
                mode="outlined"
                onPress={() => setEditing(true)}
                style={styles.editButton}
                icon="pencil"
              >
                Edit Profile
              </Button>
            </View>
          )}
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Account Information</Text>
          <List.Item
            title="Member Since"
            description={new Date(user.createdAt).toLocaleDateString()}
            left={(props) => <List.Icon {...props} icon="calendar" />}
          />
          <Divider />
          <List.Item
            title="Last Login"
            description={new Date(user.lastLogin).toLocaleDateString()}
            left={(props) => <List.Icon {...props} icon="login" />}
          />
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>App Statistics</Text>
            {statsLoading && (
              <ActivityIndicator size="small" color={colors.primary[600]} />
            )}
          </View>
          <List.Item
            title="Resumes Uploaded"
            description={statsLoading ? 'Loading...' : appStats.resumesUploaded.toString()}
            left={(props) => <List.Icon {...props} icon="file-upload" />}
          />
          <Divider />
          <List.Item
            title="Jobs Analyzed"
            description={statsLoading ? 'Loading...' : appStats.jobsAnalyzed.toString()}
            left={(props) => <List.Icon {...props} icon="analytics" />}
          />
          <Divider />
          <List.Item
            title="Reports Generated"
            description={statsLoading ? 'Loading...' : appStats.reportsGenerated.toString()}
            left={(props) => <List.Icon {...props} icon="assessment" />}
          />
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <List.Item
            title="Notifications"
            description="Manage your notification preferences"
            left={(props) => <List.Icon {...props} icon="bell" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => Alert.alert('Info', 'Notifications settings coming soon!')}
          />
          <Divider />
          <List.Item
            title="Privacy"
            description="Control your privacy settings"
            left={(props) => <List.Icon {...props} icon="shield-account" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => Alert.alert('Info', 'Privacy settings coming soon!')}
          />
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Support</Text>
          <List.Item
            title="Help & FAQ"
            description="Get answers to common questions"
            left={(props) => <List.Icon {...props} icon="help-circle" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => Alert.alert('Info', 'Help center coming soon!')}
          />
          <Divider />
          <List.Item
            title="Contact Support"
            description="Get help from our team"
            left={(props) => <List.Icon {...props} icon="email" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => Alert.alert('Info', 'Contact support feature coming soon!')}
          />
          <Divider />
          <List.Item
            title="Rate App"
            description="Share your feedback"
            left={(props) => <List.Icon {...props} icon="star" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => Alert.alert('Info', 'App rating coming soon!')}
          />
        </Card.Content>
      </Card>

      <Card style={styles.dangerCard}>
        <Card.Content>
          <Text style={styles.dangerTitle}>Account Actions</Text>
          <Button
            mode="outlined"
            onPress={handleLogout}
            style={styles.logoutButton}
            textColor={colors.red[600]}
            icon="logout"
            loading={signingOut}
            disabled={signingOut}
          >
            {signingOut ? 'Signing Out...' : 'Sign Out'}
          </Button>
        </Card.Content>
      </Card>

      <View style={styles.footer}>
        <Text style={styles.footerText}>AI Job Recommender v1.0.0</Text>
        <Text style={styles.footerText}>Made with ❤️ for job seekers</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
    padding: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.gray[600],
    marginTop: spacing.md,
  },
  profileCard: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
  },
  profileContent: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  avatar: {
    backgroundColor: colors.primary[600],
    marginBottom: spacing.md,
  },
  profileInfo: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  displayName: {
    ...typography.h3,
    color: colors.gray[900],
  },
  email: {
    ...typography.body,
    color: colors.gray[600],
    marginBottom: spacing.md,
  },
  editButton: {
    borderColor: colors.primary[600],
  },
  editForm: {
    width: '100%',
    gap: spacing.md,
  },
  input: {
    backgroundColor: '#ffffff',
  },
  editActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
    borderColor: colors.gray[400],
  },
  saveButton: {
    flex: 1,
    backgroundColor: colors.primary[600],
  },
  card: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
  },
  sectionTitle: {
    ...typography.h4,
    marginBottom: spacing.md,
    color: colors.gray[900],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  dangerCard: {
    marginBottom: spacing.xl,
    borderRadius: borderRadius.lg,
    borderColor: colors.red[200],
    borderWidth: 1,
  },
  dangerTitle: {
    ...typography.h4,
    marginBottom: spacing.md,
    color: colors.red[800],
  },
  logoutButton: {
    borderColor: colors.red[600],
    marginTop: spacing.sm,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  footerText: {
    ...typography.caption,
    color: colors.gray[500],
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
});