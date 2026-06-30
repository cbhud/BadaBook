/**
 * BadaBook — Mobile book reader with live translation.
 *
 * Root component that manages screen navigation and wraps
 * everything in the AppProvider for global state.
 */

import React, { useEffect, useState } from 'react';
import { BackHandler } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppProvider } from './context/AppContext';
import { BookMeta } from './types/book';
import HomeScreen from './screens/HomeScreen';
import ReaderScreen from './screens/ReaderScreen';
import SettingsScreen from './screens/SettingsScreen';

type Screen =
  | { name: 'home' }
  | { name: 'reader'; book: BookMeta }
  | { name: 'settings' };

function AppContent() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' });

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen.name === 'home') {
        return false;
      }

      setScreen({ name: 'home' });
      return true;
    });

    return () => subscription.remove();
  }, [screen.name]);

  switch (screen.name) {
    case 'home':
      return (
        <HomeScreen
          onOpenBook={(book) => setScreen({ name: 'reader', book })}
          onOpenSettings={() => setScreen({ name: 'settings' })}
        />
      );
    case 'reader':
      return (
        <ReaderScreen
          book={screen.book}
          onBack={() => setScreen({ name: 'home' })}
        />
      );
    case 'settings':
      return (
        <SettingsScreen
          onBack={() => setScreen({ name: 'home' })}
        />
      );
    default:
      return null;
  }
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProvider>
          <StatusBar style="light" />
          <AppContent />
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
