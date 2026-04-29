import type {
  CreateInsurancePaymentResponse,
  InsuranceRequestView,
} from '@carloi-v4/types';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MobileShell } from '../../components/mobile-shell';
import { useAuth } from '../../context/auth-context';
import { mobileInsuranceApi } from '../../lib/insurance-api';
import { mobilePaymentsApi } from '../../lib/payments-api';

export default function InsuranceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const [request, setRequest] = useState<InsuranceRequestView | null>(null);
  const [paymentSession, setPaymentSession] = useState<CreateInsurancePaymentResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.accessToken || !id) {
      return;
    }

    void mobileInsuranceApi
      .getRequest(session.accessToken, id)
      .then((response) => setRequest(response))
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : 'Talep detaylari yuklenemedi.');
      });
  }, [id, session?.accessToken]);

  if (!session) {
    return <Redirect href="/login" />;
  }

  const accessToken = session.accessToken;

  async function refreshRequest() {
    if (!id) {
      return;
    }

    const response = await mobileInsuranceApi.getRequest(accessToken, id);
    setRequest(response);
  }

  async function acceptOffer() {
    if (!request?.currentOffer) {
      return;
    }

    try {
      await mobileInsuranceApi.acceptOffer(accessToken, request.currentOffer.id);
      setNotice('Teklif kabul edildi.');
      await refreshRequest();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Teklif kabul edilemedi.');
    }
  }

  async function rejectOffer() {
    if (!request?.currentOffer) {
      return;
    }

    try {
      await mobileInsuranceApi.rejectOffer(accessToken, request.currentOffer.id);
      setNotice('Teklif reddedildi.');
      await refreshRequest();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Teklif reddedilemedi.');
    }
  }

  async function startPayment() {
    if (!id) {
      return;
    }

    try {
      const response = await mobilePaymentsApi.createInsurancePayment(accessToken, id);
      setPaymentSession(response);

      if (response.providerMode === 'MOCK') {
        const callback = await mobilePaymentsApi.submitMockPayment(response.checkout.fields);
        router.push(`/payment-result?paymentId=${callback.paymentId}`);
        return;
      }

      setNotice('Banka odeme adimi mobil tarayicida acilacak.');
      await Linking.openURL(response.checkout.actionUrl);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Odeme baslatilamadi.');
    }
  }

  return (
    <MobileShell title={request?.listing.title ?? 'Sigorta detayi'} subtitle="Teklif, odeme ve belge adimlari burada.">
      <ScrollView contentContainerStyle={styles.content}>
        {notice ? (
          <View style={[styles.card, styles.noticeCard]}>
            <Text style={styles.text}>{notice}</Text>
          </View>
        ) : null}
        {errorMessage ? (
          <View style={[styles.card, styles.errorCard]}>
            <Text style={styles.text}>{errorMessage}</Text>
          </View>
        ) : null}

        {!request ? (
          <View style={styles.card}>
            <Text style={styles.text}>Talep yukleniyor...</Text>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.kicker}>{request.status}</Text>
              <Text style={styles.title}>{request.listing.title}</Text>
              <Text style={styles.meta}>
                {request.vehicle.brand ?? '-'} {request.vehicle.model ?? '-'} · {request.listing.listingNo}
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.kicker}>Sigorta teklifi</Text>
              {request.currentOffer ? (
                <>
                  <Text style={styles.title}>
                    {request.currentOffer.amount.toLocaleString('tr-TR')} {request.currentOffer.currency}
                  </Text>
                  <Text style={styles.meta}>Durum: {request.currentOffer.status}</Text>
                  <View style={styles.actions}>
                    {request.currentOffer.status === 'ACTIVE' ? (
                      <>
                        <Pressable style={styles.primaryButton} onPress={() => void acceptOffer()}>
                          <Text style={styles.primaryButtonLabel}>Kabul et</Text>
                        </Pressable>
                        <Pressable style={styles.secondaryButton} onPress={() => void rejectOffer()}>
                          <Text style={styles.secondaryButtonLabel}>Reddet</Text>
                        </Pressable>
                      </>
                    ) : null}
                    {request.status === 'ACCEPTED' || request.status === 'PAID' || request.status === 'POLICY_UPLOADED' ? (
                      <Pressable style={styles.primaryButton} onPress={() => void startPayment()}>
                        <Text style={styles.primaryButtonLabel}>Odeme ekranini ac</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </>
              ) : (
                <Text style={styles.meta}>Henuz teklif olusturulmadi.</Text>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.kicker}>Ruhsat bilgisi</Text>
              <Text style={styles.meta}>Sahip: {request.licenseInfo.ownerName ?? '-'}</Text>
              <Text style={styles.meta}>TC: {request.licenseInfo.maskedTcNo ?? '-'}</Text>
              <Text style={styles.meta}>Plaka: {request.licenseInfo.maskedPlate ?? '-'}</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.kicker}>Belgeler</Text>
              {request.documents.length > 0 ? (
                request.documents.map((document) => (
                  <Text key={document.id} style={styles.meta}>
                    {document.documentType}: {document.fileUrl ?? '-'}
                  </Text>
                ))
              ) : (
                <Text style={styles.meta}>Belgeler odeme tamamlandiginda burada acilir.</Text>
              )}
            </View>

            {paymentSession?.providerMode === 'GARANTI' ? (
              <View style={styles.card}>
                <Text style={styles.kicker}>Garanti odeme yonlendirmesi</Text>
                <Text style={styles.meta}>
                  Gercek banka formu tarayicida devam eder. Donus sonrasi sonuc ekranina yonlendirilebilirsiniz.
                </Text>
              </View>
            ) : null}
          </>
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
  noticeCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
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
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  primaryButton: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ef8354',
  },
  primaryButtonLabel: {
    color: '#08131d',
    fontWeight: '900',
  },
  secondaryButton: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#132534',
  },
  secondaryButtonLabel: {
    color: '#f8f2ea',
    fontWeight: '800',
  },
});
