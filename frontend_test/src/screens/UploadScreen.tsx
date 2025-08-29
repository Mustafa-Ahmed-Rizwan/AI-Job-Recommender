import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import {
  Card,
  Button,
  ActivityIndicator,
  Chip,
  Surface,
} from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, typography, spacing, borderRadius } from '../config/theme';
import { apiService } from '../services/apiService';
import { authService } from '../services/authService';
import { ResumeInfo } from '../types';

export default function UploadScreen() {
  const [resumeInfo, setResumeInfo] = useState<ResumeInfo | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load existing resume data on component mount
  useEffect(() => {
    loadExistingResume();
  }, []);

  const loadExistingResume = async () => {
    try {
      setLoading(true);
      
      // First check AsyncStorage (local cache)
      const storedResumeInfo = await AsyncStorage.getItem('resume_info');
      if (storedResumeInfo) {
        setResumeInfo(JSON.parse(storedResumeInfo));
        setLoading(false);
        return;
      }

      // If not in local storage, check if user has resume in profile
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        const userProfile = await authService.getUserProfile(currentUser.uid);
        if (userProfile && userProfile.resumeInfo) {
          setResumeInfo(userProfile.resumeInfo);
          // Store in local cache for faster access
          await AsyncStorage.setItem('resume_info', JSON.stringify(userProfile.resumeInfo));
          if (userProfile.resumeId) {
            await AsyncStorage.setItem('resume_id', userProfile.resumeId);
          }
        }
      }
    } catch (error) {
      console.error('Error loading existing resume:', error);
    } finally {
      setLoading(false);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        await uploadResume(file);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const uploadResume = async (file: DocumentPicker.DocumentPickerAsset) => {
    setUploading(true);
    try {
      const result = await apiService.uploadResume(
        file.uri,
        file.name,
        file.mimeType || 'application/pdf'
      );

      // Store resume data in user profile (backend)
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        await authService.updateResumeInfo(currentUser.uid, result.resume_id, result.resume_info);
      }

      setResumeInfo(result.resume_info);
      Alert.alert('Success', 'Resume processed and saved to your profile!');
    } catch (error: any) {
      console.error('Upload error:', error);
      Alert.alert(
        'Error',
        error.response?.data?.detail || 'Failed to process resume'
      );
    } finally {
      setUploading(false);
    }
  };

  const clearResume = async () => {
    Alert.alert(
      'Clear Resume',
      'Are you sure you want to remove your resume? This will also clear any job analyses.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              const currentUser = authService.getCurrentUser();
              if (currentUser) {
                // Clear from user profile (backend)
                await authService.clearResumeInfo(currentUser.uid);
              }
              
              setResumeInfo(null);
              Alert.alert('Success', 'Resume cleared successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear resume');
            }
          },
        },
      ]
    );
  };

  const renderResumeInfo = () => {
    if (!resumeInfo) return null;

    return (
      <ScrollView style={styles.resumeInfo}>
        {/* Action Buttons */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.actionButtons}>
              <Button
                mode="outlined"
                onPress={pickDocument}
                style={styles.actionButton}
                icon="upload"
              >
                Update Resume
              </Button>
              <Button
                mode="outlined"
                onPress={clearResume}
                style={[styles.actionButton, styles.clearButton]}
                textColor={colors.red[600]}
                icon="delete"
              >
                Clear Resume
              </Button>
            </View>
          </Card.Content>
        </Card>

        {/* Contact Info */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            {resumeInfo.email ? (
              <View style={styles.contactItem}>
                <MaterialIcons name="email" size={16} color={colors.gray[600]} />
                <Text style={styles.contactText}>{resumeInfo.email}</Text>
              </View>
            ) : (
              <Text style={styles.sectionText}>No email provided</Text>
            )}

            {resumeInfo.phone ? (
              <View style={styles.contactItem}>
                <MaterialIcons name="phone" size={16} color={colors.gray[600]} />
                <Text style={styles.contactText}>{resumeInfo.phone}</Text>
              </View>
            ) : (
              <Text style={styles.sectionText}>No phone provided</Text>
            )}
          </Card.Content>
        </Card>

        {/* Summary */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Summary</Text>
            <Text style={styles.summaryText}>
              {resumeInfo.summary && resumeInfo.summary.trim()
                ? resumeInfo.summary
                : "No summary available"}
            </Text>
          </Card.Content>
        </Card>

        {/* Skills */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Technical Skills</Text>
            {resumeInfo.extracted_skills && resumeInfo.extracted_skills.length > 0 ? (
              <View style={styles.skillsContainer}>
                {resumeInfo.extracted_skills.map((skill, index) => (
                  <Chip
                    key={index}
                    style={styles.skillChip}
                    textStyle={styles.skillChipText}
                  >
                    {skill}
                  </Chip>
                ))}
              </View>
            ) : (
              <Text style={styles.sectionText}>No skills found</Text>
            )}
          </Card.Content>
        </Card>

        {/* Experience */}
        {resumeInfo.sections?.experience && resumeInfo.sections.experience.trim() ? (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.sectionTitle}>Experience</Text>
              <Text style={styles.sectionText}>
                {resumeInfo.sections.experience.trim()}
              </Text>
            </Card.Content>
          </Card>
        ) : null}

        {/* Education */}
        {resumeInfo.sections?.education && resumeInfo.sections.education.trim() ? (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.sectionTitle}>Education</Text>
              <Text style={styles.sectionText}>
                {resumeInfo.sections.education.trim()}
              </Text>
            </Card.Content>
          </Card>
        ) : null}

        {/* Projects */}
        {resumeInfo.sections?.projects && resumeInfo.sections.projects.trim() ? (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.sectionTitle}>Projects</Text>
              <Text style={styles.sectionText}>
                {resumeInfo.sections.projects.trim()}
              </Text>
            </Card.Content>
          </Card>
        ) : null}
      </ScrollView>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[600]} />
        <Text style={styles.loadingText}>Loading your resume...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!resumeInfo ? (
        <View style={styles.uploadContainer}>
          <Text style={styles.title}>Upload Your Resume</Text>
          <Text style={styles.subtitle}>
            Your resume will be saved to your profile for future use
          </Text>

          <Surface style={styles.uploadCard}>
            <TouchableOpacity
              style={styles.uploadArea}
              onPress={pickDocument}
              disabled={uploading}
            >
              <MaterialIcons
                name="cloud-upload"
                size={48}
                color={uploading ? colors.gray[400] : colors.primary[600]}
              />
              <Text style={styles.uploadTitle}>
                {uploading ? 'Processing...' : 'Upload Resume'}
              </Text>
              <Text style={styles.uploadSubtitle}>
                Tap to browse PDF or DOCX files
              </Text>
              {uploading && (
                <ActivityIndicator
                  size="large"
                  color={colors.primary[600]}
                  style={styles.loader}
                />
              )}
            </TouchableOpacity>
          </Surface>

          <View style={styles.infoContainer}>
            <MaterialIcons name="info" size={16} color={colors.blue[600]} />
            <Text style={styles.infoText}>
              Your resume will be securely stored and available across all your devices
            </Text>
          </View>
        </View>
      ) : (
        <>
          <View style={styles.successHeader}>
            <MaterialIcons
              name="check-circle"
              size={24}
              color={colors.green[600]}
            />
            <Text style={styles.successText}>
              Resume Available in Your Profile
            </Text>
          </View>
          {renderResumeInfo()}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.body,
    marginTop: spacing.md,
    color: colors.gray[600],
  },
  uploadContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  title: {
    ...typography.h1,
    textAlign: 'center',
    marginBottom: spacing.md,
    color: colors.gray[900],
  },
  subtitle: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.xl,
    color: colors.gray[600],
  },
  uploadCard: {
    borderRadius: borderRadius.lg,
    elevation: 2,
    marginBottom: spacing.lg,
  },
  uploadArea: {
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.gray[300],
    borderStyle: 'dashed',
    borderRadius: borderRadius.lg,
    backgroundColor: '#ffffff',
  },
  uploadTitle: {
    ...typography.h4,
    marginTop: spacing.md,
    color: colors.gray[900],
  },
  uploadSubtitle: {
    ...typography.bodySmall,
    marginTop: spacing.sm,
    color: colors.gray[600],
  },
  loader: {
    marginTop: spacing.md,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.blue[50],
    borderRadius: borderRadius.md,
  },
  infoText: {
    ...typography.bodySmall,
    marginLeft: spacing.sm,
    color: colors.blue[800],
    flex: 1,
  },
  successHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    backgroundColor: colors.green[100],
    borderBottomWidth: 1,
    borderBottomColor: colors.green[200],
  },
  successText: {
    ...typography.h4,
    marginLeft: spacing.sm,
    color: colors.green[800],
  },
  resumeInfo: {
    flex: 1,
    padding: spacing.md,
  },
  card: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
  },
  clearButton: {
    borderColor: colors.red[600],
  },
  sectionTitle: {
    ...typography.h4,
    marginBottom: spacing.sm,
    color: colors.gray[900],
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  contactText: {
    ...typography.body,
    marginLeft: spacing.sm,
    color: colors.gray[700],
  },
  summaryText: {
    ...typography.body,
    color: colors.gray[700],
    lineHeight: 22,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  skillChip: {
    backgroundColor: colors.primary[100],
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  skillChipText: {
    color: colors.primary[800],
    fontSize: 12,
  },
  sectionText: {
    ...typography.bodySmall,
    color: colors.gray[700],
    lineHeight: 20,
  },
});