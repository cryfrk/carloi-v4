import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { CommercialApplicationView } from '@carloi-v4/types';
import { useAdminAuth } from '../context/admin-auth-context';
import { adminMobileApi } from '../lib/admin-api';

export default function CommercialApplicationsScreen() {
  const router = useRouter();
  const { session } = useAdminAuth();
  const [items, setItems] = useState<CommercialApplicationView[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    if (session.admin.role !== 'COMMERCIAL_ADMIN' && session.admin.role !== 'SUPER_ADMIN') {
      return;
    }

    void adminMobileApi
      .getCommercialApplications(session.accessToken)
      .then((response) => setItems(response.items))
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : 'Basvurular yuklenemedi.');
      });
  }, [session?.accessToken, session?.admin.role]);

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (session.admin.role !== 'COMMERCIAL_ADMIN' && session.admin.role !== 'SUPER_ADMIN') {
    return <Redirect href="/dashboard" />;
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.kicker}>Commercial Ops</Text>
        <Text style={styles.title}>Ticari basvurular</Text>
        <Text style={styles.copy}>Firma basvurularini incele, onayla veya reddet.</Text>
      </View>
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      {items.map((item) => (
        <Pressable key={item.id} style={styles.card} onPress={() => router.push(`/commercial-application/${item.id}`)}>
          <Text style={styles.cardStatus}>{item.status}</Text>
          <Text style={styles.cardTitle}>{item.companyName}</Text>
          <Text style={styles.copy}>@{item.user.username}</Text>
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
    color: '#ffd6c2',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  title: {
    color: '#f8f2ea',
    fontSize: 24,
    fontWeight: '800',
  },
  copy: {
    color: '#9eb0be',
  },
  error: {
    color: '#ffb4b4',
  },
  card: {
    gap: 6,
    padding: 18,
    borderRadius: 22,
    backgroundColor: '#0d1d2a',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  cardStatus: {
    color: '#ffd6c2',
    fontWeight: '800',
  },
  cardTitle: {
    color: '#f8f2ea',
    fontSize: 18,
    fontWeight: '800',
  },
});
