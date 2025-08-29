import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  TextInput,
  Button,
  Card,
  ActivityIndicator,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../config/theme';
import { authService } from '../services/authService';

export default function AuthScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
  });

  const handleSubmit = async () => {
    if (!formData.email || !formData.password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (formData.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      let result;
      if (isSignUp) {
        result = await authService.signUp(
          formData.email,
          formData.password,
          formData.displayName
        );
      } else {
        result = await authService.signIn(formData.email, formData.password);
      }

      if (result.success) {
        Alert.alert('Success', result.message);
        // Clear form
        setFormData({ email: '', password: '', displayName: '' });
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setIsSignUp(!isSignUp);
    setFormData({ email: '', password: '', displayName: '' });
  };

  return (
    <LinearGradient
      colors={[colors.primary[400], colors.primary[700]]}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <MaterialIcons name="work" size={32} color="#ffffff" />
            </View>
            <Text style={styles.title}>AI Job Recommender</Text>
            <Text style={styles.subtitle}>
              Get personalized job recommendations powered by AI
            </Text>
          </View>

          <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <Text style={styles.formTitle}>
                {isSignUp ? 'Create Account' : 'Welcome Back'}
              </Text>
              
              <View style={styles.form}>
                <TextInput
                  label="Email"
                  value={formData.email}
                  onChangeText={(email) => setFormData({ ...formData, email })}
                  mode="outlined"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={styles.input}
                  disabled={loading}
                />

                {isSignUp && (
                  <TextInput
                    label="Full Name (Optional)"
                    value={formData.displayName}
                    onChangeText={(displayName) =>
                      setFormData({ ...formData, displayName })
                    }
                    mode="outlined"
                    style={styles.input}
                    disabled={loading}
                  />
                )}

                <TextInput
                  label="Password"
                  value={formData.password}
                  onChangeText={(password) =>
                    setFormData({ ...formData, password })
                  }
                  mode="outlined"
                  secureTextEntry
                  style={styles.input}
                  disabled={loading}
                />

                <Button
                  mode="contained"
                  onPress={handleSubmit}
                  style={styles.submitButton}
                  disabled={loading}
                  contentStyle={styles.buttonContent}
                >
                  {loading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    isSignUp ? 'Create Account' : 'Sign In'
                  )}
                </Button>

                <Button
                  mode="text"
                  onPress={toggleAuthMode}
                  disabled={loading}
                  style={styles.toggleButton}
                >
                  {isSignUp
                    ? 'Already have an account? Sign In'
                    : "Don't have an account? Sign Up"}
                </Button>
              </View>
            </Card.Content>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  iconContainer: {
    width: 64,
    height: 64,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: borderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h2,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: '#ffffff',
    opacity: 0.9,
    textAlign: 'center',
    lineHeight: 22,
  },
  card: {
    borderRadius: borderRadius.lg,
    elevation: 8,
  },
  cardContent: {
    padding: spacing.xl,
  },
  formTitle: {
    ...typography.h3,
    textAlign: 'center',
    marginBottom: spacing.xl,
    color: colors.gray[900],
  },
  form: {
    gap: spacing.md,
  },
  input: {
    backgroundColor: '#ffffff',
  },
  submitButton: {
    marginTop: spacing.md,
    backgroundColor: colors.primary[600],
  },
  buttonContent: {
    paddingVertical: spacing.sm,
  },
  toggleButton: {
    marginTop: spacing.sm,
  },
});