import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../config/theme';

// Import screens
// import UploadScreen from '../screens/UploadScreen';
import SearchScreen from '../screens/SearchScreen';
import AnalysisScreen from '../screens/AnalysisScreen';
import ReportScreen from '../screens/ReportScreen';
import ProfileScreen from '../screens/ProfileScreen';

import { MainTabParamList } from '../types';

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof MaterialIcons.glyphMap;

          switch (route.name) {
            case 'Upload':
              iconName = 'upload-file';
              break;
            case 'Search':
              iconName = 'search';
              break;
            case 'Analysis':
              iconName = 'analytics';
              break;
            case 'Report':
              iconName = 'assessment';
              break;
            case 'Profile':
              iconName = 'person';
              break;
            default:
              iconName = 'help';
          }

          return <MaterialIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary[600],
        tabBarInactiveTintColor: colors.gray[400],
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: colors.gray[200],
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: 'Inter-Medium',
        },
        headerStyle: {
          backgroundColor: colors.primary[600],
        },
        headerTitleStyle: {
          color: '#ffffff',
          fontFamily: 'Inter-SemiBold',
        },
        headerTintColor: '#ffffff',
      })}
    >
      <Tab.Screen 
        name="Search" 
        component={SearchScreen} 
        options={{ title: 'Find Jobs' }}
      />
      <Tab.Screen 
        name="Analysis" 
        component={AnalysisScreen} 
        options={{ title: 'Analysis' }}
      />
      <Tab.Screen 
        name="Report" 
        component={ReportScreen} 
        options={{ title: 'Report' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
}