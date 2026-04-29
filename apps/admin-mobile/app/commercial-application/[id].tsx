import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { CommercialApplicationView } from '@carloi-v4/types';
import { useAdminAuth } from '../../context/admin-auth-context';
import { adminMobileApi } from '../../lib/admin-api';

export default function CommercialApplicationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAdminAuth();
  const [application, setApplication] = useState<CommercialApplicationView | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.accessToken || !id) {
      return;
    }

    void adminMobileApi
      .getCommercialApplication(session.accessToken, id)
      .then(setApplication)
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : 'Basvuru detayi yuklenemedi.');
      });
  }, [id, session?.accessToken]);

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (session.admin.role !== 'COMMERCIAL_ADMIN' && session.admin.role !== 'SUPER_ADMIN') {
    return <Redirect href="/dashboard" />;
  }

  async function refreshApplication() {
    if (!session?.accessToken || !id) {
      return;
    }

    const response = await adminMobileApi.getCommercialApplication(session.accessToken, id);
    setApplication(response);
  }

  async function approve() {
    if (!session?.accessToken || !id) {
      return;
    }

    try {
      await adminMobileApi.approveCommercialApplication(session.accessToken, id);
      setNotice('Basvuru onaylandi.');
      await refreshApplication();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Onay islemi tamamlanamadi.');
    }
  }

  async function reject() {
    if (!session?.accessToken || !id) {
      return;
    }

    try {
      await adminMobileApi.rejectCommercialApplication(session.accessToken, id, { rejectionReason });
      setNotice('Basvuru reddedildi.');
      await refreshApplication();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Red islemi tamamlanamadi.');
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      {!application ? (
        <View style={styles.card}>
          <Text style={styles.text}>Basvuru yukleniyor...</Text>
        </View>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.kicker}>{application.status}</Text>
            <Text style={styles.title}>{application.companyName}</Text>
            <Text style={styles.text}>Kullanici: {application.user.fullName}</Text>
            <Text style={styles.text}>@{application.user.username}</Text>
            <Text style={styles.text}>Vergi no: {application.taxNumber}</Text>
            <Text style={styles.text}>TC: {application.user.maskedTcIdentityNo ?? '-'}</Text>
            <Text style={styles.text}>Vergi levhasi: {application.taxDocumentUrl ?? '-'}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.kicker}>Aksiyon</Text>
            <Pressable style={styles.button} onPress={() => void approve()}>
              <Text style={styles.buttonLabel}>Onayla</Text>
            </Pressable>
            <TextInput
              style={styles.input}
              value={rejectionReason}
              onChangeText={setRejectionReason}
              placeholder="Red nedeni"
              placeholderTextColor="#789"
              multiline
            />
            <Pressable style={styles.secondaryButton} onPress={() => void reject()}>
              <Text style={styles.secondaryButtonLabel}>Reddet</Text>
            </Pressable>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 12,
    padding: 18,
  },
  notice: {
    color: '#d8f2d1',
  },
  error: {
    color: '#ffb4b4',
  },
  card: {
    gap: 10,
    padding: 18,
    borderRadius: 22,
    backgroundColor: '#0d1d2a',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  kicker: {
    color: '#ffd6c2',
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  title: {
    color: '#f8f2ea',
    fontSize: 20,
    fontWeight: '800',
  },
  text: {
    color: '#9eb0be',
  },
  input: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 88,
    textAlignVertical: 'top',
    backgroundColor: '#102030',
    color: '#f8f2ea',
  },
  button: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#ef8354',
  },
  buttonLabel: {
    color: '#08131d',
    fontWeight: '900',
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
    fontWeight: '900',
  },
});
