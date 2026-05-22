import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { SignupStep1Screen } from '../screens/auth/SignupStep1Screen';
import { SignupStep2Screen } from '../screens/auth/SignupStep2Screen';

const Stack = createNativeStackNavigator();

export function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerTintColor: '#6D28D9' }}>
      <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Entrar' }} />
      <Stack.Screen name="SignupStep1" component={SignupStep1Screen} options={{ title: 'Criar conta' }} />
      <Stack.Screen name="SignupStep2" component={SignupStep2Screen} options={{ title: 'Criar empresa' }} />
    </Stack.Navigator>
  );
}
