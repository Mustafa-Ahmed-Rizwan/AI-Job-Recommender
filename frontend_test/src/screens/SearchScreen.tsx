import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Linking,
} from 'react-native';
import {
  TextInput,
  Button,
  Card,
  ActivityIndicator,
  Chip,
  Surface,
  Menu,
  Divider,
} from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, typography, spacing, borderRadius } from '../config/theme';
import { apiService } from '../services/apiService';
import { authService } from '../services/authService';
import { Job } from '../types';

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [country, setCountry] = useState('Pakistan');
  const [city, setCity] = useState('');
  const [cities, setCities] = useState<string[]>([]);
  const [numJobs, setNumJobs] = useState(20);
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [queryId, setQueryId] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    loadCities();
    loadUserData();
    loadJobSuggestions();
  }, [country]);

  useEffect(() => {
    if (resumeId) {
      loadJobSuggestions();
    }
  }, [resumeId]);

  const loadCities = async () => {
    try {
      const result = await apiService.getCities(country);
      setCities(result.cities);
    } catch (error) {
      console.error('Error loading cities:', error);
    }
  };

  const loadUserData = async () => {
    try {
      setInitialLoading(true);
      
      // First check AsyncStorage (cached data)
      const storedResumeId = await AsyncStorage.getItem('resume_id');
      
      if (storedResumeId) {
        setResumeId(storedResumeId);
      } else {
        // If no local data, try to get from user profile
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

      // Load cached jobs if available
      const storedJobs = await AsyncStorage.getItem('jobs_data');
      if (storedJobs) {
        try {
          const parsedJobs = JSON.parse(storedJobs);
          setJobs(parsedJobs);
        } catch (error) {
          console.error('Error parsing stored jobs:', error);
        }
      }

    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const loadJobSuggestions = async () => {
    if (!resumeId) return;

    try {
      setLoadingSuggestions(true);
      
      // Get user profile to get resume info
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        const userProfile = await authService.getUserProfile(currentUser.uid);
        if (userProfile && userProfile.resumeInfo) {
          const result = await apiService.getSuggestedJobs(userProfile.resumeInfo);
          setSuggestions(result.suggestions || []);
        }
      }
    } catch (error) {
      console.error('Error loading job suggestions:', error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const searchJobs = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Error', 'Please enter a job title or keywords');
      return;
    }

    setLoading(true);
    try {
      const location = city ? `${city}, ${country}` : country;
      
      // First, search for jobs
      const searchResult = await apiService.searchJobs(searchQuery, location, numJobs);
      
      if (!searchResult.jobs || searchResult.jobs.length === 0) {
        Alert.alert('No Results', 'No jobs found. Try different keywords or location.');
        setJobs([]);
        return;
      }

      setQueryId(searchResult.query_id);

      // Store jobs data for Analysis screen
      await AsyncStorage.setItem('jobs_data', JSON.stringify(searchResult.jobs));
      await AsyncStorage.setItem('query_id', searchResult.query_id);

      // Check if resume is uploaded and get similarity scores
      if (resumeId) {
        try {
          console.log('Getting similarity scores for resume:', resumeId);
          console.log('Query ID:', searchResult.query_id);
          
          const similarJobsResult = await apiService.getSimilarJobs(
            resumeId, 
            searchResult.query_id, 
            searchResult.jobs.length
          );
          
          console.log('Similarity results:', similarJobsResult);
          
          if (similarJobsResult && similarJobsResult.similar_jobs && similarJobsResult.similar_jobs.length > 0) {
            // Merge original jobs with similarity scores
            const jobsWithScores = searchResult.jobs.map(job => {
              const similarJob = similarJobsResult.similar_jobs.find(
                simJob => simJob.title === job.title && simJob.company_name === job.company_name
              );
              return {
                ...job,
                similarity_score: similarJob?.similarity_score || 0
              };
            });

            // Sort by similarity score (highest first)
            const sortedJobs = jobsWithScores.sort((a, b) => 
              (parseFloat(String(b.similarity_score || 0)) - parseFloat(String(a.similarity_score || 0)))
            );

            setJobs(sortedJobs);
            await AsyncStorage.setItem('jobs_data', JSON.stringify(sortedJobs));
            
            // Show success message with match scores
            Alert.alert('Success', `Found ${sortedJobs.length} jobs with personalized match scores!`);
          } else {
            // Still show jobs but without similarity scores
            console.warn('No similarity data returned, showing jobs without scores');
            setJobs(searchResult.jobs);
            Alert.alert('Info', `Found ${searchResult.jobs.length} jobs. Match scores unavailable.`);
          }
          
        } catch (similarityError) {
          console.error('Error getting similarity scores:', similarityError);
          // Still show jobs without similarity scores
          setJobs(searchResult.jobs);
          Alert.alert('Info', `Found ${searchResult.jobs.length} jobs. Match scores unavailable due to server error.`);
        }
      } else {
        // No resume uploaded - show jobs without similarity scores
        setJobs(searchResult.jobs);
        Alert.alert('Info', `Found ${searchResult.jobs.length} jobs. Upload your resume to get personalized match scores!`);
      }
    } catch (error: any) {
      console.error('Search error:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Error searching jobs');
    } finally {
      setLoading(false);
    }
  };

  const getMatchColor = (score: number) => {
    if (score >= 0.8) return colors.green[600];
    if (score >= 0.6) return colors.yellow[600];
    return colors.blue[600];
  };

  const getMatchLabel = (score: number) => {
    if (score >= 0.8) return 'Excellent Match';
    if (score >= 0.6) return 'Good Match';
    return 'Potential Match';
  };

  const renderJobCard = (job: Job, index: number) => {
    const similarityScore = parseFloat(String(job.similarity_score || 0));
    const matchColor = getMatchColor(similarityScore);
    const hasScore = job.similarity_score !== undefined && job.similarity_score > 0;

    return (
      <Card key={index} style={styles.jobCard}>
        <Card.Content>
          <View style={styles.jobHeader}>
            <View style={styles.jobInfo}>
              <Text style={styles.jobTitle}>{job.title}</Text>
              <Text style={styles.jobCompany}>{job.company_name || job.company}</Text>
              <Text style={styles.jobLocation}>{job.location}</Text>
            </View>
            {hasScore && (
              <View style={styles.matchInfo}>
                <Text style={[styles.matchScore, { color: matchColor }]}>
                  {Math.round(similarityScore * 100)}%
                </Text>
                <Text style={styles.matchLabel}>Match</Text>
              </View>
            )}
          </View>
          
          <Text style={styles.jobDescription} numberOfLines={3}>
            {job.description || 'No description available'}
          </Text>
          
          <View style={styles.jobActions}>
            {hasScore ? (
              <Chip
                style={[styles.matchChip, { backgroundColor: matchColor + '20' }]}
                textStyle={[styles.matchChipText, { color: matchColor }]}
              >
                {getMatchLabel(similarityScore)}
              </Chip>
            ) : (
              <Chip
                style={[styles.matchChip, { backgroundColor: colors.gray[200] }]}
                textStyle={[styles.matchChipText, { color: colors.gray[600] }]}
              >
                {resumeId ? 'Match Score Unavailable' : 'Upload Resume for Match Score'}
              </Chip>
            )}
            
            {job.apply_link && (
              <Button
                mode="contained"
                compact
                onPress={() => Linking.openURL(job.apply_link!)}
                style={styles.applyButton}
              >
                Apply
              </Button>
            )}
          </View>
        </Card.Content>
      </Card>
    );
  };

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
      <ScrollView style={styles.content}>
        <Card style={styles.searchCard}>
          <Card.Content>
            <Text style={styles.searchTitle}>Find Relevant Jobs</Text>
            
            <TextInput
              label="Job Title / Keywords"
              value={searchQuery}
              onChangeText={setSearchQuery}
              mode="outlined"
              placeholder="e.g., Software Engineer, Data Scientist"
              style={styles.input}
            />
            
            <View style={styles.locationContainer}>
              <View style={styles.pickerContainer}>
                <Text style={styles.pickerLabel}>Country</Text>
                <Picker
                  selectedValue={country}
                  onValueChange={setCountry}
                  style={styles.picker}
                >
                  <Picker.Item label="Pakistan" value="Pakistan" />
                  <Picker.Item label="India" value="India" />
                  <Picker.Item label="USA" value="USA" />
                </Picker>
              </View>
              
              <View style={styles.pickerContainer}>
                <Text style={styles.pickerLabel}>City (Optional)</Text>
                <Picker
                  selectedValue={city}
                  onValueChange={setCity}
                  style={styles.picker}
                >
                  <Picker.Item label="Any City" value="" />
                  {cities.map((cityName) => (
                    <Picker.Item key={cityName} label={cityName} value={cityName} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.searchOptions}>
              <Menu
                visible={menuVisible}
                onDismiss={() => setMenuVisible(false)}
                anchor={
                  <Button
                    mode="outlined"
                    onPress={() => setMenuVisible(true)}
                    style={styles.numJobsButton}
                  >
                    {numJobs} Jobs
                  </Button>
                }
              >
                <Menu.Item onPress={() => { setNumJobs(10); setMenuVisible(false); }} title="10 Jobs" />
                <Menu.Item onPress={() => { setNumJobs(20); setMenuVisible(false); }} title="20 Jobs" />
                <Menu.Item onPress={() => { setNumJobs(30); setMenuVisible(false); }} title="30 Jobs" />
                <Menu.Item onPress={() => { setNumJobs(50); setMenuVisible(false); }} title="50 Jobs" />
              </Menu>
              
              <Button
                mode="contained"
                onPress={searchJobs}
                loading={loading}
                disabled={loading}
                style={styles.searchButton}
              >
                Search Jobs
              </Button>
            </View>

            {/* Resume Status Indicator */}
            <View style={[styles.statusContainer, resumeId ? styles.statusSuccess : styles.statusWarning]}>
              <MaterialIcons 
                name={resumeId ? "check-circle" : "warning"} 
                size={16} 
                color={resumeId ? colors.green[600] : colors.yellow[600]} 
              />
              <Text style={[styles.statusText, { color: resumeId ? colors.green[800] : colors.yellow[800] }]}>
                {resumeId ? 'Resume uploaded - you\'ll get match scores!' : 'Upload resume to get personalized match scores'}
              </Text>
            </View>
          </Card.Content>
        </Card>

        {suggestions.length > 0 && (
          <Card style={styles.suggestionsCard}>
            <Card.Content>
              <View style={styles.suggestionsHeader}>
                <MaterialIcons name="lightbulb" size={20} color={colors.blue[600]} />
                <Text style={styles.suggestionsTitle}>AI Job Suggestions</Text>
                {loadingSuggestions && <ActivityIndicator size="small" color={colors.blue[600]} />}
              </View>
              <Text style={styles.suggestionsSubtitle}>Based on your resume and skills</Text>
              <View style={styles.suggestionsContainer}>
                {suggestions.map((suggestion, index) => (
                  <Chip
                    key={index}
                    style={styles.suggestionChip}
                    onPress={() => setSearchQuery(suggestion)}
                  >
                    {suggestion}
                  </Chip>
                ))}
              </View>
            </Card.Content>
          </Card>
        )}

        {loading && (
          <Card style={styles.loadingCard}>
            <Card.Content style={styles.loadingContent}>
              <ActivityIndicator size="large" color={colors.primary[600]} />
              <Text style={styles.loadingText}>
                {resumeId 
                  ? 'Searching for jobs and calculating match scores...' 
                  : 'Searching for jobs...'}
              </Text>
            </Card.Content>
          </Card>
        )}

        {jobs.length > 0 && (
          <View style={styles.resultsContainer}>
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>Found {jobs.length} Jobs</Text>
              {resumeId && jobs.some(job => job.similarity_score && job.similarity_score > 0) && (
                <Text style={styles.resultsSubtitle}>Sorted by relevance to your profile</Text>
              )}
            </View>
            {jobs.map(renderJobCard)}
          </View>
        )}
      </ScrollView>
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
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  searchCard: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
  },
  searchTitle: {
    ...typography.h3,
    marginBottom: spacing.md,
    color: colors.gray[900],
  },
  input: {
    marginBottom: spacing.md,
    backgroundColor: '#ffffff',
  },
  locationContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  pickerContainer: {
    flex: 1,
  },
  pickerLabel: {
    ...typography.bodySmall,
    color: colors.gray[700],
    marginBottom: spacing.xs,
  },
  picker: {
    backgroundColor: '#ffffff',
    borderRadius: borderRadius.md,
  },
  searchOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  numJobsButton: {
    borderColor: colors.gray[300],
  },
  searchButton: {
    backgroundColor: colors.primary[600],
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  statusSuccess: {
    backgroundColor: colors.green[50],
  },
  statusWarning: {
    backgroundColor: colors.yellow[50],
  },
  statusText: {
    ...typography.bodySmall,
    marginLeft: spacing.sm,
    flex: 1,
  },
  suggestionsCard: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.blue[50],
  },
  suggestionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  suggestionsTitle: {
    ...typography.h4,
    color: colors.blue[900],
    marginLeft: spacing.sm,
    flex: 1,
  },
  suggestionsSubtitle: {
    ...typography.bodySmall,
    color: colors.blue[700],
    marginBottom: spacing.md,
  },
  suggestionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  suggestionChip: {
    backgroundColor: colors.blue[200],
  },
  loadingCard: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
  },
  loadingContent: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  resultsContainer: {
    marginTop: spacing.md,
  },
  resultsHeader: {
    marginBottom: spacing.md,
  },
  resultsTitle: {
    ...typography.h3,
    color: colors.gray[900],
  },
  resultsSubtitle: {
    ...typography.bodySmall,
    color: colors.gray[600],
    marginTop: spacing.xs,
  },
  jobCard: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  jobInfo: {
    flex: 1,
  },
  jobTitle: {
    ...typography.h4,
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
  },
  matchInfo: {
    alignItems: 'center',
  },
  matchScore: {
    ...typography.h3,
    fontWeight: 'bold',
  },
  matchLabel: {
    ...typography.caption,
    color: colors.gray[600],
  },
  jobDescription: {
    ...typography.bodySmall,
    color: colors.gray[700],
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  jobActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  matchChip: {
    alignSelf: 'flex-start',
  },
  matchChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  applyButton: {
    backgroundColor: colors.primary[600],
  },
});