import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { getStateFromPath, NavigationContainer } from '@react-navigation/native';
import { enableScreens } from 'react-native-screens';
import { useAuth } from '../contexts/AuthContext';
import { AuthStack } from './AuthStack';
import { AppTabs } from './AppTabs';
import { SubscriptionBanner } from '../components/SubscriptionBanner';
import { useEasyMode } from '../easy/EasyModeContext';
import { EasyNavigator } from '../easy/EasyNavigator';

const prefixes = ['orcivo://', 'https://app.orcivo.com.br'];

function getInviteToken(path: string) {
  const match = path.match(/^\/?convite\/([^/?#]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

enableScreens();

export function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  const { easy, ready } = useEasyMode();
  if (isLoading || !ready)
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#6D28D9" size="large" />
      </View>
    );
  const linking = isAuthenticated
    ? {
        prefixes,
        getStateFromPath: (path: string, options: Parameters<typeof getStateFromPath>[1]) => {
          const token = getInviteToken(path);
          if (token) {
            return easy
              ? { routes: [{ name: 'Empresas', params: { token } }] }
              : {
                  routes: [
                    {
                      name: 'Mais',
                      state: { routes: [{ name: 'Empresas', params: { token } }] },
                    },
                  ],
                };
          }
          return getStateFromPath(path, options);
        },
        config: easy
          ? { screens: { Empresas: 'empresas' } }
          : { screens: { Mais: { screens: { Empresas: 'empresas' } } } },
      }
    : { prefixes, config: { screens: { AcceptInvite: 'convite/:token' } } };
  return (
    <NavigationContainer linking={linking as never}>
      {isAuthenticated ? (
        <View style={{ flex: 1 }}>
          <SubscriptionBanner />
          {easy ? <EasyNavigator /> : <AppTabs />}
        </View>
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
}
