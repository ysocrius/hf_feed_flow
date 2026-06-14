import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState, useRef } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

import { useRouter, useSegments } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';


// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [routeChecked, setRouteChecked] = useState(false);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded && routeChecked) {
      SplashScreen.hideAsync();
    }
  }, [loaded, routeChecked]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav onRouteChecked={() => setRouteChecked(true)} />;
}

function RootLayoutNav({ onRouteChecked }: { onRouteChecked: () => void }) {
  const colorScheme = useColorScheme();
  const segments = useSegments();
  const router = useRouter();
  const [routeChecked, setRouteChecked] = useState(false);
  const firstCheckDone = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const checkRoute = async () => {
      const flag = await AsyncStorage.getItem('onboarding_complete');
      const { data: { session } } = await supabase.auth.getSession();

      if (cancelled) return;

      const isOnboardingComplete = flag === 'true' && session;
      
      if (isOnboardingComplete && segments[0] === '(onboarding)') {
        router.replace('/(tabs)');
      } else if (!isOnboardingComplete && segments[0] !== '(onboarding)') {
        router.replace('/(onboarding)/welcome');
      }

      if (!firstCheckDone.current) {
        firstCheckDone.current = true;
        setRouteChecked(true);
        onRouteChecked();
      }
    };
    checkRoute();

    return () => {
      cancelled = true;
    };
  }, [segments]);

  if (!routeChecked) return null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
