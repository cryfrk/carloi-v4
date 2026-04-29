import { useLocalSearchParams, Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MediaAssetPurpose, type InsuranceRequestView } from '@carloi-v4/types';
import { useAdminAuth } from '../../context/admin-auth-context';
import { adminMobileApi } from '../../lib/admin-api';
import { pickAdminDocuments } from '../../lib/upload-picker';

export default function InsuranceRequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAdminAuth();
  const [request, setRequest] = useState<InsuranceRequestView | null>(null);
  const [offerAmount, setOfferAmount] = useState('');
  const [offerFileUrl, setOfferFileUrl] = useState('');
  const [policyUrl, setPolicyUrl] = useState('');
  const [invoiceUrl, setInvoiceUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.accessToken || !id) {
      return;
    }

    void adminMobileApi
      .getInsuranceRequest(session.accessToken, id)
      .then((response) => {
        setRequest(response);
        setOfferAmount(response.currentOffer ? response.currentOffer.amount.toString() : '');
        setOfferFileUrl(response.currentOffer?.offerFileUrl ?? '');
      })
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : 'Talep detayi yuklenemedi.');
      });
  }, [id, session?.accessToken]);

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (session.admin.role !== 'INSURANCE_ADMIN' && session.admin.role !== 'SUPER_ADMIN') {
    return <Redirect href="/dashboard" />;
  }

  const accessToken = session.accessToken;

  async function refreshRequest() {
    if (!id) {
      return;
    }

    const response = await adminMobileApi.getInsuranceRequest(accessToken, id);
    setRequest(response);
  }

  async function createOffer() {
    if (!id) {
      return;
    }

    try {
      await adminMobileApi.createOffer(accessToken, id, {
        amount: Number(offerAmount),
        currency: 'TRY',
        offerFileUrl: offerFileUrl || undefined,
      });
      setNotice('Teklif gonderildi.');
      await refreshRequest();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Teklif gonderilemedi.');
    }
  }

  async function uploadDocuments() {
    if (!id) {
      return;
    }

    try {
      await adminMobileApi.uploadDocuments(accessToken, id, {
        policyDocumentUrl: policyUrl || undefined,
        invoiceDocumentUrl: invoiceUrl || undefined,
      });
      setNotice('Belgeler yuklendi.');
      await refreshRequest();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Belgeler yuklenemedi.');
    }
  }

  async function uploadOfferFile() {
    try {
      const files = await pickAdminDocuments({ type: ['application/pdf', 'image/*'] });
      const selectedFile = files[0];

      if (!selectedFile) {
        return;
      }

      const upload = await adminMobileApi.uploadMedia(
        accessToken,
        selectedFile,
        MediaAssetPurpose.INSURANCE_OFFER,
      );
      setOfferFileUrl(upload.url);
      setNotice('Teklif dosyasi yuklendi.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Teklif dosyasi yuklenemedi.');
    }
  }

  async function uploadPolicyFile() {
    try {
      const files = await pickAdminDocuments({ type: ['application/pdf', 'image/*'] });
      const selectedFile = files[0];

      if (!selectedFile) {
        return;
      }

      const upload = await adminMobileApi.uploadMedia(
        accessToken,
        selectedFile,
        MediaAssetPurpose.INSURANCE_POLICY,
      );
      setPolicyUrl(upload.url);
      setNotice('Police dosyasi yuklendi.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Police dosyasi yuklenemedi.');
    }
  }

  async function uploadInvoiceFile() {
    try {
      const files = await pickAdminDocuments({ type: ['application/pdf', 'image/*'] });
      const selectedFile = files[0];

      if (!selectedFile) {
        return;
      }

      const upload = await adminMobileApi.uploadMedia(
        accessToken,
        selectedFile,
        MediaAssetPurpose.INSURANCE_INVOICE,
      );
      setInvoiceUrl(upload.url);
      setNotice('Fatura dosyasi yuklendi.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Fatura dosyasi yuklenemedi.');
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      {!request ? (
        <View style={styles.card}>
          <Text style={styles.text}>Talep yukleniyor...</Text>
        </View>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.kicker}>{request.status}</Text>
            <Text style={styles.title}>{request.listing.title}</Text>
            <Text style={styles.text}>Alici: {request.buyer.fullName}</Text>
            <Text style={styles.text}>Satici: {request.seller.fullName}</Text>
            <Text style={styles.text}>TC: {request.licenseInfo.maskedTcNo ?? '-'}</Text>
            <Text style={styles.text}>Plaka: {request.licenseInfo.maskedPlate ?? '-'}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.kicker}>Teklif</Text>
            <TextInput
              style={styles.input}
              value={offerAmount}
              onChangeText={setOfferAmount}
              placeholder="Tutar"
              placeholderTextColor="#789"
            />
            <TextInput
              style={styles.input}
              value={offerFileUrl}
              onChangeText={setOfferFileUrl}
              placeholder="Teklif dosyasi URL"
              placeholderTextColor="#789"
            />
            <Pressable style={styles.secondaryButton} onPress={() => void uploadOfferFile()}>
              <Text style={styles.secondaryButtonLabel}>Teklif dosyasi yukle</Text>
            </Pressable>
            <Pressable style={styles.button} onPress={() => void createOffer()}>
              <Text style={styles.buttonLabel}>Teklif gonder</Text>
            </Pressable>
          </View>

          <View style={styles.card}>
            <Text style={styles.kicker}>Belgeler</Text>
            <TextInput
              style={styles.input}
              value={policyUrl}
              onChangeText={setPolicyUrl}
              placeholder="Police URL"
              placeholderTextColor="#789"
            />
            <Pressable style={styles.secondaryButton} onPress={() => void uploadPolicyFile()}>
              <Text style={styles.secondaryButtonLabel}>Police yukle</Text>
            </Pressable>
            <TextInput
              style={styles.input}
              value={invoiceUrl}
              onChangeText={setInvoiceUrl}
              placeholder="Fatura URL"
              placeholderTextColor="#789"
            />
            <Pressable style={styles.secondaryButton} onPress={() => void uploadInvoiceFile()}>
              <Text style={styles.secondaryButtonLabel}>Fatura yukle</Text>
            </Pressable>
            <Pressable style={styles.button} onPress={() => void uploadDocuments()}>
              <Text style={styles.buttonLabel}>Belgeleri yukle</Text>
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
    paddingVertical: 12,
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
