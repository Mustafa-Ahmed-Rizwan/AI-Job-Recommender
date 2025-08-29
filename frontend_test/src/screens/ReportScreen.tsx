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
  ProgressBar,
  Chip,
} from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../config/theme';
import { OverallReport } from '../types';

export default function ReportScreen() {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<OverallReport | null>(null);

  const generateReport = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock report data
      const mockReport: OverallReport = {
        summary: {
          total_jobs_analyzed: 5,
          average_match_percentage: '76%',
          most_common_missing_skills: ['Kubernetes', 'Docker', 'AWS', 'System Design', 'GraphQL'],
          strongest_skills: ['JavaScript', 'React', 'Node.js', 'MongoDB', 'REST APIs'],
        },
        recommendations: {
          top_skills_to_develop: ['Kubernetes', 'System Design', 'AWS', 'Docker', 'GraphQL'],
          career_readiness: 'needs_improvement',
          next_steps: [
            'Complete a Kubernetes certification course',
            'Build a microservices project using Docker',
            'Study system design patterns and practice interviews',
            'Get hands-on experience with AWS services',
            'Learn GraphQL and implement in a project',
          ],
        },
        job_analyses: [],
      };
      
      setReport(mockReport);
      Alert.alert('Success', 'Report generated successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const getReadinessColor = (readiness: string) => {
    switch (readiness) {
      case 'good': return colors.green[600];
      case 'needs_improvement': return colors.yellow[600];
      case 'significant_gaps': return colors.red[600];
      default: return colors.gray[600];
    }
  };

  const getReadinessLabel = (readiness: string) => {
    switch (readiness) {
      case 'good': return 'Ready';
      case 'needs_improvement': return 'Needs Work';
      case 'significant_gaps': return 'Major Gaps';
      default: return 'Unknown';
    }
  };

  const renderSummaryMetrics = () => {
    if (!report) return null;

    const readinessColor = getReadinessColor(report.recommendations.career_readiness);
    const readinessLabel = getReadinessLabel(report.recommendations.career_readiness);

    return (
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{report.summary.total_jobs_analyzed}</Text>
              <Text style={styles.metricLabel}>Jobs Analyzed</Text>
            </View>
            <View style={styles.metric}>
              <Text style={[styles.metricValue, { color: colors.primary[600] }]}>
                {report.summary.average_match_percentage}
              </Text>
              <Text style={styles.metricLabel}>Avg Match</Text>
            </View>
            <View style={styles.metric}>
              <Chip
                style={[styles.readinessChip, { backgroundColor: readinessColor + '20' }]}
                textStyle={[styles.readinessText, { color: readinessColor }]}
              >
                {readinessLabel}
              </Chip>
              <Text style={styles.metricLabel}>Career Readiness</Text>
            </View>
            <View style={styles.metric}>
              <Text style={[styles.metricValue, { color: colors.red[600] }]}>
                {report.recommendations.top_skills_to_develop.length}
              </Text>
              <Text style={styles.metricLabel}>Skills to Learn</Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderSkillsCharts = () => {
    if (!report) return null;

    return (
      <View style={styles.chartsContainer}>
        <Card style={[styles.card, styles.halfCard]}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Skills to Develop</Text>
            <View style={styles.skillsList}>
              {report.summary.most_common_missing_skills.slice(0, 6).map((skill, index) => (
                <View key={index} style={styles.skillItem}>
                  <Text style={styles.skillName}>{skill}</Text>
                  <View style={styles.skillBarContainer}>
                    <ProgressBar
                      progress={Math.random() * 0.6 + 0.4}
                      color={colors.red[500]}
                      style={styles.skillBar}
                    />
                  </View>
                </View>
              ))}
            </View>
          </Card.Content>
        </Card>

        <Card style={[styles.card, styles.halfCard]}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Your Strengths</Text>
            <View style={styles.skillsList}>
              {report.summary.strongest_skills.slice(0, 6).map((skill, index) => (
                <View key={index} style={styles.skillItem}>
                  <Text style={styles.skillName}>{skill}</Text>
                  <View style={styles.skillBarContainer}>
                    <ProgressBar
                      progress={Math.random() * 0.4 + 0.6}
                      color={colors.green[500]}
                      style={styles.skillBar}
                    />
                  </View>
                </View>
              ))}
            </View>
          </Card.Content>
        </Card>
      </View>
    );
  };

  const renderActionPlan = () => {
    if (!report) return null;

    return (
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Recommended Action Plan</Text>
          <View style={styles.actionPlan}>
            {report.recommendations.next_steps.map((step, index) => (
              <View key={index} style={styles.actionItem}>
                <View style={styles.actionNumber}>
                  <Text style={styles.actionNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.actionText}>{step}</Text>
              </View>
            ))}
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderLearningPath = () => {
    if (!report) return null;

    return (
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Priority Learning Areas</Text>
          <View style={styles.learningPath}>
            {report.recommendations.top_skills_to_develop.slice(0, 5).map((skill, index) => (
              <View key={index} style={styles.learningItem}>
                <View style={styles.learningHeader}>
                  <Text style={styles.learningSkill}>{skill}</Text>
                  <Text style={styles.learningPriority}>Priority {index + 1}</Text>
                </View>
                <ProgressBar
                  progress={0}
                  color={colors.primary[600]}
                  style={styles.learningProgress}
                />
                <Text style={styles.learningPercentage}>0% Complete</Text>
              </View>
            ))}
          </View>
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      {!report ? (
        <View style={styles.generateContainer}>
          <MaterialIcons name="assessment" size={64} color={colors.primary[600]} />
          <Text style={styles.generateTitle}>Comprehensive Report</Text>
          <Text style={styles.generateSubtitle}>
            Complete analysis and actionable recommendations
          </Text>
          <Button
            mode="contained"
            onPress={generateReport}
            loading={loading}
            disabled={loading}
            style={styles.generateButton}
            contentStyle={styles.generateButtonContent}
          >
            {loading ? 'Generating...' : 'Generate Report'}
          </Button>
        </View>
      ) : (
        <ScrollView style={styles.reportContent}>
          {renderSummaryMetrics()}
          {renderSkillsCharts()}
          {renderActionPlan()}
          {renderLearningPath()}
          
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.sectionTitle}>Export Options</Text>
              <View style={styles.exportButtons}>
                <Button
                  mode="outlined"
                  onPress={() => Alert.alert('Info', 'Export feature coming soon!')}
                  style={styles.exportButton}
                  icon="file-download"
                >
                  Download PDF
                </Button>
                <Button
                  mode="outlined"
                  onPress={() => Alert.alert('Info', 'Share feature coming soon!')}
                  style={styles.exportButton}
                  icon="share"
                >
                  Share Report
                </Button>
              </View>
            </Card.Content>
          </Card>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  generateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  generateTitle: {
    ...typography.h2,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    textAlign: 'center',
    color: colors.gray[900],
  },
  generateSubtitle: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.xl,
    color: colors.gray[600],
  },
  generateButton: {
    backgroundColor: colors.primary[600],
  },
  generateButtonContent: {
    paddingVertical: spacing.sm,
  },
  reportContent: {
    flex: 1,
    padding: spacing.md,
  },
  card: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
  },
  sectionTitle: {
    ...typography.h3,
    marginBottom: spacing.md,
    color: colors.gray[900],
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  metric: {
    alignItems: 'center',
    minWidth: '45%',
  },
  metricValue: {
    ...typography.h1,
    fontWeight: 'bold',
    color: colors.gray[900],
  },
  metricLabel: {
    ...typography.bodySmall,
    color: colors.gray[600],
    marginTop: spacing.xs,
  },
  readinessChip: {
    marginBottom: spacing.xs,
  },
  readinessText: {
    fontSize: 12,
    fontWeight: '600',
  },
  chartsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfCard: {
    flex: 1,
  },
  skillsList: {
    gap: spacing.sm,
  },
  skillItem: {
    gap: spacing.xs,
  },
  skillName: {
    ...typography.bodySmall,
    fontWeight: '500',
    color: colors.gray[800],
  },
  skillBarContainer: {
    width: '100%',
  },
  skillBar: {
    height: 6,
    borderRadius: 3,
  },
  actionPlan: {
    gap: spacing.md,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    backgroundColor: colors.blue[50],
    borderRadius: borderRadius.md,
  },
  actionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.blue[600],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    marginTop: 2,
  },
  actionNumberText: {
    ...typography.bodySmall,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  actionText: {
    ...typography.body,
    flex: 1,
    color: colors.gray[800],
    lineHeight: 22,
  },
  learningPath: {
    gap: spacing.md,
  },
  learningItem: {
    padding: spacing.md,
    backgroundColor: colors.gray[100],
    borderRadius: borderRadius.md,
  },
  learningHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  learningSkill: {
    ...typography.h4,
    color: colors.gray[900],
  },
  learningPriority: {
    ...typography.bodySmall,
    color: colors.gray[600],
  },
  learningProgress: {
    height: 6,
    borderRadius: 3,
    marginBottom: spacing.xs,
  },
  learningPercentage: {
    ...typography.caption,
    color: colors.gray[600],
  },
  exportButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  exportButton: {
    flex: 1,
  },
});