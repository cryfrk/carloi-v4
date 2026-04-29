import type { AdminDashboardResponse } from '@carloi-v4/types';
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAdminAuth } from '../context/admin-auth-context';
import { adminMobileApi } from '../lib/admin-api';

export default function DashboardScreen() {
  const router = useRouter();
  const { session, signOut } = useAdminAuth();
  const [dashboard, setDashboard] = useState<AdminDashboardResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    void adminMobileApi
      .getDashboard(session.accessToken)
      .then(setDashboard)
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : 'Dashboard yuklenemedi.');
      });
  }, [session?.accessToken]);

  if (!session) {
    return <Redirect href="/login" />;
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.kicker}>Admin dashboard</Text>
        <Text style={styles.title}>{session.admin.role}</Text>
        <Text style={styles.copy}>Rolune gore KPI ozetleri ve hizli operasyon baglantilari burada.</Text>
      </View>
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      <View style={styles.metricGrid}>
        {(dashboard?.metrics ?? []).map((metric) => (
          <View key={metric.key} style={styles.metricCard}>
            <Text style={styles.metricLabel}>{metric.label}</Text>
            <Text style={styles.metricValue}>{typeof metric.value === 'number' ? metric.value.toLocaleString('tr-TR') : metric.value}</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Hizli akislar</Text>
        {(session.admin.role === 'INSURANCE_ADMIN' || session.admin.role === 'SUPER_ADMIN') ? (
          <Pressable style={styles.linkCard} onPress={() => router.push('/insurance-requests')}>
            <Text style={styles.linkTitle}>Sigorta taleplerine git</Text>
            <Text style={styles.copy}>Teklif, odeme ve police akislarini yonet.</Text>
          </Pressable>
        ) : null}
        {(session.admin.role === 'COMMERCIAL_ADMIN' || session.admin.role === 'SUPER_ADMIN') ? (
          <Pressable style={styles.linkCard} onPress={() => router.push('/commercial-applications')}>
            <Text style={styles.linkTitle}>Ticari basvurulara git</Text>
            <Text style={styles.copy}>Onay ve red surecini hizli sekilde yonet.</Text>
          </Pressable>
        ) : null}
      </View>

      {dashboard?.recentAuditLogs?.length ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Son audit kayitlari</Text>
          {dashboard.recentAuditLogs.slice(0, 5).map((item) => (
            <View key={item.id} style={styles.logRow}>
              <Text style={styles.logTitle}>{item.action}</Text>
              <Text style={styles.copy}>{item.entityType} / {item.entityId}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <Pressable
        style={styles.secondaryButton}
        onPress={() => {
          signOut();
          router.replace('/login');
        }}
      >
        <Text style={styles.secondaryButtonLabel}>Cikis yap</Text>
      </Pressable>
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
  metricGrid: {
    gap: 10,
  },
  metricCard: {
    gap: 6,
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#0d1d2a',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  metricLabel: {
    color: '#9eb0be',
    fontSize: 13,
  },
  metricValue: {
    color: '#f8f2ea',
    fontSize: 24,
    fontWeight: '800',
  },
  card: {
    gap: 10,
    padding: 18,
    borderRadius: 22,
    backgroundColor: '#0d1d2a',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  sectionTitle: {
    color: '#f8f2ea',
    fontSize: 18,
    fontWeight: '800',
  },
  linkCard: {
    gap: 6,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#102030',
  },
  linkTitle: {
    color: '#f8f2ea',
    fontWeight: '800',
  },
  logRow: {
    gap: 4,
    paddingVertical: 6,
  },
  logTitle: {
    color: '#ffd6c2',
    fontWeight: '800',
  },
  secondaryButton: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#102030',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  secondaryButtonLabel: {
    color: '#f8f2ea',
    fontWeight: '800',
  },
});
