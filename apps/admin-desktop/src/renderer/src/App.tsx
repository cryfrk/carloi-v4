import { useEffect, useMemo, useState } from 'react';
import { MediaAssetPurpose } from '@carloi-v4/types';
import type {
  AdminAuditLogItem,
  AdminDashboardResponse,
  AdminListingDetail,
  AdminListingListItem,
  AdminLoginResponse,
  AdminPaymentItem,
  AdminUserDetail,
  AdminUserListItem,
  CommercialApplicationView,
  InsuranceRequestView,
  ListingStatus,
} from '@carloi-v4/types';
import { adminDesktopApi } from './api';

type AdminSession = AdminLoginResponse;
type ScreenSlug =
  | 'dashboard'
  | 'users'
  | 'listings'
  | 'commercial-approvals'
  | 'insurance-requests'
  | 'payments'
  | 'audit-logs';

const STORAGE_KEY = 'carloi-v4-admin-session';
const ROLE_PRESETS = {
  SUPER_ADMIN: 'superadmin',
  INSURANCE_ADMIN: 'insuranceadmin',
  COMMERCIAL_ADMIN: 'commercialadmin',
} as const;

const SCREEN_META: Record<ScreenSlug, { label: string; eyebrow: string; description: string }> = {
  dashboard: {
    label: 'Dashboard',
    eyebrow: 'Operations Core',
    description: 'Rol bazli KPI ve operasyonel kuyruklar.',
  },
  users: {
    label: 'Users',
    eyebrow: 'Trust & Safety',
    description: 'Kullanici arama, inceleme ve durum guncelleme ekrani.',
  },
  listings: {
    label: 'Listings',
    eyebrow: 'Marketplace Moderation',
    description: 'Ilan moderasyonu ve durum aksiyonlari.',
  },
  'commercial-approvals': {
    label: 'Commercial Approvals',
    eyebrow: 'B2B Workflow',
    description: 'Ticari hesap basvurulari ve onay operasyonu.',
  },
  'insurance-requests': {
    label: 'Insurance Requests',
    eyebrow: 'Insurance Ops',
    description: 'Sigorta teklif, odeme ve belge akisi.',
  },
  payments: {
    label: 'Payments',
    eyebrow: 'Finance Layer',
    description: 'Odeme gecmisi ve saglayici detaylari.',
  },
  'audit-logs': {
    label: 'Audit Logs',
    eyebrow: 'Governance Layer',
    description: 'Tum kritik admin aksiyonlarinin iz kaydi.',
  },
};

export default function App() {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [selectedRole, setSelectedRole] = useState<keyof typeof ROLE_PRESETS>('INSURANCE_ADMIN');
  const [username, setUsername] = useState<string>(ROLE_PRESETS.INSURANCE_ADMIN);
  const [password, setPassword] = useState('');
  const [activeSlug, setActiveSlug] = useState<ScreenSlug>('insurance-requests');
  const [notice, setNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [dashboard, setDashboard] = useState<AdminDashboardResponse | null>(null);

  const [insuranceRequests, setInsuranceRequests] = useState<InsuranceRequestView[]>([]);
  const [activeInsuranceRequestId, setActiveInsuranceRequestId] = useState<string | null>(null);
  const [activeInsuranceRequest, setActiveInsuranceRequest] = useState<InsuranceRequestView | null>(
    null,
  );
  const [offerAmount, setOfferAmount] = useState('');
  const [offerFileUrl, setOfferFileUrl] = useState('');
  const [policyDocumentUrl, setPolicyDocumentUrl] = useState('');
  const [invoiceDocumentUrl, setInvoiceDocumentUrl] = useState('');

  const [commercialApplications, setCommercialApplications] = useState<CommercialApplicationView[]>(
    [],
  );
  const [activeCommercialApplicationId, setActiveCommercialApplicationId] = useState<string | null>(
    null,
  );
  const [activeCommercialApplication, setActiveCommercialApplication] =
    useState<CommercialApplicationView | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [activeUser, setActiveUser] = useState<AdminUserDetail | null>(null);
  const [userSearch, setUserSearch] = useState('');

  const [listings, setListings] = useState<AdminListingListItem[]>([]);
  const [activeListingId, setActiveListingId] = useState<string | null>(null);
  const [activeListing, setActiveListing] = useState<AdminListingDetail | null>(null);
  const [listingSearch, setListingSearch] = useState('');
  const [listingStatus, setListingStatus] = useState<AdminListingDetail['listingStatus']>(
    'ACTIVE' as AdminListingDetail['listingStatus'],
  );
  const [listingReason, setListingReason] = useState('');

  const [payments, setPayments] = useState<AdminPaymentItem[]>([]);
  const [activePaymentId, setActivePaymentId] = useState<string | null>(null);
  const [activePayment, setActivePayment] = useState<AdminPaymentItem | null>(null);

  const [auditLogs, setAuditLogs] = useState<AdminAuditLogItem[]>([]);
  const [auditActorFilter, setAuditActorFilter] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('');
  const [auditEntityTypeFilter, setAuditEntityTypeFilter] = useState('');

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return;
    }

    try {
      const nextSession = JSON.parse(raw) as AdminSession;
      setSession(nextSession);
      setActiveSlug(defaultScreenForRole(nextSession.admin.role));
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const visibleScreens = useMemo<ScreenSlug[]>(() => {
    if (!session) {
      return [];
    }

    if (session.admin.role === 'INSURANCE_ADMIN') {
      return ['dashboard', 'insurance-requests'];
    }

    if (session.admin.role === 'COMMERCIAL_ADMIN') {
      return ['dashboard', 'commercial-approvals', 'users'];
    }

    return [
      'dashboard',
      'users',
      'listings',
      'commercial-approvals',
      'insurance-requests',
      'payments',
      'audit-logs',
    ];
  }, [session]);

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    if (activeSlug === 'dashboard') {
      void adminDesktopApi.getDashboard(session.accessToken).then(setDashboard).catch(handleError);
    }

    if (activeSlug === 'insurance-requests') {
      void refreshInsuranceRequests();
    }

    if (activeSlug === 'commercial-approvals') {
      void refreshCommercialApplications();
    }

    if (activeSlug === 'users') {
      void refreshUsers();
    }

    if (activeSlug === 'listings') {
      void refreshListings();
    }

    if (activeSlug === 'payments') {
      void refreshPayments();
    }

    if (activeSlug === 'audit-logs') {
      void refreshAuditLogs();
    }
  }, [activeSlug, session?.accessToken]);

  useEffect(() => {
    if (!session?.accessToken || !activeInsuranceRequestId || activeSlug !== 'insurance-requests') {
      setActiveInsuranceRequest(null);
      return;
    }

    void adminDesktopApi
      .getInsuranceRequest(session.accessToken, activeInsuranceRequestId)
      .then((response) => {
        setActiveInsuranceRequest(response);
        setOfferAmount(response.currentOffer ? response.currentOffer.amount.toString() : '');
        setOfferFileUrl(response.currentOffer?.offerFileUrl ?? '');
        setPolicyDocumentUrl(
          response.documents.find((item) => item.documentType === 'POLICY')?.fileUrl ?? '',
        );
        setInvoiceDocumentUrl(
          response.documents.find((item) => item.documentType === 'INVOICE')?.fileUrl ?? '',
        );
      })
      .catch(handleError);
  }, [activeInsuranceRequestId, activeSlug, session?.accessToken]);

  useEffect(() => {
    if (
      !session?.accessToken ||
      !activeCommercialApplicationId ||
      activeSlug !== 'commercial-approvals'
    ) {
      setActiveCommercialApplication(null);
      return;
    }

    void adminDesktopApi
      .getCommercialApplication(session.accessToken, activeCommercialApplicationId)
      .then((response) => {
        setActiveCommercialApplication(response);
        setRejectionReason(response.rejectionReason ?? '');
      })
      .catch(handleError);
  }, [activeCommercialApplicationId, activeSlug, session?.accessToken]);

  useEffect(() => {
    if (!session?.accessToken || !activeUserId || activeSlug !== 'users') {
      setActiveUser(null);
      return;
    }

    void adminDesktopApi.getUser(session.accessToken, activeUserId).then(setActiveUser).catch(handleError);
  }, [activeSlug, activeUserId, session?.accessToken]);

  useEffect(() => {
    if (!session?.accessToken || !activeListingId || activeSlug !== 'listings') {
      setActiveListing(null);
      return;
    }

    void adminDesktopApi
      .getListing(session.accessToken, activeListingId)
      .then((response) => {
        setActiveListing(response);
        setListingStatus(response.listingStatus);
        setListingReason(response.suspensionReason ?? '');
      })
      .catch(handleError);
  }, [activeListingId, activeSlug, session?.accessToken]);

  useEffect(() => {
    if (!session?.accessToken || !activePaymentId || activeSlug !== 'payments') {
      setActivePayment(null);
      return;
    }

    void adminDesktopApi
      .getPayment(session.accessToken, activePaymentId)
      .then(setActivePayment)
      .catch(handleError);
  }, [activePaymentId, activeSlug, session?.accessToken]);

  function handleError(error: unknown) {
    setErrorMessage(error instanceof Error ? error.message : 'Islem tamamlanamadi.');
  }

  async function handleLogin() {
    try {
      const nextSession = await adminDesktopApi.login(username.trim().toLowerCase(), password);
      setSession(nextSession);
      setActiveSlug(defaultScreenForRole(nextSession.admin.role));
      setErrorMessage(null);
      setNotice(null);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
    } catch (error) {
      handleError(error);
    }
  }

  async function handleLogout() {
    const currentSession = session;
    setSession(null);
    window.localStorage.removeItem(STORAGE_KEY);

    if (currentSession) {
      try {
        await adminDesktopApi.logout(currentSession.accessToken, currentSession.refreshToken);
      } catch {
        // Ignore logout transport errors on client-side signout.
      }
    }
  }

  async function refreshInsuranceRequests(focusId?: string | null) {
    if (!session?.accessToken) {
      return;
    }

    const response = await adminDesktopApi.getInsuranceRequests(session.accessToken);
    setInsuranceRequests(response.items);
    setActiveInsuranceRequestId(focusId ?? response.items[0]?.id ?? null);
  }

  async function refreshCommercialApplications(focusId?: string | null) {
    if (!session?.accessToken) {
      return;
    }

    const response = await adminDesktopApi.getCommercialApplications(session.accessToken);
    setCommercialApplications(response.items);
    setActiveCommercialApplicationId(focusId ?? response.items[0]?.id ?? null);
  }

  async function refreshUsers(focusId?: string | null) {
    if (!session?.accessToken) {
      return;
    }

    const response = await adminDesktopApi.getUsers(session.accessToken, {
      username: userSearch || undefined,
    });
    setUsers(response.items);
    setActiveUserId(focusId ?? response.items[0]?.id ?? null);
  }

  async function refreshListings(focusId?: string | null) {
    if (!session?.accessToken) {
      return;
    }

    const response = await adminDesktopApi.getListings(session.accessToken, {
      search: listingSearch || undefined,
    });
    setListings(response.items);
    setActiveListingId(focusId ?? response.items[0]?.id ?? null);
  }

  async function refreshPayments(focusId?: string | null) {
    if (!session?.accessToken) {
      return;
    }

    const response = await adminDesktopApi.getPayments(session.accessToken);
    setPayments(response.items);
    setActivePaymentId(focusId ?? response.items[0]?.id ?? null);
  }

  async function refreshAuditLogs() {
    if (!session?.accessToken) {
      return;
    }

    const response = await adminDesktopApi.getAuditLogs(session.accessToken, {
      actor: auditActorFilter || undefined,
      action: auditActionFilter || undefined,
      entityType: auditEntityTypeFilter || undefined,
    });
    setAuditLogs(response.items);
  }

  async function handleCreateOffer() {
    if (!session?.accessToken || !activeInsuranceRequestId || !offerAmount.trim()) {
      return;
    }

    try {
      await adminDesktopApi.createOffer(session.accessToken, activeInsuranceRequestId, {
        amount: Number(offerAmount),
        currency: 'TRY',
        offerFileUrl: offerFileUrl || undefined,
      });
      setNotice('Teklif kullaniciya gonderildi.');
      await refreshInsuranceRequests(activeInsuranceRequestId);
    } catch (error) {
      handleError(error);
    }
  }

  async function handleUploadDocuments() {
    if (!session?.accessToken || !activeInsuranceRequestId) {
      return;
    }

    try {
      await adminDesktopApi.uploadDocuments(session.accessToken, activeInsuranceRequestId, {
        policyDocumentUrl: policyDocumentUrl || undefined,
        invoiceDocumentUrl: invoiceDocumentUrl || undefined,
      });
      setNotice('Police ve fatura baglandi.');
      await refreshInsuranceRequests(activeInsuranceRequestId);
    } catch (error) {
      handleError(error);
    }
  }

  async function handleInsuranceFileUpload(
    event: React.ChangeEvent<HTMLInputElement>,
    purpose: MediaAssetPurpose,
    setter: (value: string) => void,
    successMessage: string,
  ) {
    if (!session?.accessToken) {
      return;
    }

    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const upload = await adminDesktopApi.uploadMedia(session.accessToken, file, purpose);
      setter(upload.url);
      setNotice(successMessage);
    } catch (error) {
      handleError(error);
    } finally {
      event.target.value = '';
    }
  }

  async function handleApproveCommercialApplication() {
    if (!session?.accessToken || !activeCommercialApplicationId) {
      return;
    }

    try {
      await adminDesktopApi.approveCommercialApplication(
        session.accessToken,
        activeCommercialApplicationId,
      );
      setNotice('Ticari basvuru onaylandi.');
      await refreshCommercialApplications(activeCommercialApplicationId);
    } catch (error) {
      handleError(error);
    }
  }

  async function handleRejectCommercialApplication() {
    if (!session?.accessToken || !activeCommercialApplicationId || !rejectionReason.trim()) {
      return;
    }

    try {
      await adminDesktopApi.rejectCommercialApplication(
        session.accessToken,
        activeCommercialApplicationId,
        {
          rejectionReason,
        },
      );
      setNotice('Ticari basvuru reddedildi.');
      await refreshCommercialApplications(activeCommercialApplicationId);
    } catch (error) {
      handleError(error);
    }
  }

  async function handleToggleUserStatus(nextIsActive: boolean) {
    if (!session?.accessToken || !activeUserId) {
      return;
    }

    try {
      await adminDesktopApi.updateUserStatus(session.accessToken, activeUserId, {
        isActive: nextIsActive,
      });
      setNotice(nextIsActive ? 'Kullanici tekrar aktif edildi.' : 'Kullanici pasiflestirildi.');
      await refreshUsers(activeUserId);
    } catch (error) {
      handleError(error);
    }
  }

  async function handleUpdateListingStatus() {
    if (!session?.accessToken || !activeListingId) {
      return;
    }

    try {
      await adminDesktopApi.updateListingStatus(session.accessToken, activeListingId, {
        listingStatus,
        reason: listingReason || undefined,
      });
      setNotice('Ilan durumu guncellendi.');
      await refreshListings(activeListingId);
    } catch (error) {
      handleError(error);
    }
  }

  if (!session) {
    return (
      <div className="desktop-shell single-column">
        <main className="desktop-main centered-main">
          <section className="panel login-panel">
            <p className="eyebrow">Carloi V4 Admin</p>
            <h2>Rol bazli admin girisi</h2>
            <p className="copy">
              Super, insurance ve commercial ekipleri ayni guvenli auth zinciriyle baglanir.
            </p>
            <div className="chip-row">
              {Object.entries(ROLE_PRESETS).map(([role, preset]) => (
                <button
                  key={role}
                  type="button"
                  className="chip-button"
                  data-active={selectedRole === role}
                  onClick={() => {
                    setSelectedRole(role as keyof typeof ROLE_PRESETS);
                    setUsername(preset);
                  }}
                >
                  {role}
                </button>
              ))}
            </div>
            {errorMessage ? <div className="inline-banner error">{errorMessage}</div> : null}
            <label className="field">
              <span>Kullanici adi</span>
              <input value={username} onChange={(event) => setUsername(event.target.value)} />
            </label>
            <label className="field">
              <span>Sifre</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <button
              className="nav-button action-fill"
              type="button"
              onClick={() => void handleLogin()}
            >
              Admin panele gir
            </button>
          </section>
        </main>
      </div>
    );
  }

  const activeMeta = SCREEN_META[activeSlug];

  return (
    <div className="desktop-shell">
      <aside className="desktop-sidebar">
        <div>
          <p className="eyebrow">Carloi V4 Admin</p>
          <h1>Operations console</h1>
          <p className="copy">
            {session.admin.role} rolune uygun ekranlar ve aksiyonlar burada toplanir.
          </p>
        </div>
        <nav className="desktop-nav">
          {visibleScreens.map((screen) => (
            <button
              key={screen}
              type="button"
              className="nav-button"
              data-active={screen === activeSlug}
              onClick={() => setActiveSlug(screen)}
            >
              <span>{SCREEN_META[screen].label}</span>
              <small>{SCREEN_META[screen].eyebrow}</small>
            </button>
          ))}
        </nav>
        <div className="runtime-card">
          <span>Admin</span>
          <strong>@{session.admin.username}</strong>
          <small>{session.admin.role}</small>
        </div>
        <button type="button" className="nav-button" onClick={() => void handleLogout()}>
          <span>Cikis yap</span>
          <small>Oturumu guvenli kapat</small>
        </button>
      </aside>

      <main className="desktop-main">
        <section className="hero-panel">
          <p className="eyebrow">{activeMeta.eyebrow}</p>
          <h2>{activeMeta.label}</h2>
          <p className="copy">{activeMeta.description}</p>
        </section>

        {notice ? <div className="inline-banner success">{notice}</div> : null}
        {errorMessage ? <div className="inline-banner error">{errorMessage}</div> : null}

        {activeSlug === 'dashboard' ? (
          <section className="ops-section">
            <div className="metric-panel-grid">
              {(dashboard?.metrics ?? []).map((metric) => (
                <article key={metric.key} className="summary-box">
                  <span className="panel-kicker">KPI</span>
                  <h3>{metric.label}</h3>
                  <p className="metric-value-large">
                    {typeof metric.value === 'number'
                      ? metric.value.toLocaleString('tr-TR')
                      : metric.value}
                  </p>
                </article>
              ))}
            </div>

            {dashboard?.recentAuditLogs?.length ? (
              <article className="panel">
                <div className="panel-head">
                  <div>
                    <span className="panel-kicker">Governance</span>
                    <h3>Son audit kayitlari</h3>
                  </div>
                </div>
                <div className="log-list">
                  {dashboard.recentAuditLogs.map((log) => (
                    <div key={log.id} className="log-row">
                      <strong>{log.action}</strong>
                      <span>
                        {log.entityType} / {log.entityId}
                      </span>
                      <small>{log.actor ? `${log.actor.type}: ${log.actor.username}` : 'Sistem'}</small>
                    </div>
                  ))}
                </div>
              </article>
            ) : null}
          </section>
        ) : null}

        {activeSlug === 'insurance-requests' ? (
          <section className="ops-layout">
            <div className="panel list-column">
              <div className="panel-head">
                <div>
                  <span className="panel-kicker">Queue</span>
                  <h3>Sigorta talepleri</h3>
                </div>
                <strong>{insuranceRequests.length}</strong>
              </div>
              <div className="entity-list">
                {insuranceRequests.map((request) => (
                  <button
                    key={request.id}
                    type="button"
                    className="entity-row"
                    data-active={request.id === activeInsuranceRequestId}
                    onClick={() => setActiveInsuranceRequestId(request.id)}
                  >
                    <strong>{request.listing.title}</strong>
                    <span>{request.status}</span>
                    <small>
                      {request.currentOffer
                        ? `${request.currentOffer.amount.toLocaleString('tr-TR')} ${
                            request.currentOffer.currency
                          }`
                        : 'Teklif yok'}
                    </small>
                  </button>
                ))}
              </div>
            </div>

            <div className="panel detail-column">
              {!activeInsuranceRequest ? (
                <div className="empty-state">
                  <h3>Talep secin</h3>
                  <p>Soldaki listeden bir talep secin.</p>
                </div>
              ) : (
                <div className="stack-grid">
                  <div className="info-grid-two">
                    <article className="summary-box">
                      <span className="panel-kicker">Buyer</span>
                      <h3>{activeInsuranceRequest.buyer.fullName}</h3>
                      <p>@{activeInsuranceRequest.buyer.username}</p>
                      <p>{activeInsuranceRequest.buyer.phoneMasked ?? '-'}</p>
                    </article>
                    <article className="summary-box">
                      <span className="panel-kicker">Seller</span>
                      <h3>{activeInsuranceRequest.seller.fullName}</h3>
                      <p>@{activeInsuranceRequest.seller.username}</p>
                      <p>{activeInsuranceRequest.seller.phoneMasked ?? '-'}</p>
                    </article>
                    <article className="summary-box">
                      <span className="panel-kicker">Listing</span>
                      <h3>{activeInsuranceRequest.listing.title}</h3>
                      <p>{activeInsuranceRequest.listing.listingNo}</p>
                      <p>{activeInsuranceRequest.listing.city}</p>
                    </article>
                    <article className="summary-box">
                      <span className="panel-kicker">License</span>
                      <h3>{activeInsuranceRequest.licenseInfo.ownerName ?? '-'}</h3>
                      <p>TC: {activeInsuranceRequest.licenseInfo.maskedTcNo ?? '-'}</p>
                      <p>Plaka: {activeInsuranceRequest.licenseInfo.maskedPlate ?? '-'}</p>
                    </article>
                  </div>

                  <div className="info-grid-three">
                    <article className="summary-box">
                      <span className="panel-kicker">Offer</span>
                      <label className="field">
                        <span>Tutar</span>
                        <input
                          value={offerAmount}
                          onChange={(event) => setOfferAmount(event.target.value)}
                        />
                      </label>
                      <label className="field">
                        <span>Dosya URL</span>
                        <input
                          value={offerFileUrl}
                          onChange={(event) => setOfferFileUrl(event.target.value)}
                        />
                      </label>
                      <label className="field">
                        <span>Teklif dosyasi yukle</span>
                        <input
                          type="file"
                          accept="application/pdf,image/jpeg,image/png,image/webp"
                          onChange={(event) =>
                            void handleInsuranceFileUpload(
                              event,
                              MediaAssetPurpose.INSURANCE_OFFER,
                              setOfferFileUrl,
                              'Teklif dosyasi yuklendi.',
                            )
                          }
                        />
                      </label>
                      <button
                        className="nav-button action-fill"
                        type="button"
                        onClick={() => void handleCreateOffer()}
                      >
                        Teklif gonder
                      </button>
                    </article>

                    <article className="summary-box">
                      <span className="panel-kicker">Payment</span>
                      <h3>{activeInsuranceRequest.payment?.status ?? 'PENDING'}</h3>
                      <p>
                        {activeInsuranceRequest.payment
                          ? `${activeInsuranceRequest.payment.amount.toLocaleString('tr-TR')} ${
                              activeInsuranceRequest.payment.currency
                            }`
                          : 'Odeme, teklif kabul edilince olusur.'}
                      </p>
                      <p>{activeInsuranceRequest.payment?.providerTransactionId ?? 'Ref yok'}</p>
                    </article>

                    <article className="summary-box">
                      <span className="panel-kicker">Documents</span>
                      <label className="field">
                        <span>Police URL</span>
                        <input
                          value={policyDocumentUrl}
                          onChange={(event) => setPolicyDocumentUrl(event.target.value)}
                        />
                      </label>
                      <label className="field">
                        <span>Police dosyasi yukle</span>
                        <input
                          type="file"
                          accept="application/pdf,image/jpeg,image/png,image/webp"
                          onChange={(event) =>
                            void handleInsuranceFileUpload(
                              event,
                              MediaAssetPurpose.INSURANCE_POLICY,
                              setPolicyDocumentUrl,
                              'Police dosyasi yuklendi.',
                            )
                          }
                        />
                      </label>
                      <label className="field">
                        <span>Fatura URL</span>
                        <input
                          value={invoiceDocumentUrl}
                          onChange={(event) => setInvoiceDocumentUrl(event.target.value)}
                        />
                      </label>
                      <label className="field">
                        <span>Fatura dosyasi yukle</span>
                        <input
                          type="file"
                          accept="application/pdf,image/jpeg,image/png,image/webp"
                          onChange={(event) =>
                            void handleInsuranceFileUpload(
                              event,
                              MediaAssetPurpose.INSURANCE_INVOICE,
                              setInvoiceDocumentUrl,
                              'Fatura dosyasi yuklendi.',
                            )
                          }
                        />
                      </label>
                      <button
                        className="nav-button action-fill"
                        type="button"
                        onClick={() => void handleUploadDocuments()}
                      >
                        Belgeleri yukle
                      </button>
                    </article>
                  </div>
                </div>
              )}
            </div>
          </section>
        ) : null}

        {activeSlug === 'commercial-approvals' ? (
          <section className="ops-layout">
            <div className="panel list-column">
              <div className="panel-head">
                <div>
                  <span className="panel-kicker">Queue</span>
                  <h3>Ticari basvurular</h3>
                </div>
                <strong>{commercialApplications.length}</strong>
              </div>
              <div className="entity-list">
                {commercialApplications.map((application) => (
                  <button
                    key={application.id}
                    type="button"
                    className="entity-row"
                    data-active={application.id === activeCommercialApplicationId}
                    onClick={() => setActiveCommercialApplicationId(application.id)}
                  >
                    <strong>{application.companyName}</strong>
                    <span>{application.status}</span>
                    <small>@{application.user.username}</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="panel detail-column">
              {!activeCommercialApplication ? (
                <div className="empty-state">
                  <h3>Basvuru secin</h3>
                  <p>Soldaki listeden bir basvuru secin.</p>
                </div>
              ) : (
                <div className="stack-grid">
                  <div className="info-grid-two">
                    <article className="summary-box">
                      <span className="panel-kicker">Company</span>
                      <h3>{activeCommercialApplication.companyName}</h3>
                      <p>Vergi no: {activeCommercialApplication.taxNumber}</p>
                      <p>{activeCommercialApplication.status}</p>
                    </article>
                    <article className="summary-box">
                      <span className="panel-kicker">User</span>
                      <h3>{activeCommercialApplication.user.fullName}</h3>
                      <p>@{activeCommercialApplication.user.username}</p>
                      <p>TC: {activeCommercialApplication.user.maskedTcIdentityNo ?? '-'}</p>
                    </article>
                  </div>

                  <article className="summary-box">
                    <span className="panel-kicker">Documents</span>
                    <p>Vergi levhasi: {activeCommercialApplication.taxDocumentUrl ?? '-'}</p>
                    <p>
                      Diger belgeler:{' '}
                      {activeCommercialApplication.otherDocumentUrls.length
                        ? activeCommercialApplication.otherDocumentUrls.join(', ')
                        : '-'}
                    </p>
                    <label className="field">
                      <span>Red nedeni</span>
                      <textarea
                        value={rejectionReason}
                        onChange={(event) => setRejectionReason(event.target.value)}
                        rows={4}
                      />
                    </label>
                    <div className="button-row">
                      <button
                        className="nav-button action-fill"
                        type="button"
                        onClick={() => void handleApproveCommercialApplication()}
                      >
                        Onayla
                      </button>
                      <button
                        className="nav-button"
                        type="button"
                        onClick={() => void handleRejectCommercialApplication()}
                      >
                        Reddet
                      </button>
                    </div>
                  </article>
                </div>
              )}
            </div>
          </section>
        ) : null}

        {activeSlug === 'users' ? (
          <section className="ops-layout">
            <div className="panel list-column">
              <div className="panel-head">
                <div>
                  <span className="panel-kicker">Directory</span>
                  <h3>Kullanicilar</h3>
                </div>
                <strong>{users.length}</strong>
              </div>
              <label className="field">
                <span>Kullanici ara</span>
                <input
                  value={userSearch}
                  onChange={(event) => setUserSearch(event.target.value)}
                  placeholder="username"
                />
              </label>
              <button className="nav-button action-fill" type="button" onClick={() => void refreshUsers()}>
                Listeyi yenile
              </button>
              <div className="entity-list">
                {users.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    className="entity-row"
                    data-active={user.id === activeUserId}
                    onClick={() => setActiveUserId(user.id)}
                  >
                    <strong>@{user.username}</strong>
                    <span>{user.fullName}</span>
                    <small>{user.isActive ? 'ACTIVE' : 'DISABLED'}</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="panel detail-column">
              {!activeUser ? (
                <div className="empty-state">
                  <h3>Kullanici secin</h3>
                  <p>Soldaki listeden bir kullanici secin.</p>
                </div>
              ) : (
                <div className="stack-grid">
                  <div className="info-grid-two">
                    <article className="summary-box">
                      <span className="panel-kicker">Identity</span>
                      <h3>{activeUser.fullName}</h3>
                      <p>@{activeUser.username}</p>
                      <p>{activeUser.email ?? '-'}</p>
                      <p>{activeUser.phone ?? '-'}</p>
                    </article>
                    <article className="summary-box">
                      <span className="panel-kicker">Trust</span>
                      <h3>{activeUser.userType}</h3>
                      <p>Verified: {activeUser.isVerified ? 'Yes' : 'No'}</p>
                      <p>Commercial: {activeUser.isCommercialApproved ? 'Approved' : 'No'}</p>
                      <p>Status: {activeUser.isActive ? 'ACTIVE' : 'DISABLED'}</p>
                    </article>
                  </div>

                  <article className="summary-box">
                    <span className="panel-kicker">Moderation</span>
                    <p>TC: {activeUser.tcIdentityNoMasked ?? '-'}</p>
                    <div className="button-row">
                      <button
                        className="nav-button action-fill"
                        type="button"
                        onClick={() => void handleToggleUserStatus(true)}
                      >
                        Aktif et
                      </button>
                      <button
                        className="nav-button"
                        type="button"
                        onClick={() => void handleToggleUserStatus(false)}
                      >
                        Pasiflestir
                      </button>
                    </div>
                  </article>
                </div>
              )}
            </div>
          </section>
        ) : null}

        {activeSlug === 'listings' ? (
          <section className="ops-layout">
            <div className="panel list-column">
              <div className="panel-head">
                <div>
                  <span className="panel-kicker">Marketplace</span>
                  <h3>Ilanlar</h3>
                </div>
                <strong>{listings.length}</strong>
              </div>
              <label className="field">
                <span>Ilan ara</span>
                <input
                  value={listingSearch}
                  onChange={(event) => setListingSearch(event.target.value)}
                  placeholder="baslik veya listing no"
                />
              </label>
              <button className="nav-button action-fill" type="button" onClick={() => void refreshListings()}>
                Listeyi yenile
              </button>
              <div className="entity-list">
                {listings.map((listing) => (
                  <button
                    key={listing.id}
                    type="button"
                    className="entity-row"
                    data-active={listing.id === activeListingId}
                    onClick={() => setActiveListingId(listing.id)}
                  >
                    <strong>{listing.title}</strong>
                    <span>{listing.listingStatus}</span>
                    <small>{listing.listingNo}</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="panel detail-column">
              {!activeListing ? (
                <div className="empty-state">
                  <h3>Ilan secin</h3>
                  <p>Soldaki listeden bir ilan secin.</p>
                </div>
              ) : (
                <div className="stack-grid">
                  <div className="info-grid-two">
                    <article className="summary-box">
                      <span className="panel-kicker">Listing</span>
                      <h3>{activeListing.title}</h3>
                      <p>{activeListing.listingNo}</p>
                      <p>
                        {activeListing.city}
                        {activeListing.district ? ` / ${activeListing.district}` : ''}
                      </p>
                    </article>
                    <article className="summary-box">
                      <span className="panel-kicker">Seller</span>
                      <h3>{activeListing.seller.fullName}</h3>
                      <p>@{activeListing.seller.username}</p>
                      <p>{activeListing.seller.email ?? '-'}</p>
                    </article>
                  </div>

                  <article className="summary-box">
                    <span className="panel-kicker">Moderation</span>
                    <label className="field">
                      <span>Yeni durum</span>
                      <select
                        value={listingStatus}
                        onChange={(event) => setListingStatus(event.target.value as ListingStatus)}
                      >
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="PENDING_LEGAL_CHECK">PENDING_LEGAL_CHECK</option>
                        <option value="SUSPENDED">SUSPENDED</option>
                        <option value="SOLD">SOLD</option>
                        <option value="DELETED">DELETED</option>
                      </select>
                    </label>
                    <label className="field">
                      <span>Askiya alma nedeni</span>
                      <textarea
                        value={listingReason}
                        onChange={(event) => setListingReason(event.target.value)}
                        rows={4}
                      />
                    </label>
                    <button
                      className="nav-button action-fill"
                      type="button"
                      onClick={() => void handleUpdateListingStatus()}
                    >
                      Durumu guncelle
                    </button>
                  </article>
                </div>
              )}
            </div>
          </section>
        ) : null}

        {activeSlug === 'payments' ? (
          <section className="ops-layout">
            <div className="panel list-column">
              <div className="panel-head">
                <div>
                  <span className="panel-kicker">Finance</span>
                  <h3>Odemeler</h3>
                </div>
                <strong>{payments.length}</strong>
              </div>
              <div className="entity-list">
                {payments.map((payment) => (
                  <button
                    key={payment.id}
                    type="button"
                    className="entity-row"
                    data-active={payment.id === activePaymentId}
                    onClick={() => setActivePaymentId(payment.id)}
                  >
                    <strong>
                      {payment.amount.toLocaleString('tr-TR')} {payment.currency}
                    </strong>
                    <span>{payment.status}</span>
                    <small>@{payment.user.username}</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="panel detail-column">
              {!activePayment ? (
                <div className="empty-state">
                  <h3>Odeme secin</h3>
                  <p>Soldaki listeden bir odeme secin.</p>
                </div>
              ) : (
                <div className="stack-grid">
                  <article className="summary-box">
                    <span className="panel-kicker">Payment</span>
                    <h3>{activePayment.status}</h3>
                    <p>
                      {activePayment.amount.toLocaleString('tr-TR')} {activePayment.currency}
                    </p>
                    <p>{activePayment.provider}</p>
                    <p>{activePayment.providerTransactionId ?? 'Ref yok'}</p>
                  </article>
                  <article className="summary-box">
                    <span className="panel-kicker">Linked request</span>
                    <h3>{activePayment.insuranceRequest?.listingTitle ?? '-'}</h3>
                    <p>{activePayment.insuranceRequest?.id ?? '-'}</p>
                    <p>@{activePayment.user.username}</p>
                  </article>
                </div>
              )}
            </div>
          </section>
        ) : null}

        {activeSlug === 'audit-logs' ? (
          <section className="ops-section">
            <article className="panel">
              <div className="filter-grid">
                <label className="field">
                  <span>Aktor</span>
                  <input
                    value={auditActorFilter}
                    onChange={(event) => setAuditActorFilter(event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Action</span>
                  <input
                    value={auditActionFilter}
                    onChange={(event) => setAuditActionFilter(event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Entity</span>
                  <input
                    value={auditEntityTypeFilter}
                    onChange={(event) => setAuditEntityTypeFilter(event.target.value)}
                  />
                </label>
                <button
                  className="nav-button action-fill"
                  type="button"
                  onClick={() => void refreshAuditLogs()}
                >
                  Filtrele
                </button>
              </div>
            </article>

            <article className="panel">
              <div className="log-list">
                {auditLogs.map((log) => (
                  <div key={log.id} className="log-row wide-log-row">
                    <strong>{log.action}</strong>
                    <span>
                      {log.entityType} / {log.entityId}
                    </span>
                    <small>{log.actor ? `${log.actor.type}: ${log.actor.username}` : 'Sistem'}</small>
                  </div>
                ))}
              </div>
            </article>
          </section>
        ) : null}
      </main>
    </div>
  );
}

function defaultScreenForRole(role: AdminSession['admin']['role']): ScreenSlug {
  if (role === 'INSURANCE_ADMIN') {
    return 'insurance-requests';
  }

  if (role === 'COMMERCIAL_ADMIN') {
    return 'commercial-approvals';
  }

  return 'dashboard';
}
