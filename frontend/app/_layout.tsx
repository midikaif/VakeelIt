import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { AuthProvider } from "@/contexts/AuthContext";

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

export default function RootLayout() {
  // Wake up the Render backend container when the app loads (prevents cold start delays)
  useEffect(() => {
    

    fetch(`${API_URL}/api/health`)
      .then(() => console.log('Backend wake-up ping successful'))
      .catch((err) => console.log('Backend wake-up ping initiated...'));
  }, []);

  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="(auth)/register" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="case-detail" options={{ presentation: 'card' }} />
      </Stack>
    </AuthProvider>
  );
}