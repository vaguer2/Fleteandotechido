import { Stack } from 'expo-router';
import { EstadoGlobalProvider } from '../components/Context/EstadoGlobalUser';

export default function RootLayout() {
  return (
    <EstadoGlobalProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </EstadoGlobalProvider>
  );
}