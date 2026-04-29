import { type InsuranceRequestView } from '@carloi-v4/types';
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MobileShell } from '../components/mobile-shell';
import { useAuth } from '../context/auth-context';
import { mobileInsuranceApi } from '../lib/insurance-api';

export default function InsuranceScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [items, setItems] = useState<InsuranceRequestView[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    void mobileInsuranceApi
      .getRequests(session.accessToken)
      .then((response) => setItems(response.items))
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : 'Sigorta talepleri yuklenemedi.');
      });
  }, [session?.accessToken]);

  if (!session) {
    return <Redirect href="/login" />;
  }

  return (
    <MobileShell title="Sigorta" subtitle="Teklif, odeme ve belge akisini yonet.">
      <ScrollView contentContainerStyle={styles.content}>
        {errorMessage ? (
          <View style={[styles.card, styles.errorCard]}>
            <Text style={styles.cardText}>{errorMessage}</Text>
          </View>
        ) : null}

        {items.map((item) => (
          <Pressable
            key={item.id}
            style={styles.card}
            onPress={() => router.push(`/insurance/${item.id}`)}
          >
            <Text style={styles.kicker}>{item.status}</Text>
            <Text style={styles.title}>{item.listing.title}</Text>
            <Text style={styles.meta}>
              {item.vehicle.brand ?? '-'} {item.vehicle.model ?? '-'} · {item.listing.listingNo}
            </Text>
            <Text style={styles.price}>
              {item.currentOffer
                ? `${item.currentOffer.amount.toLocaleString('tr-TR')} ${item.currentOffer.currency}`
                : 'Teklif bekleniyor'}
            </Text>
          </Pressable>
        ))}
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
    fontSize: 18,
    fontWeight: '800',
  },
  meta: {
    color: '#9eb0be',
  },
  price: {
    color: '#f8f2ea',
    fontWeight: '800',
  },
  cardText: {
    color: '#f8f2ea',
  },
});
