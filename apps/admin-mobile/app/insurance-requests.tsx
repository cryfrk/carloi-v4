import { type InsuranceRequestView } from '@carloi-v4/types';
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAdminAuth } from '../context/admin-auth-context';
import { adminMobileApi } from '../lib/admin-api';
import { adminMobileTheme } from '../lib/design-system';

export default function Screen() {
  const router = useRouter();
  const { session } = useAdminAuth();
  const [items, setItems] = useState<InsuranceRequestView[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    if (session.admin.role !== 'INSURANCE_ADMIN' && session.admin.role !== 'SUPER_ADMIN') {
      return;
    }

    void adminMobileApi
      .getInsuranceRequests(session.accessToken)
      .then((response) => setItems(response.items))
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : 'Talepler yuklenemedi.');
      });
  }, [session?.accessToken, session?.admin.role]);

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (session.admin.role !== 'INSURANCE_ADMIN' && session.admin.role !== 'SUPER_ADMIN') {
    return <Redirect href="/dashboard" />;
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.kicker}>Insurance Ops</Text>
        <Text style={styles.title}>Sigorta talepleri</Text>
        <Text style={styles.copy}>Teklif ver, odemeyi kontrol et, belge yukle.</Text>
      </View>
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      {items.map((item) => (
        <Pressable key={item.id} style={styles.card} onPress={() => router.push(`/insurance-request/${item.id}`)}>
          <Text style={styles.cardStatus}>{item.status}</Text>
          <Text style={styles.cardTitle}>{item.listing.title}</Text>
          <Text style={styles.copy}>{item.listing.listingNo}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 12,
    padding: 18,
  },
  header: {
    gap: 6,
    marginBottom: 6,
  },
  kicker: {
    color: adminMobileTheme.colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  title: {
    color: adminMobileTheme.colors.textStrong,
    fontSize: 24,
    fontWeight: '700',
  },
  copy: {
    color: adminMobileTheme.colors.textMuted,
  },
  error: {
    color: adminMobileTheme.colors.danger,
  },
  card: {
    gap: 6,
    padding: 18,
    borderRadius: adminMobileTheme.radius.xl,
    backgroundColor: adminMobileTheme.colors.surface,
    borderWidth: 1,
    borderColor: adminMobileTheme.colors.border,
    ...adminMobileTheme.shadow,
  },
  cardStatus: {
    color: adminMobileTheme.colors.textMuted,
    fontWeight: '700',
  },
  cardTitle: {
    color: adminMobileTheme.colors.textStrong,
    fontSize: 18,
    fontWeight: '700',
  },
});
