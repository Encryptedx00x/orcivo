import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import { SubscriptionProvider } from './src/contexts/SubscriptionContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { EasyModeProvider } from './src/easy/EasyModeContext';
import { SheetProvider } from './src/easy/sheet';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SubscriptionProvider>
          <EasyModeProvider>
            {/* "Mais ações" sheet, shared by the full and the easy mode. */}
            <SheetProvider>
              <RootNavigator />
            </SheetProvider>
          </EasyModeProvider>
        </SubscriptionProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
