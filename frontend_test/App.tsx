import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider as PaperProvider } from 'react-native-paper';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';

// Import screens
import AuthScreen from './src/screens/AuthScreen';
import ProfileSetupScreen from './src/screens/ProfileSetupScreen';
import MainTabNavigator from './src/navigation/MainTabNavigator';
import LoadingScreen from './src/screens/LoadingScreen';

// Import services
import { authService } from './src/services/authService';
import { theme } from './src/config/theme';

// Types
import { User } from 'firebase/auth';

const Stack = createStackNavigator();

// Keep splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [isLoadingComplete, setLoadingComplete] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileCompleted, setProfileCompleted] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Pre-load fonts, make any API calls you need to do here
        await Font.loadAsync({
          'Inter-Regular': require('./assets/fonts/Inter-Regular.ttf'),
          'Inter-Medium': require('./assets/fonts/Inter-Medium.ttf'),
          'Inter-SemiBold': require('./assets/fonts/Inter-SemiBold.ttf'),
          'Inter-Bold': require('./assets/fonts/Inter-Bold.ttf'),
        });
      } catch (e) {
        console.warn(e);
      } finally {
        // Tell the application to render
        setLoadingComplete(true);
      }
    }

    prepare();
  }, []);

  useEffect(() => {
    // Listen to authentication state changes with improved logic
    const unsubscribe = authService.onAuthStateChange(async (user) => {
      console.log('Auth state changed:', user ? `User logged in: ${user.uid}` : 'User logged out');
      setUser(user);
      
      if (user) {
        setProfileLoading(true);
        try {
          // Add delay to ensure Firestore sync
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Check if profile is completed
          const hasCompleted = await authService.hasCompletedProfile();
          console.log('Profile completed check result:', hasCompleted);
          
          setProfileCompleted(hasCompleted);
        } catch (error) {
          console.error('Error checking profile completion:', error);
          setProfileCompleted(false);
        } finally {
          setProfileLoading(false);
        }
      } else {
        // User signed out - reset all states
        setProfileCompleted(false);
        setProfileLoading(false);
      }
      
      setAuthLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    // Hide splash screen when everything is loaded
    if (isLoadingComplete && !authLoading && !profileLoading) {
      console.log('Hiding splash screen');
      SplashScreen.hideAsync();
    }
  }, [isLoadingComplete, authLoading, profileLoading]);

  const handleProfileSetupComplete = () => {
    console.log('Profile setup completed');
    setProfileCompleted(true);
  };

  // Show loading screen while initializing
  if (!isLoadingComplete || authLoading) {
    return <LoadingScreen />;
  }

  // Show profile loading only when checking profile completion
  if (profileLoading) {
    return <LoadingScreen />;
  }

  console.log('Render decision - User:', !!user, 'Profile completed:', profileCompleted);

  return (
    <PaperProvider theme={theme}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!user ? (
            // User not authenticated - show auth screen
            <Stack.Screen name="Auth" component={AuthScreen} />
          ) : !profileCompleted ? (
            // User authenticated but profile not complete - show profile setup
            <Stack.Screen name="ProfileSetup">
              {() => <ProfileSetupScreen onComplete={handleProfileSetupComplete} />}
            </Stack.Screen>
          ) : (
            // User authenticated and profile complete - show main app
            <Stack.Screen name="Main" component={MainTabNavigator} />
          )}
        </Stack.Navigator>
        <StatusBar style="auto" />
      </NavigationContainer>
    </PaperProvider>
  );
}