import type { PaymentResultResponse } from '@carloi-v4/types';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { MobileShell } from '../components/mobile-shell';
import { useAuth } from '../context/auth-context';
import { mobilePaymentsApi } from '../lib/payments-api';

export default function PaymentResultScreen() {
  const { paymentId } = useLocalSearchParams<{ paymentId: string }>();
  const { session } = useAuth();
  const [result, setResult] = useState<PaymentResultResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!paymentId) {
      return;
    }

    void mobilePaymentsApi
      .getPaymentResult(paymentId)
      .then((response) => setResult(response))
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : 'Odeme sonucu yuklenemedi.');
      });
  }, [paymentId]);

  if (!session) {
    return <Redirect href="/login" />;
  }

  return (
    <MobileShell title="Odeme sonucu" subtitle="Sigorta odemesinin son durumunu gor.">
      <ScrollView contentContainerStyle={styles.content}>
        {errorMessage ? (
          <View style={[styles.card, styles.errorCard]}>
            <Text style={styles.text}>{errorMessage}</Text>
          </View>
        ) : null}
        {!result ? (
          <View style={styles.card}>
            <Text style={styles.text}>Odeme sonucu yukleniyor...</Text>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.kicker}>{result.status}</Text>
            <Text style={styles.title}>
              {result.amount.toLocaleString('tr-TR')} {result.currency}
            </Text>
            {result.failureReason ? <Text style={styles.meta}>{result.failureReason}</Text> : null}
            {result.documents.map((document) => (
              <Text key={document.id} style={styles.meta}>
                {document.documentType}: {document.fileUrl}
              </Text>
            ))}
          </View>
        )}
      </ScrollView>
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 12,
    paddingBottom: 18,
  },
  card: {
    gap: 8,
    padding: 18,
    borderRadius: 24,
    backgroundColor: '#0d1d2a',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  errorCard: {
    backgroundColor: 'rgba(216,82,82,0.18)',
  },
  kicker: {
    color: '#ffd6c2',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  title: {
    color: '#f8f2ea',
    fontSize: 20,
    fontWeight: '800',
  },
  meta: {
    color: '#9eb0be',
  },
  text: {
    color: '#f8f2ea',
  },
});
