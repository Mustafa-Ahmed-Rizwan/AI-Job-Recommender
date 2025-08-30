import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import {
  Card,
  Button,
  ActivityIndicator,
  Surface,
  ProgressBar,
} from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { colors, typography, spacing, borderRadius } from '../config/theme';
import { apiService } from '../services/apiService';
import { authService } from '../services/authService';
import { ResumeInfo, ProfileSetupState } from '../types';

const { height: screenHeight } = Dimensions.get('window');

interface ProfileSetupScreenProps {
  onComplete: () => void;
}

export default function ProfileSetupScreen({ onComplete }: ProfileSetupScreenProps) {
  const [state, setState] = useState<ProfileSetupState>({
    step: 'welcome',
    resumeUploaded: false,
  });
  const [uploading, setUploading] = useState(false);
  const [resumeInfo, setResumeInfo] = useState<ResumeInfo | null>(null);

  const handleGetStarted = () => {
    setState({ ...state, step: 'upload' });
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
      console.error('Document picker error:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const uploadResume = async (file: DocumentPicker.DocumentPickerAsset) => {
    setUploading(true);
    try {
      console.log('Starting resume upload...');
      
      const result = await apiService.uploadResume(
        file.uri,
        file.name,
        file.mimeType || 'application/pdf'
      );

      console.log('Resume upload result:', result);

      // Store in user profile in backend
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        console.log('Updating user profile with resume info...');
        
        const success = await authService.updateResumeInfo(
          currentUser.uid, 
          result.resume_id, 
          result.resume_info
        );
        
        if (success) {
          setResumeInfo(result.resume_info);
          setState({ ...state, resumeUploaded: true, step: 'complete' });
          
          Alert.alert('Success', 'Resume processed successfully!');
        } else {
          throw new Error('Failed to update user profile');
        }
      } else {
        throw new Error('User not authenticated');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      Alert.alert(
        'Error',
        error.response?.data?.detail || error.message || 'Failed to process resume'
      );
    } finally {
      setUploading(false);
    }
  };

  const completeSetup = async () => {
    try {
      console.log('Completing profile setup...');
      
      // Ensure profile is marked as completed in Firestore
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        await authService.updateUserProfile(currentUser.uid, {
          profileCompleted: true,
          lastUpdated: new Date().toISOString()
        });
        console.log('Profile marked as completed');
      }
      
      // Trigger the onComplete callback
      onComplete();
    } catch (error) {
      console.error('Error completing setup:', error);
      Alert.alert('Error', 'Failed to complete setup. Please try again.');
    }
  };

  const renderWelcome = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconWrapper}>
        <MaterialIcons name="person-add" size={80} color={colors.primary[600]} />
      </View>
      
      <Text style={styles.welcomeTitle}>Welcome to AI Job Recommender!</Text>
      <Text style={styles.welcomeSubtitle}>
        Let's set up your profile to get personalized job recommendations
      </Text>
      
      <Card style={styles.featureCard}>
        <Card.Content>
          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <MaterialIcons name="smart-toy" size={24} color={colors.primary[600]} />
              <Text style={styles.featureText}>AI-powered job matching</Text>
            </View>
            <View style={styles.featureItem}>
              <MaterialIcons name="analytics" size={24} color={colors.green[600]} />
              <Text style={styles.featureText}>Skill gap analysis</Text>
            </View>
            <View style={styles.featureItem}>
              <MaterialIcons name="trending-up" size={24} color={colors.blue[600]} />
              <Text style={styles.featureText}>Career recommendations</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      <Button
        mode="contained"
        onPress={handleGetStarted}
        style={styles.primaryButton}
        contentStyle={styles.buttonContent}
      >
        Get Started
      </Button>
    </View>
  );

  const renderUpload = () => (
    <View style={styles.stepContainer}>
      <ProgressBar progress={0.5} color={colors.primary[600]} style={styles.progressBar} />
      
      <View style={styles.iconWrapper}>
        <MaterialIcons name="cloud-upload" size={64} color={colors.primary[600]} />
      </View>
      
      <Text style={styles.stepTitle}>Upload Your Resume</Text>
      <Text style={styles.stepSubtitle}>
        Upload your resume to get started with personalized job recommendations
      </Text>

      <Surface style={styles.uploadCard}>
        <TouchableOpacity
          style={styles.uploadArea}
          onPress={pickDocument}
          disabled={uploading}
        >
          <MaterialIcons
            name="description"
            size={48}
            color={uploading ? colors.gray[400] : colors.primary[600]}
          />
          <Text style={[styles.uploadTitle, uploading && styles.uploadTitleDisabled]}>
            {uploading ? 'Processing...' : 'Tap to Upload Resume'}
          </Text>
          <Text style={styles.uploadSubtitle}>
            PDF or DOCX files supported
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

      <Text style={styles.uploadNote}>
        Your resume will be securely processed and stored in your profile
      </Text>
    </View>
  );

  const renderComplete = () => (
    <View style={styles.stepContainer}>
      <ProgressBar progress={1.0} color={colors.green[600]} style={styles.progressBar} />
      
      <View style={styles.iconWrapper}>
        <MaterialIcons name="check-circle" size={80} color={colors.green[600]} />
      </View>
      
      <Text style={styles.stepTitle}>Profile Complete!</Text>
      <Text style={styles.stepSubtitle}>
        Your resume has been processed and your profile is ready
      </Text>

      {resumeInfo && (
        <Card style={styles.summaryCard}>
          <Card.Content>
            <Text style={styles.summaryTitle}>Resume Summary</Text>
            <View style={styles.summaryItems}>
              <View style={styles.summaryItem}>
                <MaterialIcons name="person" size={20} color={colors.gray[600]} />
                <Text style={styles.summaryText}>
                  {resumeInfo.email || 'Email not provided'}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <MaterialIcons name="build" size={20} color={colors.gray[600]} />
                <Text style={styles.summaryText}>
                  {resumeInfo.extracted_skills.length} skills extracted
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <MaterialIcons name="description" size={20} color={colors.gray[600]} />
                <Text style={styles.summaryText}>
                  {resumeInfo.sections.experience ? 'Experience found' : 'No experience section'}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      )}

      <Button
        mode="contained"
        onPress={completeSetup}
        style={styles.primaryButton}
        contentStyle={styles.buttonContent}
        icon="arrow-right"
      >
        Continue to App
      </Button>
      
      <Text style={styles.completeNote}>
        You can update your resume anytime in the Profile tab
      </Text>
    </View>
  );

  const getStepContent = () => {
    switch (state.step) {
      case 'welcome':
        return renderWelcome();
      case 'upload':
        return renderUpload();
      case 'complete':
        return renderComplete();
      default:
        return renderWelcome();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {getStepContent()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    minHeight: screenHeight - 100,
  },
  stepContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    minHeight: screenHeight * 0.8,
  },
  progressBar: {
    width: '100%',
    height: 4,
    marginBottom: spacing.xl,
    borderRadius: 2,
    alignSelf: 'stretch',
  },
  iconWrapper: {
    marginBottom: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeTitle: {
    ...typography.h1,
    textAlign: 'center',
    marginBottom: spacing.md,
    color: colors.gray[900],
    fontSize: 28,
    lineHeight: 34,
    paddingHorizontal: spacing.md,
  },
  welcomeSubtitle: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.xl,
    color: colors.gray[600],
    lineHeight: 24,
    paddingHorizontal: spacing.lg,
  },
  stepTitle: {
    ...typography.h2,
    textAlign: 'center',
    marginBottom: spacing.md,
    color: colors.gray[900],
    fontSize: 24,
    lineHeight: 30,
    paddingHorizontal: spacing.md,
  },
  stepSubtitle: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.xl,
    color: colors.gray[600],
    lineHeight: 24,
    paddingHorizontal: spacing.lg,
  },
  featureCard: {
    width: '100%',
    marginBottom: spacing.xl,
    borderRadius: borderRadius.lg,
    elevation: 2,
    maxWidth: 400,
  },
  featureList: {
    gap: spacing.lg,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureText: {
    ...typography.body,
    marginLeft: spacing.md,
    color: colors.gray[700],
    flex: 1,
  },
  uploadCard: {
    width: '100%',
    marginBottom: spacing.lg,
    borderRadius: borderRadius.lg,
    elevation: 2,
    maxWidth: 400,
  },
  uploadArea: {
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.gray[300],
    borderStyle: 'dashed',
    borderRadius: borderRadius.lg,
    backgroundColor: '#ffffff',
    minHeight: 200,
    justifyContent: 'center',
  },
  uploadTitle: {
    ...typography.h4,
    marginTop: spacing.md,
    color: colors.gray[900],
    textAlign: 'center',
  },
  uploadTitleDisabled: {
    color: colors.gray[500],
  },
  uploadSubtitle: {
    ...typography.bodySmall,
    marginTop: spacing.sm,
    color: colors.gray[600],
    textAlign: 'center',
  },
  uploadNote: {
    ...typography.caption,
    textAlign: 'center',
    color: colors.gray[500],
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  loader: {
    marginTop: spacing.md,
  },
  summaryCard: {
    width: '100%',
    marginBottom: spacing.xl,
    borderRadius: borderRadius.lg,
    elevation: 2,
    maxWidth: 400,
  },
  summaryTitle: {
    ...typography.h4,
    marginBottom: spacing.md,
    color: colors.gray[900],
  },
  summaryItems: {
    gap: spacing.md,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryText: {
    ...typography.body,
    marginLeft: spacing.md,
    color: colors.gray[700],
    flex: 1,
  },
  primaryButton: {
    backgroundColor: colors.primary[600],
    marginBottom: spacing.md,
    borderRadius: borderRadius.md,
    elevation: 2,
    minWidth: 200,
  },
  buttonContent: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  completeNote: {
    ...typography.caption,
    textAlign: 'center',
    color: colors.gray[500],
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
});