import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { SignupStep1Screen } from '../screens/auth/SignupStep1Screen';
import { SignupStep2Screen } from '../screens/auth/SignupStep2Screen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { AcceptInviteScreen } from '../screens/auth/AcceptInviteScreen';

export type AuthStackParamList = {
  Login: undefined;
  SignupStep1: undefined;
  SignupStep2: { userId: string; accessToken: string };
  ForgotPassword: undefined;
  // token vem de um deep link (quando configurado) ou é colado manualmente na tela
  AcceptInvite: { token?: string } | undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerTintColor: '#6D28D9' }}>
      <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Entrar' }} />
      <Stack.Screen name="SignupStep1" component={SignupStep1Screen} options={{ title: 'Criar conta' }} />
      <Stack.Screen name="SignupStep2" component={SignupStep2Screen} options={{ title: 'Criar empresa' }} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: 'Recuperar senha' }} />
      <Stack.Screen name="AcceptInvite" component={AcceptInviteScreen} options={{ title: 'Convite' }} />
    </Stack.Navigator>
  );
}
