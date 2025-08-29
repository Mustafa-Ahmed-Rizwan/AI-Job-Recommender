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
import { colors, typography, spacing, borderRadius } from '../config/theme';
import { apiService } from '../services/apiService';
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

  useEffect(() => {
    loadCities();
  }, [country]);

  const loadCities = async () => {
    try {
      const result = await apiService.getCities(country);
      setCities(result.cities);
    } catch (error) {
      console.error('Error loading cities:', error);
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
      const searchResult = await apiService.searchJobs(searchQuery, location, numJobs);
      
      if (!searchResult.jobs || searchResult.jobs.length === 0) {
        Alert.alert('No Results', 'No jobs found. Try different keywords or location.');
        return;
      }

      // Sort by similarity score
      const sortedJobs = searchResult.jobs.sort((a, b) => 
        (parseFloat(String(b.similarity_score || 0)) - parseFloat(String(a.similarity_score || 0)))
      );

      setJobs(sortedJobs);
    } catch (error: any) {
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

    return (
      <Card key={index} style={styles.jobCard}>
        <Card.Content>
          <View style={styles.jobHeader}>
            <View style={styles.jobInfo}>
              <Text style={styles.jobTitle}>{job.title}</Text>
              <Text style={styles.jobCompany}>{job.company_name || job.company}</Text>
              <Text style={styles.jobLocation}>{job.location}</Text>
            </View>
            <View style={styles.matchInfo}>
              <Text style={[styles.matchScore, { color: matchColor }]}>
                {Math.round(similarityScore * 100)}%
              </Text>
              <Text style={styles.matchLabel}>Match</Text>
            </View>
          </View>
          
          <Text style={styles.jobDescription} numberOfLines={3}>
            {job.description || 'No description available'}
          </Text>
          
          <View style={styles.jobActions}>
            <Chip
              style={[styles.matchChip, { backgroundColor: matchColor + '20' }]}
              textStyle={[styles.matchChipText, { color: matchColor }]}
            >
              {getMatchLabel(similarityScore)}
            </Chip>
            
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
          </Card.Content>
        </Card>

        {suggestions.length > 0 && (
          <Card style={styles.suggestionsCard}>
            <Card.Content>
              <Text style={styles.suggestionsTitle}>AI Job Suggestions</Text>
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
              <Text style={styles.loadingText}>Searching for jobs...</Text>
            </Card.Content>
          </Card>
        )}

        {jobs.length > 0 && (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsTitle}>Found {jobs.length} Jobs</Text>
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
  },
  numJobsButton: {
    borderColor: colors.gray[300],
  },
  searchButton: {
    backgroundColor: colors.primary[600],
  },
  suggestionsCard: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.blue[50],
  },
  suggestionsTitle: {
    ...typography.h4,
    color: colors.blue[900],
    marginBottom: spacing.xs,
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
  loadingText: {
    ...typography.body,
    marginTop: spacing.md,
    color: colors.gray[700],
  },
  resultsContainer: {
    marginTop: spacing.md,
  },
  resultsTitle: {
    ...typography.h3,
    marginBottom: spacing.md,
    color: colors.gray[900],
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