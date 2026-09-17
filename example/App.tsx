import React, { useEffect, useState } from 'react';
import { SafeAreaView, Text, StyleSheet, View } from 'react-native';
import {
  DocumentScannerNative,
  RNDocumentScannerVersion,
} from 'rn-document-scanner';

function App(): React.JSX.Element {
  const [nativeVersion, setNativeVersion] = useState<string>('Loading...');
  const [pingResult, setPingResult] = useState<string>('Loading...');

  useEffect(() => {
    try {
      if (DocumentScannerNative) {
        // Gọi hàm getNativeVersion từ Native Swift/Kotlin
        const version = DocumentScannerNative.getNativeVersion();
        setNativeVersion(version);

        // Gọi hàm ping từ Native Swift/Kotlin
        const response = DocumentScannerNative.ping('Hello Nitro Module!');
        setPingResult(response);
      } else {
        setNativeVersion('Error: DocumentScannerNative is null');
      }
    } catch (error) {
      console.error('Failed to call Nitro Native Module:', error);
      setNativeVersion(`Error: ${String(error)}`);
    }
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>RN Document Scanner</Text>
        <Text style={styles.text}>
          Library JS Version: {RNDocumentScannerVersion}
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Native Module Status:</Text>
          <Text style={styles.cardText}>Engine: {nativeVersion}</Text>
          <Text style={styles.cardText}>Ping: {pingResult}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5FCFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#000000',
  },
  text: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 8,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333333',
  },
  cardText: {
    fontSize: 14,
    color: '#444444',
    marginTop: 4,
  },
});

export default App;
