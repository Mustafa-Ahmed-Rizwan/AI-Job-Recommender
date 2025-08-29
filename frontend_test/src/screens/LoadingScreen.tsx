import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing } from '../config/theme';

export default function LoadingScreen() {
  return (
    <LinearGradient
      colors={[colors.primary[500], colors.primary[700]]}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>AI Job Recommender</Text>
        <ActivityIndicator 
          size="large" 
          color="#ffffff" 
          style={styles.loader}
        />
        <Text style={styles.subtitle}>Loading your experience...</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  title: {
    ...typography.h1,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  subtitle: {
    ...typography.body,
    color: '#ffffff',
    opacity: 0.8,
    textAlign: 'center',
  },
  loader: {
    marginVertical: spacing.xl,
  },
});