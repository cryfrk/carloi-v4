'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  MediaAssetPurpose,
  type AuthSessionDevice,
  type CommercialApplicationView,
  type SettingsMeResponse,
} from '@carloi-v4/types';
import { AppShell } from './app-shell';
import { useAuth } from './auth-provider';
import { webAuthApi } from '../lib/auth-api';
import { webCommercialApi } from '../lib/commercial-api';
import { webMediaApi } from '../lib/media-api';
import { webProfileApi } from '../lib/profile-api';

export function SettingsClient() {
  const router = useRouter();
  const { session, sessions, isReady, switchAccount, signOut, signOutAll } = useAuth();
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
      webProfileApi.getSettings(session.accessToken),
      webCommercialApi.getOwnApplication(session.accessToken),
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

    const response = await webProfileApi.getSettings(session.accessToken);
    setSettings(response);
    setPrivacy(response.privacy);
  }

  async function reloadSessionDevices(accessToken = session?.accessToken) {
    if (!accessToken) {
      return;
    }

    setSessionDevicesLoading(true);

    try {
      const response = await webAuthApi.getSessions(accessToken);
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
      await webAuthApi.revokeSession(session.accessToken, device.id);
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
      await webProfileApi.updateSettingsProfile(session.accessToken, {
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
      await webProfileApi.updatePrivacy(session.accessToken, privacy);
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
      const response = await webProfileApi.changePassword(session.accessToken, passwordForm);
      setNotice(response.message ?? 'Sifre guncellendi.');
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
      const response = await webCommercialApi.submit(session.accessToken, {
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

  async function handleAvatarUpload(event: React.ChangeEvent<HTMLInputElement>) {
    if (!session?.accessToken) {
      return;
    }

    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setAvatarUploading(true);
    setErrorMessage(null);

    try {
      const upload = await webMediaApi.uploadFile(
        session.accessToken,
        file,
        MediaAssetPurpose.PROFILE_AVATAR,
      );
      setProfileForm((current) => ({
        ...current,
        avatarUrl: upload.url,
      }));
      setAvatarMediaAssetId(upload.id);
      setNotice('Profil gorseli yuklendi.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Profil gorseli yuklenemedi.');
    } finally {
      setAvatarUploading(false);
      event.target.value = '';
    }
  }

  async function handleTaxDocumentUpload(event: React.ChangeEvent<HTMLInputElement>) {
    if (!session?.accessToken) {
      return;
    }

    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setTaxDocumentUploading(true);
    setErrorMessage(null);

    try {
      const upload = await webMediaApi.uploadFile(
        session.accessToken,
        file,
        MediaAssetPurpose.COMMERCIAL_DOCUMENT,
      );
      setTaxDocumentUrl(upload.url);
      setTaxDocumentMediaAssetId(upload.id);
      setNotice('Vergi levhasi yuklendi.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Vergi levhasi yuklenemedi.');
    } finally {
      setTaxDocumentUploading(false);
      event.target.value = '';
    }
  }

  async function handleOtherDocumentsUpload(event: React.ChangeEvent<HTMLInputElement>) {
    if (!session?.accessToken) {
      return;
    }

    const files = event.target.files;

    if (!files?.length) {
      return;
    }

    setOtherDocumentsUploading(true);
    setErrorMessage(null);

    try {
      const uploads = await webMediaApi.uploadFiles(
        session.accessToken,
        files,
        MediaAssetPurpose.COMMERCIAL_DOCUMENT,
      );
      setOtherDocumentUrlsText((current) =>
        [...current.split(/\r?\n/).map((item) => item.trim()).filter(Boolean), ...uploads.map((item) => item.url)].join(
          '\n',
        ),
      );
      setNotice(`${uploads.length} ek belge yuklendi.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Ek belgeler yuklenemedi.');
    } finally {
      setOtherDocumentsUploading(false);
      event.target.value = '';
    }
  }

  function formatSessionMeta(device: AuthSessionDevice) {
    return [device.deviceName ?? device.platform ?? 'Carloi Device', device.platform, device.approximateLocation, device.ip]
      .filter(Boolean)
      .join(' | ');
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
    <AppShell>
      <section className="settings-stack">
        <article className="settings-card settings-hero">
          <div>
            <div className="settings-kicker">Ayarlar</div>
            <h2>Profil, gizlilik ve hesap merkezi</h2>
            <p>Instagram benzeri hesap deneyimini Carloi'nin ilan, sigorta ve sosyal akislariyla ayni yerde yonet.</p>
          </div>
          {session ? (
            <div className="settings-badge">
              <strong>@{session.user.username}</strong>
              <span>{session.user.userType === 'COMMERCIAL' ? 'Ticari hesap' : 'Bireysel hesap'}</span>
            </div>
          ) : null}
        </article>

        {!isReady ? (
          <article className="settings-card"><p>Oturum kontrol ediliyor...</p></article>
        ) : !session ? (
          <article className="settings-card"><p>Ayarlari gormek icin giris yapin.</p></article>
        ) : (
          <>
            {notice ? <div className="settings-inline success">{notice}</div> : null}
            {errorMessage ? <div className="settings-inline error">{errorMessage}</div> : null}

            <div className="settings-grid">
              <article className="settings-card">
                <div className="settings-card-head">
                  <div>
                    <div className="settings-kicker">Hesap merkezi</div>
                    <h3>Ozet</h3>
                  </div>
                </div>
                <div className="settings-status-list">
                  <div><strong>Aktif oturum</strong><span>{sessionDevices.length || settings?.accountCenter.activeSessionCount || sessions.length}</span></div>
                  <div><strong>Kaydedilen gonderi</strong><span>{settings?.accountCenter.savedPostsCount ?? 0}</span></div>
                  <div><strong>Kaydedilen ilan</strong><span>{settings?.accountCenter.savedListingsCount ?? 0}</span></div>
                </div>
                <div className="gate-actions">
                  <a className="secondary-link" href="/saved">Kaydedilenler</a>
                  <a className="secondary-link" href="/login">Hesap ekle</a>
                </div>
              </article>

              <article className="settings-card">
                <div className="settings-card-head">
                  <div>
                    <div className="settings-kicker">Sessions</div>
                    <h3>Aktif cihazlar</h3>
                  </div>
                </div>
                {sessionDevicesLoading ? <p>Cihaz oturumlari getiriliyor...</p> : null}
                {!sessionDevicesLoading && sessionDevices.length === 0 ? <p>Bu hesaba bagli aktif cihaz bulunamadi.</p> : null}
                <div className="settings-stack compact">
                  {sessionDevices.map((device) => (
                    <div key={device.id} className="session-device-row">
                      <div className="session-device-copy">
                        <strong>
                          {device.deviceName ?? device.platform ?? 'Carloi Device'}
                          {device.isCurrent ? ' · Bu cihaz' : ''}
                        </strong>
                        <span>{formatSessionMeta(device)}</span>
                        <span>Son gorulme: {formatSessionDate(device.lastSeenAt)}</span>
                      </div>
                      <button className="secondary-link subtle-button" type="button" onClick={() => void handleRevokeSession(device)}>
                        {device.isCurrent ? 'Cikis yap' : 'Cihazi kapat'}
                      </button>
                    </div>
                  ))}
                </div>
              </article>

              <article className="settings-card settings-form-card">
                <div className="settings-card-head">
                  <div>
                    <div className="settings-kicker">Profil</div>
                    <h3>Profil bilgilerini duzenle</h3>
                  </div>
                </div>
                <div className="settings-form-grid">
                  <label className="settings-field"><span>Ad</span><input value={profileForm.firstName} onChange={(event) => setProfileForm((current) => ({ ...current, firstName: event.target.value }))} /></label>
                  <label className="settings-field"><span>Soyad</span><input value={profileForm.lastName} onChange={(event) => setProfileForm((current) => ({ ...current, lastName: event.target.value }))} /></label>
                  <label className="settings-field"><span>Kullanici adi</span><input value={profileForm.username} onChange={(event) => setProfileForm((current) => ({ ...current, username: event.target.value }))} /></label>
                  <div className="settings-field settings-field-wide">
                    <span>Profil gorseli</span>
                    <label className="upload-dropzone">
                      <input className="upload-input-hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void handleAvatarUpload(event)} />
                      <strong className="upload-dropzone-title">{avatarUploading ? 'Avatar yukleniyor...' : 'Avatar yukle'}</strong>
                      <span className="upload-dropzone-copy">JPG, PNG veya WEBP sec. URL ve avatar alanlari otomatik guncellenir.</span>
                    </label>
                    {profileForm.avatarUrl ? (
                      <div className="story-strip-row">
                        <div className="story-avatar-shell">
                          <img className="story-avatar-image" src={profileForm.avatarUrl} alt="Avatar preview" />
                        </div>
                        <span className="nav-meta">{profileForm.avatarUrl}</span>
                      </div>
                    ) : null}
                  </div>
                  <label className="settings-field settings-field-wide"><span>Bio</span><textarea rows={3} value={profileForm.bio} onChange={(event) => setProfileForm((current) => ({ ...current, bio: event.target.value }))} /></label>
                  <label className="settings-field settings-field-wide"><span>Website</span><input value={profileForm.websiteUrl} onChange={(event) => setProfileForm((current) => ({ ...current, websiteUrl: event.target.value }))} /></label>
                  <label className="settings-field settings-field-wide"><span>Konum</span><input value={profileForm.locationText} onChange={(event) => setProfileForm((current) => ({ ...current, locationText: event.target.value }))} /></label>
                </div>
                <button className="settings-submit" type="button" onClick={() => void handleProfileSave()}>Profili kaydet</button>
              </article>
            </div>

            <div className="settings-grid">
              <article className="settings-card">
                <div className="settings-card-head"><div><div className="settings-kicker">Gizlilik</div><h3>Hesap gizliligi</h3></div></div>
                <div className="settings-toggle-list">
                  <button className="toggle-row" type="button" onClick={() => setPrivacy((current) => ({ ...current, isPrivate: !current.isPrivate }))}><span>Gizli hesap</span><strong>{privacy.isPrivate ? 'Acik' : 'Kapali'}</strong></button>
                  <button className="toggle-row" type="button" onClick={() => setPrivacy((current) => ({ ...current, showGarageVehicles: !current.showGarageVehicles }))}><span>Garaj araclarini goster</span><strong>{privacy.showGarageVehicles ? 'Acik' : 'Kapali'}</strong></button>
                </div>
                <button className="settings-submit" type="button" onClick={() => void handlePrivacySave()}>Gizliligi kaydet</button>
              </article>

              <article className="settings-card settings-form-card">
                <div className="settings-card-head"><div><div className="settings-kicker">Guvenlik</div><h3>Sifre degistir</h3></div></div>
                <div className="settings-form-grid">
                  <label className="settings-field settings-field-wide"><span>Mevcut sifre</span><input type="password" value={passwordForm.oldPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, oldPassword: event.target.value }))} /></label>
                  <label className="settings-field"><span>Yeni sifre</span><input type="password" value={passwordForm.newPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))} /></label>
                  <label className="settings-field"><span>Yeni sifre tekrar</span><input type="password" value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))} /></label>
                </div>
                <button className="settings-submit" type="button" onClick={() => void handlePasswordChange()}>Sifreyi guncelle</button>
              </article>
            </div>

            <div className="settings-grid">
              <article className="settings-card settings-form-card">
                <div className="settings-card-head"><div><div className="settings-kicker">Commercial</div><h3>Ticari hesaba gec</h3></div></div>
                <div className="settings-inline info">Durum: {application?.status ?? (isApproved ? 'APPROVED' : 'NONE')}</div>
                {application?.rejectionReason ? <div className="settings-inline error">Red nedeni: {application.rejectionReason}</div> : null}
                <div className="settings-form-grid">
                  <label className="settings-field"><span>Firma unvani</span><input value={companyTitle} onChange={(event) => setCompanyTitle(event.target.value)} disabled={hasPendingApplication || Boolean(isApproved)} /></label>
                  <label className="settings-field"><span>Vergi numarasi</span><input value={taxNumber} onChange={(event) => setTaxNumber(event.target.value)} disabled={hasPendingApplication || Boolean(isApproved)} /></label>
                  <label className="settings-field"><span>TC kimlik no</span><input value={tcIdentityNo} onChange={(event) => setTcIdentityNo(event.target.value)} disabled={hasPendingApplication || Boolean(isApproved)} /></label>
                  <div className="settings-field settings-field-wide">
                    <span>Vergi levhasi</span>
                    <label className="upload-dropzone">
                      <input className="upload-input-hidden" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => void handleTaxDocumentUpload(event)} disabled={hasPendingApplication || Boolean(isApproved)} />
                      <strong className="upload-dropzone-title">{taxDocumentUploading ? 'Vergi levhasi yukleniyor...' : 'Vergi levhasi yukle'}</strong>
                      <span className="upload-dropzone-copy">PDF veya gorsel sec. Belge private olarak saklanir.</span>
                    </label>
                    <input value={taxDocumentUrl} onChange={(event) => setTaxDocumentUrl(event.target.value)} disabled={hasPendingApplication || Boolean(isApproved)} />
                  </div>
                  <div className="settings-field settings-field-wide">
                    <span>Diger belgeler</span>
                    <label className="upload-dropzone">
                      <input className="upload-input-hidden" type="file" multiple accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => void handleOtherDocumentsUpload(event)} disabled={hasPendingApplication || Boolean(isApproved)} />
                      <strong className="upload-dropzone-title">{otherDocumentsUploading ? 'Belgeler yukleniyor...' : 'Ek belge yukle'}</strong>
                      <span className="upload-dropzone-copy">Yuklenen belgeler asagidaki listeye otomatik eklenir.</span>
                    </label>
                    <textarea rows={3} value={otherDocumentUrlsText} onChange={(event) => setOtherDocumentUrlsText(event.target.value)} disabled={hasPendingApplication || Boolean(isApproved)} />
                  </div>
                  <label className="settings-field settings-field-wide"><span>Ek not</span><textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} disabled={hasPendingApplication || Boolean(isApproved)} /></label>
                </div>
                <button className="settings-submit" type="button" disabled={hasPendingApplication || Boolean(isApproved)} onClick={() => void handleCommercialSubmit()}>Basvuruyu gonder</button>
              </article>

              <article className="settings-card">
                <div className="settings-card-head"><div><div className="settings-kicker">Accounts</div><h3>Hesap degistir</h3></div></div>
                <div className="settings-stack">
                  {sessions.map((item) => (
                    <button key={item.user.id} className="account-switch-row" type="button" onClick={() => switchAccount(item.user.id)}>
                      <div>
                        <strong>@{item.user.username}</strong>
                        <span>{item.user.firstName} {item.user.lastName}</span>
                      </div>
                      <span>{session.user.id === item.user.id ? 'Aktif' : 'Gec'}</span>
                    </button>
                  ))}
                </div>
                <div className="gate-actions">
                  <button className="secondary-link button-reset" type="button" onClick={() => void signOut()}>Bu hesaptan cik</button>
                  <button className="secondary-link button-reset" type="button" onClick={() => void signOutAll()}>Tum hesaplardan cik</button>
                </div>
              </article>
            </div>
          </>
        )}
      </section>
    </AppShell>
  );
}
