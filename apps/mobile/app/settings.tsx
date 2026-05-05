import type { AuthSessionDevice, CommercialApplicationView, SettingsMeResponse } from '@carloi-v4/types';
import { MediaAssetPurpose } from '@carloi-v4/types';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, Image } from 'react-native';
import { MobileShell } from '../components/mobile-shell';
import { mobileTheme } from '../lib/design-system';
import { useAuth } from '../context/auth-context';
import { mobileCommercialApi } from '../lib/commercial-api';
import { mobileAuthApi } from '../lib/auth-api';
import { mobileMediaApi } from '../lib/media-api';
import { pickDocumentFiles, pickMediaFiles } from '../lib/upload-picker';
import { mobileProfileApi } from '../lib/profile-api';
import { useRouter } from 'expo-router';

export default function SettingsScreen() {
  const router = useRouter();
  const { session, sessions, switchAccount, signOut, signOutAll } = useAuth();
  const [settings, setSettings] = useState<SettingsMeResponse | null>(null);
  const [application, setApplication] = useState<CommercialApplicationView | null>(null);
  const [sessionDevices, setSessionDevices] = useState<AuthSessionDevice[]>([]);
  const [sessionDevicesLoading, setSessionDevicesLoading] = useState(false);
  const [profileForm, setProfileForm] = useState({
    avatarUrl: '',
    firstName: '',
    lastName: '',
    username: '',
    bio: '',
    websiteUrl: '',
    locationText: '',
  });
  const [privacy, setPrivacy] = useState({ isPrivate: false, showGarageVehicles: true });
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [companyTitle, setCompanyTitle] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [tcIdentityNo, setTcIdentityNo] = useState('');
  const [taxDocumentUrl, setTaxDocumentUrl] = useState('');
  const [otherDocumentUrlsText, setOtherDocumentUrlsText] = useState('');
  const [notes, setNotes] = useState('');
  const [avatarMediaAssetId, setAvatarMediaAssetId] = useState<string | null>(null);
  const [taxDocumentMediaAssetId, setTaxDocumentMediaAssetId] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [taxDocumentUploading, setTaxDocumentUploading] = useState(false);
  const [otherDocumentsUploading, setOtherDocumentsUploading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    void Promise.all([
      mobileProfileApi.getSettings(session.accessToken),
      mobileCommercialApi.getOwnApplication(session.accessToken),
    ])
      .then(([settingsResponse, applicationResponse]) => {
        setSettings(settingsResponse);
        setApplication(applicationResponse.application);
        setProfileForm({
          avatarUrl: settingsResponse.profile.avatarUrl ?? '',
          firstName: settingsResponse.profile.firstName,
          lastName: settingsResponse.profile.lastName,
          username: settingsResponse.profile.username,
          bio: settingsResponse.profile.bio ?? '',
          websiteUrl: settingsResponse.profile.websiteUrl ?? '',
          locationText: settingsResponse.profile.locationText ?? '',
        });
        setPrivacy(settingsResponse.privacy);
        setCompanyTitle(applicationResponse.application?.companyName ?? '');
        setTaxNumber(applicationResponse.application?.taxNumber ?? '');
        setTaxDocumentUrl(applicationResponse.application?.taxDocumentUrl ?? '');
        setOtherDocumentUrlsText((applicationResponse.application?.otherDocumentUrls ?? []).join('\n'));
        setNotes(applicationResponse.application?.notes ?? '');
      })
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : 'Ayarlar yuklenemedi.');
      });
  }, [session?.accessToken]);

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    void reloadSessionDevices(session.accessToken);
  }, [session?.accessToken]);

  const hasPendingApplication = application?.status === 'PENDING';
  const isApproved = session?.user.isCommercialApproved || application?.status === 'APPROVED';
  const otherDocumentUrls = useMemo(
    () =>
      otherDocumentUrlsText
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean)
        .map((url) => ({ url })),
    [otherDocumentUrlsText],
  );

  async function reloadSettings() {
    if (!session?.accessToken) {
      return;
    }

    const response = await mobileProfileApi.getSettings(session.accessToken);
    setSettings(response);
    setPrivacy(response.privacy);
  }

  async function reloadSessionDevices(accessToken = session?.accessToken) {
    if (!accessToken) {
      return;
    }

    setSessionDevicesLoading(true);

    try {
      const response = await mobileAuthApi.getSessions(accessToken);
      setSessionDevices(response.items);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Aktif cihazlar getirilemedi.');
    } finally {
      setSessionDevicesLoading(false);
    }
  }

  async function handleRevokeSession(device: AuthSessionDevice) {
    if (!session?.accessToken) {
      return;
    }

    try {
      await mobileAuthApi.revokeSession(session.accessToken, device.id);
      setNotice(device.isCurrent ? 'Bu cihaz oturumu kapatildi.' : 'Cihaz oturumu kapatildi.');
      if (device.isCurrent) {
        await signOut();
        router.replace('/login');
        return;
      }

      await reloadSessionDevices(session.accessToken);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Cihaz oturumu kapatilamadi.');
    }
  }

  async function handleProfileSave() {
    if (!session?.accessToken) {
      return;
    }

    try {
      await mobileProfileApi.updateSettingsProfile(session.accessToken, {
        ...profileForm,
        avatarMediaAssetId: avatarMediaAssetId ?? undefined,
      });
      await reloadSettings();
      setAvatarMediaAssetId(null);
      setNotice('Profil bilgileri guncellendi.');
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Profil guncellenemedi.');
    }
  }

  async function handlePrivacySave() {
    if (!session?.accessToken) {
      return;
    }

    try {
      await mobileProfileApi.updatePrivacy(session.accessToken, privacy);
      await reloadSettings();
      setNotice('Gizlilik ayarlari kaydedildi.');
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Gizlilik kaydedilemedi.');
    }
  }

  async function handlePasswordChange() {
    if (!session?.accessToken) {
      return;
    }

    try {
      const response = await mobileProfileApi.changePassword(session.accessToken, passwordForm);
      setNotice(response.message ?? 'Sifre guncellendi.');
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setErrorMessage(null);
      await signOut();
      router.replace('/login');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Sifre degistirilemedi.');
    }
  }

  async function handleCommercialSubmit() {
    if (!session?.accessToken) {
      return;
    }

    try {
      const response = await mobileCommercialApi.submit(session.accessToken, {
        companyTitle,
        taxNumber,
        tcIdentityNo,
        taxDocumentUrl: taxDocumentUrl || undefined,
        taxDocumentMediaAssetId: taxDocumentMediaAssetId ?? undefined,
        otherDocumentUrls,
        notes,
      });
      setApplication(response.application);
      setTaxDocumentMediaAssetId(null);
      setNotice('Basvurunuz alindi. Admin onayi bekleniyor.');
      setErrorMessage(null);
      await reloadSettings();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Basvuru gonderilemedi.');
    }
  }

  async function handleAvatarUpload() {
    if (!session?.accessToken) {
      return;
    }

    setAvatarUploading(true);
    setErrorMessage(null);

    try {
      const files = await pickMediaFiles({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.84,
        maxFileSizeMb: 20,
      });
      const selectedFile = files[0];

      if (!selectedFile) {
        return;
      }

      const upload = await mobileMediaApi.uploadFile(session.accessToken, selectedFile, MediaAssetPurpose.PROFILE_AVATAR);
      setProfileForm((current) => ({ ...current, avatarUrl: upload.url }));
      setAvatarMediaAssetId(upload.id);
      setNotice('Profil gorseli yuklendi.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Profil gorseli yuklenemedi.');
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleTaxDocumentUpload() {
    if (!session?.accessToken) {
      return;
    }

    setTaxDocumentUploading(true);
    setErrorMessage(null);

    try {
      const files = await pickDocumentFiles({ type: ['application/pdf', 'image/*'] });
      const selectedFile = files[0];

      if (!selectedFile) {
        return;
      }

      const upload = await mobileMediaApi.uploadFile(session.accessToken, selectedFile, MediaAssetPurpose.COMMERCIAL_DOCUMENT);
      setTaxDocumentUrl(upload.url);
      setTaxDocumentMediaAssetId(upload.id);
      setNotice('Vergi levhasi yuklendi.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Vergi levhasi yuklenemedi.');
    } finally {
      setTaxDocumentUploading(false);
    }
  }

  async function handleOtherDocumentsUpload() {
    if (!session?.accessToken) {
      return;
    }

    setOtherDocumentsUploading(true);
    setErrorMessage(null);

    try {
      const files = await pickDocumentFiles({ multiple: true, type: ['application/pdf', 'image/*'] });

      if (!files.length) {
        return;
      }

      const uploads = await mobileMediaApi.uploadFiles(session.accessToken, files, MediaAssetPurpose.COMMERCIAL_DOCUMENT);
      setOtherDocumentUrlsText((current) =>
        [...current.split(/\r?\n/).map((item) => item.trim()).filter(Boolean), ...uploads.map((item) => item.url)].join('\n'),
      );
      setNotice(`${uploads.length} ek belge yuklendi.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Ek belgeler yuklenemedi.');
    } finally {
      setOtherDocumentsUploading(false);
    }
  }

  function formatSessionMeta(device: AuthSessionDevice) {
    const parts = [
      device.deviceName ?? device.platform ?? 'Carloi Device',
      device.platform,
      device.approximateLocation,
      device.ip,
    ].filter(Boolean);

    return parts.join(' | ');
  }

  function formatSessionDate(value: string | null) {
    if (!value) {
      return 'Simdi';
    }

    return new Date(value).toLocaleString('tr-TR', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  }

  return (
    <MobileShell title="Ayarlar" subtitle="Profil, gizlilik, kaydedilenler ve hesap yonetimi burada toplanir.">
      <ScrollView contentContainerStyle={styles.content}>
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

        <View style={styles.card}>
          <Text style={styles.kicker}>Hesap merkezi</Text>
          <Text style={styles.title}>@{settings?.profile.username ?? session?.user.username ?? '-'}</Text>
          <Text style={styles.text}>Aktif oturumlar: {sessionDevices.length || settings?.accountCenter.activeSessionCount || sessions.length}</Text>
          <Text style={styles.text}>Kaydedilen gonderi: {settings?.accountCenter.savedPostsCount ?? 0}</Text>
          <Text style={styles.text}>Kaydedilen ilan: {settings?.accountCenter.savedListingsCount ?? 0}</Text>
          <View style={styles.row}>
            <Pressable style={styles.secondaryButton} onPress={() => router.push('/saved')}>
              <Text style={styles.secondaryButtonLabel}>Kaydedilenler</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={() => router.push('/login')}>
              <Text style={styles.secondaryButtonLabel}>Hesap ekle</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.kicker}>Aktif cihazlar</Text>
          {sessionDevicesLoading ? <Text style={styles.text}>Cihaz oturumlari getiriliyor...</Text> : null}
          {!sessionDevicesLoading && sessionDevices.length === 0 ? (
            <Text style={styles.text}>Bu hesaba bagli aktif cihaz bulunamadi.</Text>
          ) : null}
          {sessionDevices.map((device) => (
            <View key={device.id} style={styles.sessionRow}>
              <View style={styles.sessionCopy}>
                <Text style={styles.cardTitle}>
                  {device.deviceName ?? device.platform ?? 'Carloi Device'}
                  {device.isCurrent ? ' · Bu cihaz' : ''}
                </Text>
                <Text style={styles.meta}>{formatSessionMeta(device)}</Text>
                <Text style={styles.meta}>Son gorulme: {formatSessionDate(device.lastSeenAt)}</Text>
              </View>
              <Pressable style={styles.sessionButton} onPress={() => void handleRevokeSession(device)}>
                <Text style={styles.sessionButtonLabel}>{device.isCurrent ? 'Cikis yap' : 'Cihazi kapat'}</Text>
              </Pressable>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.kicker}>Profil bilgileri</Text>
          <Pressable style={styles.uploadCard} onPress={() => void handleAvatarUpload()}>
            <Text style={styles.uploadTitle}>{avatarUploading ? 'Avatar yukleniyor...' : 'Profil gorseli yukle'}</Text>
            <Text style={styles.uploadCopy}>JPG, PNG veya WEBP sec ve profil gorselini guncelle.</Text>
          </Pressable>
          {profileForm.avatarUrl ? <Image source={{ uri: profileForm.avatarUrl }} style={styles.avatarPreview} /> : null}
          <TextInput style={styles.input} value={profileForm.firstName} onChangeText={(value) => setProfileForm((current) => ({ ...current, firstName: value }))} placeholder="Ad" placeholderTextColor="#789" />
          <TextInput style={styles.input} value={profileForm.lastName} onChangeText={(value) => setProfileForm((current) => ({ ...current, lastName: value }))} placeholder="Soyad" placeholderTextColor="#789" />
          <TextInput style={styles.input} value={profileForm.username} onChangeText={(value) => setProfileForm((current) => ({ ...current, username: value }))} placeholder="Kullanici adi" placeholderTextColor="#789" autoCapitalize="none" />
          <TextInput style={[styles.input, styles.multiline]} value={profileForm.bio} onChangeText={(value) => setProfileForm((current) => ({ ...current, bio: value }))} placeholder="Bio" placeholderTextColor="#789" multiline numberOfLines={3} />
          <TextInput style={styles.input} value={profileForm.websiteUrl} onChangeText={(value) => setProfileForm((current) => ({ ...current, websiteUrl: value }))} placeholder="Website URL" placeholderTextColor="#789" />
          <TextInput style={styles.input} value={profileForm.locationText} onChangeText={(value) => setProfileForm((current) => ({ ...current, locationText: value }))} placeholder="Konum" placeholderTextColor="#789" />
          <Pressable style={styles.primaryButton} onPress={() => void handleProfileSave()}>
            <Text style={styles.primaryButtonLabel}>Profili kaydet</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.kicker}>Hesap gizliligi</Text>
          <Pressable style={styles.toggleRow} onPress={() => setPrivacy((current) => ({ ...current, isPrivate: !current.isPrivate }))}>
            <Text style={styles.toggleLabel}>Gizli hesap</Text>
            <Text style={styles.toggleValue}>{privacy.isPrivate ? 'Acik' : 'Kapali'}</Text>
          </Pressable>
          <Pressable style={styles.toggleRow} onPress={() => setPrivacy((current) => ({ ...current, showGarageVehicles: !current.showGarageVehicles }))}>
            <Text style={styles.toggleLabel}>Garaj araclarini goster</Text>
            <Text style={styles.toggleValue}>{privacy.showGarageVehicles ? 'Acik' : 'Kapali'}</Text>
          </Pressable>
          <Pressable style={styles.primaryButton} onPress={() => void handlePrivacySave()}>
            <Text style={styles.primaryButtonLabel}>Gizliligi kaydet</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.kicker}>Sifre degistir</Text>
          <TextInput style={styles.input} value={passwordForm.oldPassword} onChangeText={(value) => setPasswordForm((current) => ({ ...current, oldPassword: value }))} placeholder="Mevcut sifre" placeholderTextColor="#789" secureTextEntry />
          <TextInput style={styles.input} value={passwordForm.newPassword} onChangeText={(value) => setPasswordForm((current) => ({ ...current, newPassword: value }))} placeholder="Yeni sifre" placeholderTextColor="#789" secureTextEntry />
          <TextInput style={styles.input} value={passwordForm.confirmPassword} onChangeText={(value) => setPasswordForm((current) => ({ ...current, confirmPassword: value }))} placeholder="Yeni sifre tekrar" placeholderTextColor="#789" secureTextEntry />
          <Pressable style={styles.primaryButton} onPress={() => void handlePasswordChange()}>
            <Text style={styles.primaryButtonLabel}>Sifreyi guncelle</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.kicker}>Ticari hesaba gec</Text>
          <Text style={styles.text}>Durum: {application?.status ?? (isApproved ? 'APPROVED' : 'NONE')}</Text>
          {application?.rejectionReason ? <Text style={styles.error}>Red nedeni: {application.rejectionReason}</Text> : null}
          <TextInput style={styles.input} value={companyTitle} onChangeText={setCompanyTitle} placeholder="Firma unvani" placeholderTextColor="#789" editable={!hasPendingApplication && !isApproved} />
          <TextInput style={styles.input} value={taxNumber} onChangeText={setTaxNumber} placeholder="Vergi numarasi" placeholderTextColor="#789" editable={!hasPendingApplication && !isApproved} />
          <TextInput style={styles.input} value={tcIdentityNo} onChangeText={setTcIdentityNo} placeholder="TC kimlik no" placeholderTextColor="#789" editable={!hasPendingApplication && !isApproved} />
          <Pressable style={styles.uploadCard} onPress={() => void handleTaxDocumentUpload()} disabled={hasPendingApplication || Boolean(isApproved)}>
            <Text style={styles.uploadTitle}>{taxDocumentUploading ? 'Vergi levhasi yukleniyor...' : 'Vergi levhasi yukle'}</Text>
            <Text style={styles.uploadCopy}>PDF veya gorsel belge sec. Belge private olarak saklanir.</Text>
          </Pressable>
          <TextInput style={styles.input} value={taxDocumentUrl} onChangeText={setTaxDocumentUrl} placeholder="Vergi levhasi URL" placeholderTextColor="#789" editable={!hasPendingApplication && !isApproved} />
          <Pressable style={styles.uploadCard} onPress={() => void handleOtherDocumentsUpload()} disabled={hasPendingApplication || Boolean(isApproved)}>
            <Text style={styles.uploadTitle}>{otherDocumentsUploading ? 'Belgeler yukleniyor...' : 'Ek belge yukle'}</Text>
            <Text style={styles.uploadCopy}>Yuklenen ek belgeler URL listesine otomatik eklenir.</Text>
          </Pressable>
          <TextInput style={[styles.input, styles.multiline]} value={otherDocumentUrlsText} onChangeText={setOtherDocumentUrlsText} placeholder="Diger belge URL'leri, her satira bir tane" placeholderTextColor="#789" multiline numberOfLines={3} editable={!hasPendingApplication && !isApproved} />
          <TextInput style={[styles.input, styles.multiline]} value={notes} onChangeText={setNotes} placeholder="Ek not" placeholderTextColor="#789" multiline numberOfLines={3} editable={!hasPendingApplication && !isApproved} />
          <Pressable style={[styles.primaryButton, hasPendingApplication || isApproved ? styles.disabled : null]} onPress={() => void handleCommercialSubmit()} disabled={hasPendingApplication || Boolean(isApproved)}>
            <Text style={styles.primaryButtonLabel}>Basvuruyu gonder</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.kicker}>Hesap degistir</Text>
          {sessions.map((item) => (
            <Pressable key={item.user.id} style={styles.accountRow} onPress={() => switchAccount(item.user.id)}>
              <View>
                <Text style={styles.cardTitle}>@{item.user.username}</Text>
                <Text style={styles.meta}>{item.user.firstName} {item.user.lastName}</Text>
              </View>
              <Text style={styles.meta}>{session?.user.id === item.user.id ? 'Aktif' : 'Gec'}</Text>
            </Pressable>
          ))}
          <View style={styles.row}>
            <Pressable style={styles.secondaryButton} onPress={() => void signOut()}>
              <Text style={styles.secondaryButtonLabel}>Bu hesaptan cik</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={() => void signOutAll()}>
              <Text style={styles.secondaryButtonLabel}>Tum hesaplardan cik</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, paddingBottom: 18 },
  card: {
    gap: 12,
    padding: 18,
    borderRadius: mobileTheme.radius.xl,
    backgroundColor: mobileTheme.colors.surface,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
  },
  kicker: {
    color: mobileTheme.colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: { color: mobileTheme.colors.textStrong, fontSize: 22, fontWeight: '700' },
  cardTitle: { color: mobileTheme.colors.textStrong, fontWeight: '700' },
  text: { color: mobileTheme.colors.textMuted, lineHeight: 20 },
  meta: { color: mobileTheme.colors.textMuted, fontSize: 12 },
  notice: {
    color: mobileTheme.colors.textStrong,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    borderRadius: mobileTheme.radius.md,
    padding: 14,
  },
  error: {
    color: '#b91c1c',
    backgroundColor: '#fff5f5',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: mobileTheme.radius.md,
    padding: 14,
  },
  input: {
    borderRadius: mobileTheme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: mobileTheme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    color: mobileTheme.colors.textStrong,
  },
  multiline: { minHeight: 84, textAlignVertical: 'top' },
  uploadCard: {
    gap: 6,
    padding: 16,
    borderRadius: mobileTheme.radius.md,
    backgroundColor: mobileTheme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
  },
  uploadTitle: {
    color: mobileTheme.colors.textStrong,
    fontWeight: '700',
  },
  uploadCopy: {
    color: mobileTheme.colors.textMuted,
    lineHeight: 18,
    fontSize: 12,
  },
  avatarPreview: {
    width: 92,
    height: 92,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
  },
  primaryButton: {
    alignItems: 'center',
    borderRadius: mobileTheme.radius.md,
    paddingVertical: 14,
    backgroundColor: mobileTheme.colors.textStrong,
  },
  primaryButtonLabel: { color: mobileTheme.colors.white, fontWeight: '800' },
  secondaryButton: {
    flex: 1,
    alignItems: 'center',
    borderRadius: mobileTheme.radius.md,
    paddingVertical: 12,
    backgroundColor: mobileTheme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
  },
  secondaryButtonLabel: { color: mobileTheme.colors.textStrong, fontWeight: '700', fontSize: 12 },
  row: { flexDirection: 'row', gap: 10 },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: mobileTheme.colors.border,
  },
  toggleLabel: { color: mobileTheme.colors.textStrong, fontWeight: '700' },
  toggleValue: { color: mobileTheme.colors.textMuted, fontWeight: '700' },
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: mobileTheme.colors.border,
  },
  sessionRow: {
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: mobileTheme.colors.border,
  },
  sessionCopy: {
    gap: 4,
  },
  sessionButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: mobileTheme.radius.md,
    backgroundColor: mobileTheme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
  },
  sessionButtonLabel: {
    color: mobileTheme.colors.textStrong,
    fontSize: 12,
    fontWeight: '700',
  },
  disabled: { opacity: 0.45 },
});
