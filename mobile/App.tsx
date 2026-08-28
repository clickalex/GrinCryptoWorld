/**
 * GrinCryptoWorld Mobile — React Native (Expo) placeholder.
 *
 * Setup (when development begins):
 *   npm install
 *   npx expo start
 *
 * The app consumes the same REST API as the web frontend:
 *   API_BASE = https://your-deployment/api
 */
import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

const API_BASE = 'https://grincrypto.world/api';

const COINS = [
  { symbol: 'BTC', name: 'Bitcoin', price: 96420 },
  { symbol: 'ETH', name: 'Ethereum', price: 3320 },
  { symbol: 'SOL', name: 'Solana', price: 191 },
];

export default function App() {
  return (
    <SafeAreaView style={styles.screen}>
      <Text style={styles.h1}>GrinCryptoWorld</Text>
      <Text style={styles.sub}>Watchlist (placeholder screen)</Text>
      <ScrollView>
        {COINS.map((c) => (
          <View key={c.symbol} style={styles.row}>
            <Text style={styles.symbol}>{c.symbol}</Text>
            <Text style={styles.name}>{c.name}</Text>
            <Text style={styles.price}>${c.price.toLocaleString()}</Text>
          </View>
        ))}
      </ScrollView>
      <Text style={styles.footer}>Fetches {API_BASE}/coins in the real build</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0b1015', paddingTop: 40, paddingHorizontal: 16 },
  h1: { color: '#10b981', fontSize: 28, fontWeight: '900' },
  sub: { color: '#94a3b8', marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#111820', borderRadius: 12, padding: 14, marginBottom: 8 },
  symbol: { color: '#fff', fontWeight: '800', width: 48 },
  name: { color: '#94a3b8', flex: 1 },
  price: { color: '#10b981', fontWeight: '700' },
  footer: { color: '#475569', fontSize: 11, marginTop: 12 },
});
