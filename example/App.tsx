import React, { useState } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { HomeScreen } from './src/screens/HomeScreen';
import { CccdScannerScreen } from './src/screens/CccdScannerScreen';
import { PassportScannerScreen } from './src/screens/PassportScannerScreen';
import { CustomScannerScreen } from './src/screens/CustomScannerScreen';

type ScreenType = 'home' | 'cccd' | 'passport' | 'custom';

export default function App(): React.JSX.Element {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('home');

  const renderScreen = () => {
    switch (currentScreen) {
      case 'cccd':
        return <CccdScannerScreen onBack={() => setCurrentScreen('home')} />;
      case 'passport':
        return <PassportScannerScreen onBack={() => setCurrentScreen('home')} />;
      case 'custom':
        return <CustomScannerScreen onBack={() => setCurrentScreen('home')} />;
      case 'home':
      default:
        return <HomeScreen onNavigate={setCurrentScreen} />;
    }
  };

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        {renderScreen()}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0c',
  },
});
