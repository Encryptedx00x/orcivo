import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { enableScreens } from 'react-native-screens';
import { useAuth } from '../contexts/AuthContext';
import { AuthStack } from './AuthStack';
import { AppTabs } from './AppTabs';
import { SubscriptionBanner } from '../components/SubscriptionBanner';

enableScreens();

export function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator color="#6D28D9" size="large" /></View>;
  return (
    <NavigationContainer>
      {isAuthenticated ? (
        <View style={{ flex: 1 }}>
          <SubscriptionBanner />
          <AppTabs />
        </View>
      ) : <AuthStack />}
    </NavigationContainer>
  );
}
