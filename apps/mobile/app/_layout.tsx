import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '../src/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.background },
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: '800' },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="tournaments/index" options={{ title: 'Find tournaments' }} />
        <Stack.Screen name="tournaments/[id]" options={{ title: 'Tournament' }} />
        <Stack.Screen name="create-tournament" options={{ title: 'Create tournament' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
