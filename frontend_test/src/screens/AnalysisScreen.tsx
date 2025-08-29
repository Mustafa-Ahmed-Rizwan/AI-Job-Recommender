import React, { useState, useEffect } from 'react';
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
  ActivityIndicator,
  Chip,
  ProgressBar,
  Surface,
  Divider,
} from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, typography, spacing, borderRadius } from '../config/theme';
import { apiService } from '../services/apiService';
import { authService } from '../services/authService';
import { JobAnalysis, Job } from '../types';

export default function AnalysisScreen() {
  const [loading, setLoading] = useState(false);
  const [analyses, setAnalyses] = useState<JobAnalysis[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState(0);
  const [jobsData, setJobsData] = useState<Job[]>([]);
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    loadStoredData();
  }, []);

  const loadStoredData = async () => {
    try {
      setInitialLoading(true);
      
      // Try to load from AsyncStorage first (cached data)
      const [storedResumeId, storedJobs] = await Promise.all([
        AsyncStorage.getItem('resume_id'),
        AsyncStorage.getItem('jobs_data')
      ]);

      if (storedResumeId) {
        setResumeId(storedResumeId);
      }

      if (storedJobs) {
        try {
          const parsedJobs = JSON.parse(storedJobs);
          setJobsData(parsedJobs);
        } catch (error) {
          console.error('Error parsing stored jobs:', error);
        }
      }

      // If no local data, try to get from user profile
      if (!storedResumeId) {
        const currentUser = authService.getCurrentUser();
        if (currentUser) {
          const userProfile = await authService.getUserProfile(currentUser.uid);
          if (userProfile && userProfile.resumeId) {
            setResumeId(userProfile.resumeId);
            // Cache for faster access
            await AsyncStorage.setItem('resume_id', userProfile.resumeId);
            
            if (userProfile.resumeInfo) {
              await AsyncStorage.setItem('resume_info', JSON.stringify(userProfile.resumeInfo));
            }
          }
        }
      }

    } catch (error) {
      console.error('Error loading stored data:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const startAnalysis = async () => {
    if (!resumeId) {
      Alert.alert('Error', 'Please upload your resume first in the Upload tab.');
      return;
    }

    if (!jobsData || jobsData.length === 0) {
      Alert.alert('Error', 'Please search for jobs first in the Search tab.');
      return;
    }
    
    setLoading(true);
    
    try {
      // Perform real skill gap analysis
      const result = await apiService.analyzeSkills(resumeId, jobsData);
      
      
      if (result.analyses && result.analyses.length > 0) {
        setAnalyses(result.analyses);
        setSelectedAnalysis(0);
        Alert.alert('Success', `Analysis completed for ${result.analyses.length} jobs!`);
      } else {
        throw new Error('No analysis data received');
      }
      
    } catch (error: any) {
      console.error('Analysis error:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderSkillChips = (skills: string[], color: string) => (
    <View style={styles.skillsContainer}>
      {skills.map((skill, index) => (
        <Chip
          key={index}
          style={[styles.skillChip, { backgroundColor: color + '20' }]}
          textStyle={[styles.skillChipText, { color: color }]}
        >
          {skill}
        </Chip>
      ))}
    </View>
  );

  const renderAnalysisSelector = () => {
    if (analyses.length <= 1) return null;

    return (
      <Card style={styles.selectorCard}>
        <Card.Content>
          <Text style={styles.selectorTitle}>Select Job Analysis ({analyses.length} total)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectorScroll}>
            {analyses.map((analysis, index) => (
              <Button
                key={index}
                mode={selectedAnalysis === index ? 'contained' : 'outlined'}
                onPress={() => setSelectedAnalysis(index)}
                style={[
                  styles.selectorButton,
                  selectedAnalysis === index && { backgroundColor: colors.primary[600] }
                ]}
                compact
              >
                {`${index + 1}. ${analysis.job_info.title}`}
              </Button>
            ))}
          </ScrollView>
        </Card.Content>
      </Card>
    );
  };

  const renderAnalysisContent = () => {
    if (analyses.length === 0) return null;

    const analysis = analyses[selectedAnalysis];
    const matchPercentage = typeof analysis.job_match_assessment.overall_match_percentage === 'string' 
      ? parseFloat(analysis.job_match_assessment.overall_match_percentage)
      : analysis.job_match_assessment.overall_match_percentage;

    return (
      <ScrollView style={styles.analysisContent}>
        {/* Job Selection */}
        {renderAnalysisSelector()}

        {/* Job Header */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.jobHeaderContent}>
              <Text style={styles.jobTitle}>{analysis.job_info.title}</Text>
              <Text style={styles.jobCompany}>{analysis.job_info.company}</Text>
              <Text style={styles.jobLocation}>{analysis.job_info.location}</Text>
            </View>
            
            <Divider style={styles.divider} />
            
            <View style={styles.matchContainer}>
              <Text style={styles.matchPercentage}>{Math.round(matchPercentage)}%</Text>
              <Text style={styles.matchLabel}>Overall Match</Text>
              <ProgressBar
                progress={matchPercentage / 100}
                color={matchPercentage >= 80 ? colors.green[600] : matchPercentage >= 60 ? colors.yellow[600] : colors.blue[600]}
                style={styles.progressBar}
              />
            </View>
          </Card.Content>
        </Card>

        {/* Skills Analysis */}
        <View style={styles.skillsGrid}>
          <Card style={[styles.card, styles.skillsCard]}>
            <Card.Content>
              <View style={styles.skillsHeader}>
                <MaterialIcons name="check-circle" size={20} color={colors.green[600]} />
                <Text style={styles.skillsTitle}>Matching Skills</Text>
                <Text style={styles.skillCount}>({analysis.skill_gap_analysis.matching_skills.length})</Text>
              </View>
              {analysis.skill_gap_analysis.matching_skills.length > 0 ? 
                renderSkillChips(analysis.skill_gap_analysis.matching_skills, colors.green[600]) :
                <Text style={styles.emptyText}>No matching skills found</Text>
              }
            </Card.Content>
          </Card>

          <Card style={[styles.card, styles.skillsCard]}>
            <Card.Content>
              <View style={styles.skillsHeader}>
                <MaterialIcons name="cancel" size={20} color={colors.red[600]} />
                <Text style={styles.skillsTitle}>Missing Skills</Text>
                <Text style={styles.skillCount}>({analysis.skill_gap_analysis.missing_skills.length})</Text>
              </View>
              {analysis.skill_gap_analysis.missing_skills.length > 0 ?
                renderSkillChips(analysis.skill_gap_analysis.missing_skills, colors.red[600]) :
                <Text style={styles.emptyText}>No missing skills identified</Text>
              }
            </Card.Content>
          </Card>
        </View>

        {/* Transferable Skills */}
        {analysis.skill_gap_analysis.transferable_skills.length > 0 && (
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="swap-horiz" size={20} color={colors.blue[600]} />
                <Text style={styles.sectionTitle}>Transferable Skills</Text>
              </View>
              {renderSkillChips(analysis.skill_gap_analysis.transferable_skills, colors.blue[600])}
            </Card.Content>
          </Card>
        )}

        {/* Priority Skills */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="priority-high" size={20} color={colors.orange[600]} />
              <Text style={styles.sectionTitle}>Priority Skills to Learn</Text>
            </View>
            <View style={styles.prioritySkills}>
              {analysis.recommendations.priority_skills_to_learn.map((skill, index) => (
                <View key={index} style={styles.prioritySkillItem}>
                  <View style={styles.priorityNumber}>
                    <Text style={styles.priorityNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.prioritySkillText}>{skill}</Text>
                </View>
              ))}
            </View>
            {analysis.recommendations.timeline_estimate && (
              <View style={styles.timelineContainer}>
                <MaterialIcons name="schedule" size={16} color={colors.blue[600]} />
                <Text style={styles.timelineText}>
                  Estimated Timeline: {analysis.recommendations.timeline_estimate}
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Strengths and Concerns */}
        <View style={styles.strengthsConcerns}>
          <Card style={[styles.card, styles.halfCard]}>
            <Card.Content>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="trending-up" size={20} color={colors.green[600]} />
                <Text style={styles.sectionTitle}>Strengths</Text>
              </View>
              {analysis.job_match_assessment.strengths.map((strength, index) => (
                <View key={index} style={styles.listItem}>
                  <Text style={styles.listItemText}>• {strength}</Text>
                </View>
              ))}
            </Card.Content>
          </Card>

          <Card style={[styles.card, styles.halfCard]}>
            <Card.Content>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="warning" size={20} color={colors.yellow[600]} />
                <Text style={styles.sectionTitle}>Areas to Improve</Text>
              </View>
              {analysis.job_match_assessment.concerns.map((concern, index) => (
                <View key={index} style={styles.listItem}>
                  <Text style={styles.listItemText}>• {concern}</Text>
                </View>
              ))}
            </Card.Content>
          </Card>
        </View>

        {/* Learning Resources */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="school" size={20} color={colors.purple[600]} />
              <Text style={styles.sectionTitle}>Learning Resources</Text>
            </View>
            {analysis.recommendations.learning_resources.map((resource, index) => (
              <View key={index} style={styles.listItem}>
                <Text style={styles.listItemText}>• {resource}</Text>
              </View>
            ))}
          </Card.Content>
        </Card>

        {/* Project Suggestions */}
        {analysis.recommendations.project_suggestions.length > 0 && (
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="code" size={20} color={colors.indigo[600]} />
                <Text style={styles.sectionTitle}>Project Suggestions</Text>
              </View>
              {analysis.recommendations.project_suggestions.map((project, index) => (
                <View key={index} style={styles.listItem}>
                  <Text style={styles.listItemText}>• {project}</Text>
                </View>
              ))}
            </Card.Content>
          </Card>
        )}

        {/* Interview Tips */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="quiz" size={20} color={colors.teal[600]} />
              <Text style={styles.sectionTitle}>Interview Preparation</Text>
            </View>
            {analysis.job_match_assessment.interview_preparation_tips.map((tip, index) => (
              <View key={index} style={styles.listItem}>
                <Text style={styles.listItemText}>• {tip}</Text>
              </View>
            ))}
          </Card.Content>
        </Card>
      </ScrollView>
    );
  };

  const renderWelcomeScreen = () => (
    <View style={styles.welcomeContainer}>
      <Surface style={styles.welcomeCard}>
        <MaterialIcons name="analytics" size={64} color={colors.primary[600]} />
        <Text style={styles.welcomeTitle}>Skill Gap Analysis</Text>
        <Text style={styles.welcomeSubtitle}>
          AI-powered analysis of your skills vs job requirements
        </Text>
        
        {!resumeId && (
          <View style={styles.warningContainer}>
            <MaterialIcons name="warning" size={20} color={colors.yellow[600]} />
            <Text style={styles.warningText}>Upload your resume first</Text>
          </View>
        )}
        
        {!jobsData.length && resumeId && (
          <View style={styles.warningContainer}>
            <MaterialIcons name="search" size={20} color={colors.yellow[600]} />
            <Text style={styles.warningText}>Search for jobs first</Text>
          </View>
        )}
        
        <Button
          mode="contained"
          onPress={startAnalysis}
          loading={loading}
          disabled={loading || !resumeId || !jobsData.length}
          style={[
            styles.startButton,
            (!resumeId || !jobsData.length) && styles.disabledButton
          ]}
          contentStyle={styles.startButtonContent}
        >
          {loading ? 'Analyzing...' : `Analyze ${jobsData.length} Jobs`}
        </Button>
        
        <Text style={styles.analysisNote}>
         Analysis will be performed on all {jobsData.length} jobs
        </Text>
      </Surface>
    </View>
  );

  if (initialLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[600]} />
        <Text style={styles.loadingText}>Loading your data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {analyses.length === 0 ? (
        renderWelcomeScreen()
      ) : (
        renderAnalysisContent()
      )}

      {loading && (
        <View style={styles.loadingOverlay}>
          <Card style={styles.loadingCard}>
            <Card.Content style={styles.loadingContent}>
              <ActivityIndicator size="large" color={colors.primary[600]} />
              <Text style={styles.loadingTitle}>Analyzing Skills</Text>
              <Text style={styles.loadingSubtitle}>
                AI is comparing your profile with job requirements...
              </Text>
              <ProgressBar
                progress={0.7}
                color={colors.primary[600]}
                style={styles.loadingProgress}
              />
            </Card.Content>
          </Card>
        </View>
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
  welcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  welcomeCard: {
    padding: spacing.xl,
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    elevation: 4,
  },
  welcomeTitle: {
    ...typography.h2,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    textAlign: 'center',
    color: colors.gray[900],
  },
  welcomeSubtitle: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.xl,
    color: colors.gray[600],
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.yellow[50],
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  warningText: {
    ...typography.bodySmall,
    marginLeft: spacing.sm,
    color: colors.yellow[800],
  },
  startButton: {
    backgroundColor: colors.primary[600],
    marginBottom: spacing.md,
  },
  disabledButton: {
    backgroundColor: colors.gray[400],
  },
  startButtonContent: {
    paddingVertical: spacing.sm,
  },
  analysisNote: {
    ...typography.caption,
    textAlign: 'center',
    color: colors.gray[600],
  },
  analysisContent: {
    flex: 1,
    padding: spacing.md,
  },
  selectorCard: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
  },
  selectorTitle: {
    ...typography.h4,
    marginBottom: spacing.md,
    color: colors.gray[900],
  },
  selectorScroll: {
    flexDirection: 'row',
  },
  selectorButton: {
    marginRight: spacing.sm,
    minWidth: 120,
  },
  card: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
  },
  jobHeaderContent: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  jobTitle: {
    ...typography.h3,
    color: colors.gray[900],
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  jobCompany: {
    ...typography.body,
    color: colors.gray[700],
    marginBottom: spacing.xs,
  },
  jobLocation: {
    ...typography.bodySmall,
    color: colors.gray[600],
  },
  divider: {
    marginVertical: spacing.md,
  },
  matchContainer: {
    alignItems: 'center',
  },
  matchPercentage: {
    ...typography.h1,
    fontWeight: 'bold',
    color: colors.primary[600],
  },
  matchLabel: {
    ...typography.body,
    color: colors.gray[600],
    marginBottom: spacing.sm,
  },
  progressBar: {
    width: '100%',
    height: 8,
    borderRadius: 4,
  },
  skillsGrid: {
    gap: spacing.md,
  },
  skillsCard: {
    flex: 1,
  },
  skillsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  skillsTitle: {
    ...typography.h4,
    marginLeft: spacing.sm,
    color: colors.gray[900],
  },
  skillCount: {
    ...typography.bodySmall,
    marginLeft: spacing.xs,
    color: colors.gray[600],
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  skillChip: {
    marginBottom: spacing.xs,
  },
  skillChipText: {
    fontSize: 12,
  },
  emptyText: {
    ...typography.bodySmall,
    color: colors.gray[500],
    fontStyle: 'italic',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h4,
    marginLeft: spacing.sm,
    color: colors.gray[900],
  },
  prioritySkills: {
    gap: spacing.sm,
  },
  prioritySkillItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: colors.orange[50],
    borderRadius: borderRadius.md,
  },
  priorityNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.orange[600],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  priorityNumberText: {
    ...typography.bodySmall,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  prioritySkillText: {
    ...typography.body,
    color: colors.gray[800],
    flex: 1,
  },
  timelineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.blue[50],
    borderRadius: borderRadius.md,
  },
  timelineText: {
    ...typography.bodySmall,
    marginLeft: spacing.sm,
    color: colors.blue[800],
  },
  strengthsConcerns: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfCard: {
    flex: 1,
  },
  listItem: {
    marginBottom: spacing.xs,
  },
  listItemText: {
    ...typography.bodySmall,
    color: colors.gray[700],
    lineHeight: 20,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: borderRadius.lg,
  },
  loadingContent: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingTitle: {
    ...typography.h4,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    color: colors.gray[900],
  },
  loadingSubtitle: {
    ...typography.bodySmall,
    textAlign: 'center',
    marginBottom: spacing.lg,
    color: colors.gray[600],
  },
  loadingProgress: {
    width: '100%',
    height: 4,
  },
});