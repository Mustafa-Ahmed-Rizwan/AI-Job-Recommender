import React, { useState } from 'react';
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
} from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../config/theme';
import { apiService } from '../services/apiService';
import { JobAnalysis, Job } from '../types';

export default function AnalysisScreen() {
  const [loading, setLoading] = useState(false);
  const [analyses, setAnalyses] = useState<JobAnalysis[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState(0);

  const startAnalysis = async () => {
    // In a real app, you'd get these from app state or props
    // For now, we'll simulate the analysis
    setLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Mock analysis data
      const mockAnalyses: JobAnalysis[] = [
        {
          job_info: {
            title: 'Senior Software Engineer',
            company: 'Tech Corp',
            location: 'Karachi, Pakistan',
            apply_link: 'https://example.com',
            similarity_score: 0.85,
          },
          skill_gap_analysis: {
            matching_skills: ['JavaScript', 'React', 'Node.js', 'MongoDB'],
            missing_skills: ['Kubernetes', 'Docker', 'AWS'],
            skill_level_gaps: ['Advanced React patterns', 'System design'],
            transferable_skills: ['Problem solving', 'Team collaboration'],
          },
          recommendations: {
            priority_skills_to_learn: ['Kubernetes', 'System Design', 'AWS'],
            learning_resources: [
              'Kubernetes Documentation',
              'System Design Interview Book',
              'AWS Certified Developer Course',
            ],
            project_suggestions: [
              'Build a microservices application',
              'Deploy app using Kubernetes',
              'Create AWS serverless function',
            ],
            timeline_estimate: '3-6 months',
          },
          job_match_assessment: {
            overall_match_percentage: 85,
            strengths: [
              'Strong frontend development skills',
              'Good understanding of full-stack development',
              'Experience with modern JavaScript frameworks',
            ],
            concerns: [
              'Limited experience with cloud technologies',
              'No container orchestration experience',
            ],
            interview_preparation_tips: [
              'Review system design principles',
              'Practice coding problems on algorithms',
              'Study cloud architecture patterns',
            ],
          },
        },
      ];
      
      setAnalyses(mockAnalyses);
      Alert.alert('Success', 'Analysis completed successfully!');
    } catch (error: any) {
      Alert.alert('Error', 'Analysis failed. Please try again.');
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

  const renderAnalysisContent = () => {
    if (analyses.length === 0) return null;

    const analysis = analyses[selectedAnalysis];
    const matchPercentage = typeof analysis.job_match_assessment.overall_match_percentage === 'string' 
      ? parseFloat(analysis.job_match_assessment.overall_match_percentage)
      : analysis.job_match_assessment.overall_match_percentage;

    return (
      <ScrollView style={styles.analysisContent}>
        {/* Job Header */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.jobTitle}>{analysis.job_info.title}</Text>
            <Text style={styles.jobCompany}>{analysis.job_info.company}</Text>
            <Text style={styles.jobLocation}>{analysis.job_info.location}</Text>
            
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
              </View>
              {renderSkillChips(analysis.skill_gap_analysis.matching_skills, colors.green[600])}
            </Card.Content>
          </Card>

          <Card style={[styles.card, styles.skillsCard]}>
            <Card.Content>
              <View style={styles.skillsHeader}>
                <MaterialIcons name="cancel" size={20} color={colors.red[600]} />
                <Text style={styles.skillsTitle}>Missing Skills</Text>
              </View>
              {renderSkillChips(analysis.skill_gap_analysis.missing_skills, colors.red[600])}
            </Card.Content>
          </Card>
        </View>

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
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      {analyses.length === 0 ? (
        <View style={styles.startContainer}>
          <Surface style={styles.startCard}>
            <MaterialIcons name="analytics" size={64} color={colors.primary[600]} />
            <Text style={styles.startTitle}>Skill Gap Analysis</Text>
            <Text style={styles.startSubtitle}>
              AI-powered analysis of your skills vs job requirements
            </Text>
            <Button
              mode="contained"
              onPress={startAnalysis}
              loading={loading}
              disabled={loading}
              style={styles.startButton}
              contentStyle={styles.startButtonContent}
            >
              {loading ? 'Analyzing...' : 'Start AI Analysis'}
            </Button>
          </Surface>
        </View>
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
  startContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  startCard: {
    padding: spacing.xl,
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    elevation: 4,
  },
  startTitle: {
    ...typography.h2,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    textAlign: 'center',
    color: colors.gray[900],
  },
  startSubtitle: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.xl,
    color: colors.gray[600],
  },
  startButton: {
    backgroundColor: colors.primary[600],
  },
  startButtonContent: {
    paddingVertical: spacing.sm,
  },
  analysisContent: {
    flex: 1,
    padding: spacing.md,
  },
  card: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
  },
  jobTitle: {
    ...typography.h3,
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  jobCompany: {
    ...typography.body,
    color: colors.gray[700],
    marginBottom: spacing.xs,
  },
  jobLocation: {
    ...typography.bodySmall,
    color: colors.gray[600],
    marginBottom: spacing.md,
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