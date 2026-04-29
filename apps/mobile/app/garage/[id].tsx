import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  CreateGarageVehicleRequest,
  GarageVehicleDetailResponse,
  ObdMetricSnapshotInput,
} from '@carloi-v4/types';
import {
  FuelType,
  TransmissionType,
  VehicleType,
} from '@carloi-v4/types';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ExpertiseReportCard } from '../../components/expertise-report-card';
import { MobileShell } from '../../components/mobile-shell';
import { useAuth } from '../../context/auth-context';
import { mobileListingsApi } from '../../lib/listings-api';
import {
  buildMockFaultCodes,
  buildMockReportPayload,
  createMockSnapshot,
  formatObdCountdown,
  MOBILE_OBD_TEST_DURATION_SECONDS,
  mockObdDevices,
} from '../../lib/obd-simulator';
import { fuelTypeLabels, transmissionLabels } from '../../lib/listings-ui';

const vehicleTypeLabels: Record<VehicleType, string> = {
  [VehicleType.SEDAN]: 'Sedan',
  [VehicleType.SUV]: 'SUV',
  [VehicleType.HATCHBACK]: 'Hatchback',
  [VehicleType.COUPE]: 'Coupe',
  [VehicleType.PICKUP]: 'Pickup',
  [VehicleType.VAN]: 'Van',
  [VehicleType.MOTORCYCLE]: 'Motorcycle',
  [VehicleType.OTHER]: 'Other',
};

type TestPhase = 'idle' | 'ready' | 'running' | 'finishing' | 'completed';

type EditFormState = Pick<
  CreateGarageVehicleRequest,
  'vehicleType' | 'year' | 'color' | 'fuelType' | 'transmissionType' | 'km' | 'isPublic' | 'media'
>;

const emptyEditForm: EditFormState = {
  vehicleType: VehicleType.SEDAN,
  year: new Date().getFullYear(),
  color: '',
  fuelType: FuelType.GASOLINE,
  transmissionType: TransmissionType.MANUAL,
  km: 0,
  isPublic: false,
  media: [{ url: '' }],
};

export default function GarageVehicleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const [vehicle, setVehicle] = useState<GarageVehicleDetailResponse | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>(emptyEditForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [devicePassword, setDevicePassword] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [testPhase, setTestPhase] = useState<TestPhase>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [liveSnapshot, setLiveSnapshot] = useState<ObdMetricSnapshotInput | null>(null);
  const [creatingReport, setCreatingReport] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const accessToken = session?.accessToken;
  const snapshotsRef = useRef<ObdMetricSnapshotInput[]>([]);

  const selectedDevice = useMemo(
    () => mockObdDevices.find((device) => device.id === selectedDeviceId) ?? null,
    [selectedDeviceId],
  );

  const remainingSeconds = MOBILE_OBD_TEST_DURATION_SECONDS - elapsedSeconds;

  const loadVehicle = useCallback(async () => {
    if (!accessToken || !id) {
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await mobileListingsApi.getGarageVehicleDetail(accessToken, id);
      setVehicle(response);
      setEditForm({
        vehicleType: response.vehicleType,
        year: response.year,
        color: response.color ?? '',
        fuelType: response.fuelType,
        transmissionType: response.transmissionType,
        km: response.km,
        isPublic: response.isPublic,
        media: response.media.length > 0 ? response.media.map((item) => ({ url: item.url })) : [{ url: '' }],
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Arac detayi getirilemedi.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, id]);

  useEffect(() => {
    void loadVehicle();
  }, [loadVehicle]);

  useEffect(() => {
    if (testPhase !== 'running' || !selectedDevice) {
      return;
    }

    const interval = setInterval(() => {
      setElapsedSeconds((current) => {
        const next = current + 1;
        const snapshot = createMockSnapshot(
          next,
          MOBILE_OBD_TEST_DURATION_SECONDS,
          selectedDevice.id,
        );

        snapshotsRef.current = [...snapshotsRef.current, snapshot];
        setLiveSnapshot(snapshot);

        if (next >= MOBILE_OBD_TEST_DURATION_SECONDS) {
          clearInterval(interval);
          setTestPhase('finishing');
          void finalizeReport(snapshotsRef.current, MOBILE_OBD_TEST_DURATION_SECONDS);
        }

        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [selectedDevice, testPhase]);

  if (!accessToken) {
    return <Redirect href="/login" />;
  }

  const token: string = accessToken;

  function patchEditForm<K extends keyof EditFormState>(key: K, value: EditFormState[K]) {
    setEditForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function patchMedia(index: number, value: string) {
    setEditForm((current) => ({
      ...current,
      media: (current.media ?? []).map((item, currentIndex) =>
        currentIndex === index ? { ...item, url: value } : item,
      ),
    }));
  }

  async function finalizeReport(snapshots: ObdMetricSnapshotInput[], durationSeconds: number) {
    if (!accessToken || !id) {
      return;
    }

    setCreatingReport(true);
    setErrorMessage(null);

    try {
      const response = await mobileListingsApi.createObdReport(token, id, {
        durationSeconds,
        snapshots,
        faultCodes: buildMockFaultCodes(snapshots),
      });

      setVehicle((current) => (current ? { ...current, latestObdReport: response.report } : current));
      setNotice('Carloi Expertiz raporu olusturuldu. Artik ilana ekleyebilirsiniz.');
      setTestPhase('completed');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'OBD raporu olusturulamadi.');
      setTestPhase('ready');
    } finally {
      setCreatingReport(false);
    }
  }

  async function handleConnectDevice() {
    if (!selectedDevice || !id) {
      setErrorMessage('Lutfen bir OBD cihazi secin.');
      return;
    }

    setConnecting(true);
    setErrorMessage(null);

    try {
      await mobileListingsApi.connectObdDevice(token, id, {
        adapterType: selectedDevice.adapterType,
        deviceName: selectedDevice.name,
        deviceId: selectedDevice.id,
        password: selectedDevice.requiresPassword ? devicePassword : undefined,
      });

      setNotice(`${selectedDevice.name} baglandi. Simdi 10 dakikalik test ekranini baslatabilirsiniz.`);
      setTestPhase('ready');
      setLiveSnapshot(createMockSnapshot(0, MOBILE_OBD_TEST_DURATION_SECONDS, selectedDevice.id));
      setScannerVisible(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'OBD baglantisi kurulamadi.');
    } finally {
      setConnecting(false);
    }
  }

  function handleStartTest() {
    if (!selectedDevice) {
      setErrorMessage('Test icin once bir cihaz baglayin.');
      return;
    }

    snapshotsRef.current = [];
    setElapsedSeconds(0);
    setLiveSnapshot(createMockSnapshot(0, MOBILE_OBD_TEST_DURATION_SECONDS, selectedDevice.id));
    setNotice('Mock OBD testi basladi. Aracla 10 dakika tur atin.');
    setTestPhase('running');
  }

  function handleFastComplete() {
    if (!selectedDevice) {
      return;
    }

    const payload = buildMockReportPayload(MOBILE_OBD_TEST_DURATION_SECONDS, selectedDevice.id);
    snapshotsRef.current = payload.snapshots;
    setElapsedSeconds(MOBILE_OBD_TEST_DURATION_SECONDS);
    setLiveSnapshot(payload.snapshots[payload.snapshots.length - 1] ?? null);
    setTestPhase('finishing');
    void finalizeReport(payload.snapshots, payload.durationSeconds);
  }

  async function handleSaveVehicle() {
    if (!id) {
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    try {
      await mobileListingsApi.updateGarageVehicle(token, id, {
        vehicleType: editForm.vehicleType,
        year: Number(editForm.year),
        color: editForm.color,
        fuelType: editForm.fuelType,
        transmissionType: editForm.transmissionType,
        km: Number(editForm.km),
        isPublic: editForm.isPublic,
        media: (editForm.media ?? []).filter((item) => item.url.trim()),
      });

      setNotice('Arac bilgileri guncellendi.');
      await loadVehicle();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Arac guncellenemedi.');
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    Alert.alert('Araci sil', 'Bu arac garajdan soft delete ile kaldirilacak.', [
      { text: 'Vazgec', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          void handleDeleteVehicle();
        },
      },
    ]);
  }

  async function handleDeleteVehicle() {
    if (!id) {
      return;
    }

    setDeleting(true);
    setErrorMessage(null);

    try {
      await mobileListingsApi.deleteGarageVehicle(token, id);
      router.replace('/garage');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Arac silinemedi.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <MobileShell
      title="Garaj detayi"
      subtitle="Aracini yonet, mock OBD baglantisini baslat ve Carloi Expertiz raporunu olustur."
      actionLabel="Ilan ver"
      onActionPress={() => router.push('/create-listing')}
    >
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {notice ? (
          <View style={[styles.banner, styles.noticeBanner]}>
            <Text style={styles.bannerText}>{notice}</Text>
          </View>
        ) : null}
        {errorMessage ? (
          <View style={[styles.banner, styles.errorBanner]}>
            <Text style={styles.bannerText}>{errorMessage}</Text>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color="#ef8354" />
            <Text style={styles.loadingText}>Arac detayi getiriliyor...</Text>
          </View>
        ) : null}

        {!loading && !vehicle ? (
          <View style={styles.loadingCard}>
            <Text style={styles.loadingText}>Arac bulunamadi.</Text>
          </View>
        ) : null}

        {vehicle ? (
          <>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.gallery}
            >
              {(vehicle.media.length > 0
                ? vehicle.media
                : [{ id: 'fallback', url: '', mediaType: 'IMAGE', sortOrder: 0 }]
              ).map((mediaItem) => (
                <View key={mediaItem.id} style={styles.galleryFrame}>
                  {mediaItem.url ? (
                    <Image source={{ uri: mediaItem.url }} style={styles.galleryImage} resizeMode="cover" />
                  ) : (
                    <View style={styles.galleryFallback}>
                      <Text style={styles.galleryFallbackLabel}>GARAGE</Text>
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>

            <View style={styles.sectionCard}>
              <Text style={styles.kicker}>{vehicle.brand} / {vehicle.model}</Text>
              <Text style={styles.title}>
                {vehicle.package ? `${vehicle.package} / ` : ''}
                {vehicle.year}
              </Text>
              <Text style={styles.copy}>
                {vehicle.plateNumberMasked} / {vehicle.km.toLocaleString('tr-TR')} km / {vehicle.color ?? 'Renk yok'}
              </Text>
              <View style={styles.metaGrid}>
                <View style={styles.metaTile}>
                  <Text style={styles.metaLabel}>Yakit</Text>
                  <Text style={styles.metaValue}>{fuelTypeLabels[vehicle.fuelType]}</Text>
                </View>
                <View style={styles.metaTile}>
                  <Text style={styles.metaLabel}>Vites</Text>
                  <Text style={styles.metaValue}>{transmissionLabels[vehicle.transmissionType]}</Text>
                </View>
                <View style={styles.metaTile}>
                  <Text style={styles.metaLabel}>Tur</Text>
                  <Text style={styles.metaValue}>{vehicleTypeLabels[vehicle.vehicleType]}</Text>
                </View>
                <View style={styles.metaTile}>
                  <Text style={styles.metaLabel}>Gorunurluk</Text>
                  <Text style={styles.metaValue}>{vehicle.isPublic ? 'Public' : 'Private'}</Text>
                </View>
              </View>
            </View>

            {vehicle.spec ? (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Katalog teknik bilgileri</Text>
                <View style={styles.infoGrid}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Kasa tipi</Text>
                    <Text style={styles.infoValue}>{vehicle.spec.bodyType ?? '-'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Motor gucu</Text>
                    <Text style={styles.infoValue}>
                      {vehicle.spec.enginePowerHp ? `${vehicle.spec.enginePowerHp} hp` : '-'}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Motor hacmi</Text>
                    <Text style={styles.infoValue}>
                      {vehicle.spec.engineVolumeCc ? `${vehicle.spec.engineVolumeCc} cc` : '-'}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Cekis</Text>
                    <Text style={styles.infoValue}>{vehicle.spec.tractionType ?? '-'}</Text>
                  </View>
                </View>
                <Text style={styles.specCopy}>{vehicle.spec.equipmentSummary ?? 'Donanim ozeti bekleniyor.'}</Text>
                <Text style={styles.specCopy}>{vehicle.spec.multimediaSummary ?? 'Multimedya ozeti bekleniyor.'}</Text>
                <Text style={styles.specCopy}>{vehicle.spec.interiorSummary ?? 'Ic mekan ozeti bekleniyor.'}</Text>
                <Text style={styles.specCopy}>{vehicle.spec.exteriorSummary ?? 'Dis mekan ozeti bekleniyor.'}</Text>
              </View>
            ) : null}

            <ExpertiseReportCard
              report={vehicle.latestObdReport}
              vehicleLabel={`${vehicle.brand} ${vehicle.model}${vehicle.package ? ` / ${vehicle.package}` : ''}`}
            />

            <View style={styles.sectionCard}>
              <View style={styles.sectionRow}>
                <Text style={styles.sectionTitle}>Mock OBD baglantisi</Text>
                <Pressable onPress={() => setScannerVisible((current) => !current)} style={styles.secondaryPill}>
                  <Text style={styles.secondaryPillLabel}>
                    {scannerVisible ? 'Tarayiciyi kapat' : 'OBD verisi ekle'}
                  </Text>
                </Pressable>
              </View>
              <Text style={styles.copy}>
                Gercek Bluetooth veya WiFi ELM327 baglantisi sonraki asamada gelecek. Bu ekran su an mock cihazlarla calisir.
              </Text>

              {scannerVisible ? (
                <View style={styles.deviceStack}>
                  {mockObdDevices.map((device) => {
                    const isSelected = selectedDeviceId === device.id;
                    return (
                      <Pressable
                        key={device.id}
                        onPress={() => setSelectedDeviceId(device.id)}
                        style={[styles.deviceCard, isSelected ? styles.deviceCardActive : null]}
                      >
                        <View style={styles.deviceCopy}>
                          <Text style={styles.deviceTitle}>{device.name}</Text>
                          <Text style={styles.deviceMeta}>{device.note}</Text>
                        </View>
                        <Text style={styles.deviceBadge}>{device.requiresPassword ? 'PIN' : 'Open'}</Text>
                      </Pressable>
                    );
                  })}

                  {selectedDevice?.requiresPassword ? (
                    <TextInput
                      style={styles.input}
                      value={devicePassword}
                      onChangeText={setDevicePassword}
                      placeholder="Cihaz sifresi"
                      placeholderTextColor="#6d8090"
                    />
                  ) : null}

                  <Pressable onPress={() => void handleConnectDevice()} style={styles.primaryButton}>
                    <Text style={styles.primaryButtonLabel}>
                      {connecting ? 'Baglaniyor...' : 'Cihaza baglan'}
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </View>

            {testPhase !== 'idle' ? (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>10 dakikalik test</Text>
                <Text style={styles.copy}>
                  Aracla 10 dakika tur atin. Basla butonuna basmadan sayac calismaz. Demo icin hizli tamamla aksiyonu da acik.
                </Text>

                <View style={styles.timerCard}>
                  <Text style={styles.timerLabel}>Kalan sure</Text>
                  <Text style={styles.timerValue}>{formatObdCountdown(remainingSeconds)}</Text>
                  <Text style={styles.timerMeta}>
                    {testPhase === 'running'
                      ? 'Mock veriler akiyor'
                      : testPhase === 'finishing'
                        ? 'Rapor hesaplaniyor'
                        : testPhase === 'completed'
                          ? 'Test tamamlandi'
                          : 'Hazir'}
                  </Text>
                </View>

                {liveSnapshot ? (
                  <View style={styles.infoGrid}>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>RPM</Text>
                      <Text style={styles.infoValue}>{liveSnapshot.rpm}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Hiz</Text>
                      <Text style={styles.infoValue}>{liveSnapshot.speed} km/h</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Motor sicakligi</Text>
                      <Text style={styles.infoValue}>{liveSnapshot.coolantTemp} C</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Motor yuku</Text>
                      <Text style={styles.infoValue}>{liveSnapshot.engineLoad}%</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Yakit seviyesi</Text>
                      <Text style={styles.infoValue}>{liveSnapshot.fuelLevel}%</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Aku voltaji</Text>
                      <Text style={styles.infoValue}>{liveSnapshot.batteryVoltage} V</Text>
                    </View>
                  </View>
                ) : null}

                <View style={styles.buttonRow}>
                  <Pressable
                    disabled={testPhase === 'running' || testPhase === 'finishing' || creatingReport}
                    onPress={handleStartTest}
                    style={styles.primaryButton}
                  >
                    <Text style={styles.primaryButtonLabel}>Basla</Text>
                  </Pressable>
                  <Pressable
                    disabled={testPhase === 'finishing' || creatingReport}
                    onPress={handleFastComplete}
                    style={styles.secondaryButtonWide}
                  >
                    <Text style={styles.secondaryButtonLabel}>
                      {creatingReport ? 'Rapor olusuyor...' : 'Mock hizli tamamla'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Arac bilgilerini guncelle</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choiceRow}>
                {Object.values(VehicleType).map((vehicleType) => (
                  <Pressable
                    key={vehicleType}
                    onPress={() => patchEditForm('vehicleType', vehicleType)}
                    style={[
                      styles.choiceChip,
                      editForm.vehicleType === vehicleType ? styles.choiceChipActive : null,
                    ]}
                  >
                    <Text style={styles.choiceChipLabel}>{vehicleTypeLabels[vehicleType]}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <TextInput
                style={styles.input}
                value={String(editForm.year)}
                onChangeText={(value) => patchEditForm('year', Number(value))}
                keyboardType="numeric"
                placeholder="Yil"
                placeholderTextColor="#6d8090"
              />
              <TextInput
                style={styles.input}
                value={editForm.color ?? ''}
                onChangeText={(value) => patchEditForm('color', value)}
                placeholder="Renk"
                placeholderTextColor="#6d8090"
              />
              <TextInput
                style={styles.input}
                value={String(editForm.km)}
                onChangeText={(value) => patchEditForm('km', Number(value))}
                keyboardType="numeric"
                placeholder="KM"
                placeholderTextColor="#6d8090"
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choiceRow}>
                {Object.values(FuelType).map((fuelType) => (
                  <Pressable
                    key={fuelType}
                    onPress={() => patchEditForm('fuelType', fuelType)}
                    style={[
                      styles.choiceChip,
                      editForm.fuelType === fuelType ? styles.choiceChipActive : null,
                    ]}
                  >
                    <Text style={styles.choiceChipLabel}>{fuelTypeLabels[fuelType]}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choiceRow}>
                {Object.values(TransmissionType).map((transmissionType) => (
                  <Pressable
                    key={transmissionType}
                    onPress={() => patchEditForm('transmissionType', transmissionType)}
                    style={[
                      styles.choiceChip,
                      editForm.transmissionType === transmissionType ? styles.choiceChipActive : null,
                    ]}
                  >
                    <Text style={styles.choiceChipLabel}>{transmissionLabels[transmissionType]}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <Pressable
                onPress={() => patchEditForm('isPublic', !editForm.isPublic)}
                style={[styles.toggleChip, editForm.isPublic ? styles.choiceChipActive : null]}
              >
                <Text style={styles.choiceChipLabel}>Public garage {editForm.isPublic ? 'Acik' : 'Kapali'}</Text>
              </Pressable>

              <View style={styles.sectionRow}>
                <Text style={styles.sectionTitle}>Medya URL</Text>
                <Pressable
                  onPress={() =>
                    patchEditForm('media', [...(editForm.media ?? []), { url: '' }])
                  }
                  style={styles.secondaryPill}
                >
                  <Text style={styles.secondaryPillLabel}>Medya ekle</Text>
                </Pressable>
              </View>
              {(editForm.media ?? []).map((mediaItem, index) => (
                <TextInput
                  key={`${index}-${mediaItem.url}`}
                  style={styles.input}
                  value={mediaItem.url}
                  onChangeText={(value) => patchMedia(index, value)}
                  placeholder={`Medya URL ${index + 1}`}
                  placeholderTextColor="#6d8090"
                />
              ))}

              <View style={styles.buttonRow}>
                <Pressable onPress={() => void handleSaveVehicle()} style={styles.primaryButton}>
                  <Text style={styles.primaryButtonLabel}>{saving ? 'Kaydediliyor...' : 'Guncelle'}</Text>
                </Pressable>
                <Pressable onPress={confirmDelete} style={styles.dangerButton}>
                  <Text style={styles.dangerButtonLabel}>{deleting ? 'Siliniyor...' : 'Sil'}</Text>
                </Pressable>
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    gap: 14,
    paddingBottom: 18,
  },
  banner: {
    borderRadius: 18,
    padding: 14,
  },
  noticeBanner: {
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  errorBanner: {
    backgroundColor: 'rgba(216,82,82,0.2)',
  },
  bannerText: {
    color: '#f8f2ea',
    lineHeight: 20,
  },
  loadingCard: {
    paddingVertical: 28,
    alignItems: 'center',
    gap: 10,
    borderRadius: 24,
    backgroundColor: '#0e1f2d',
  },
  loadingText: {
    color: '#d1dce5',
  },
  gallery: {
    gap: 10,
  },
  galleryFrame: {
    width: 320,
    aspectRatio: 1,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#08131d',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  galleryFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryFallbackLabel: {
    color: '#ffd6c2',
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  sectionCard: {
    gap: 12,
    padding: 18,
    borderRadius: 24,
    backgroundColor: '#0d1d2a',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  kicker: {
    color: '#ffd6c2',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: {
    color: '#f8f2ea',
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30,
  },
  copy: {
    color: '#c8d4dd',
    lineHeight: 21,
  },
  specCopy: {
    color: '#c8d4dd',
    lineHeight: 20,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metaTile: {
    width: '48%',
    minWidth: 140,
    padding: 12,
    borderRadius: 18,
    backgroundColor: '#102030',
  },
  metaLabel: {
    color: '#8fa4b4',
    fontSize: 12,
  },
  metaValue: {
    color: '#f8f2ea',
    fontWeight: '800',
    marginTop: 4,
  },
  sectionTitle: {
    color: '#f8f2ea',
    fontSize: 18,
    fontWeight: '800',
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    alignItems: 'center',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  infoRow: {
    width: '48%',
    minWidth: 140,
    padding: 12,
    borderRadius: 18,
    backgroundColor: '#102030',
    gap: 4,
  },
  infoLabel: {
    color: '#8fa4b4',
    fontSize: 12,
  },
  infoValue: {
    color: '#f8f2ea',
    fontWeight: '800',
  },
  deviceStack: {
    gap: 10,
  },
  deviceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 20,
    backgroundColor: '#102030',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  deviceCardActive: {
    borderColor: 'rgba(239,131,84,0.3)',
    backgroundColor: 'rgba(239,131,84,0.12)',
  },
  deviceCopy: {
    flex: 1,
    gap: 4,
  },
  deviceTitle: {
    color: '#f8f2ea',
    fontWeight: '800',
  },
  deviceMeta: {
    color: '#9cb0be',
    lineHeight: 19,
  },
  deviceBadge: {
    color: '#ffd6c2',
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  timerCard: {
    alignItems: 'center',
    gap: 8,
    padding: 18,
    borderRadius: 22,
    backgroundColor: '#102030',
  },
  timerLabel: {
    color: '#8fa4b4',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  timerValue: {
    color: '#f8f2ea',
    fontSize: 42,
    fontWeight: '900',
  },
  timerMeta: {
    color: '#ffd6c2',
    fontWeight: '700',
  },
  input: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: '#f8f2ea',
    backgroundColor: '#08131d',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  choiceRow: {
    gap: 10,
  },
  choiceChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: '#142636',
  },
  choiceChipActive: {
    backgroundColor: 'rgba(239,131,84,0.2)',
  },
  choiceChipLabel: {
    color: '#f8f2ea',
    fontWeight: '700',
  },
  toggleChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: '#142636',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 20,
    backgroundColor: '#ef8354',
  },
  primaryButtonLabel: {
    color: '#08131d',
    fontWeight: '800',
  },
  secondaryButtonWide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 20,
    backgroundColor: '#142636',
  },
  secondaryButtonLabel: {
    color: '#ffd6c2',
    fontWeight: '800',
  },
  secondaryPill: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: '#142636',
  },
  secondaryPillLabel: {
    color: '#ffd6c2',
    fontWeight: '800',
  },
  dangerButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 20,
    backgroundColor: '#4b1f1f',
  },
  dangerButtonLabel: {
    color: '#ffd7d7',
    fontWeight: '800',
  },
});
