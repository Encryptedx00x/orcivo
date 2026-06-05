import React from 'react';
import { AuthProvider } from './src/contexts/AuthContext';
import { SubscriptionProvider } from './src/contexts/SubscriptionContext';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  return (
    <AuthProvider>
      <SubscriptionProvider>
        <RootNavigator />
      </SubscriptionProvider>
    </AuthProvider>
  );
}
