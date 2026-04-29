import type {
  CreateObdReportRequest,
  ObdFaultCodeInput,
  ObdMetricSnapshotInput,
} from '@carloi-v4/types';
import { ObdAdapterType, ObdFaultSeverity } from '@carloi-v4/types';

export type MockObdDevice = {
  id: string;
  name: string;
  adapterType: ObdAdapterType;
  requiresPassword: boolean;
  note: string;
};

export const MOBILE_OBD_TEST_DURATION_SECONDS = 600;

export const mockObdDevices: MockObdDevice[] = [
  {
    id: 'elm327-cabin-01',
    name: 'ELM327 Cabin 01',
    adapterType: ObdAdapterType.MOCK,
    requiresPassword: false,
    note: 'Standart mock cihaz. Hemen baglanir.',
  },
  {
    id: 'carloi-probe-02',
    name: 'Carloi Probe Pro',
    adapterType: ObdAdapterType.MOCK,
    requiresPassword: true,
    note: 'Sifreli cihaz. Demo sifresi 1234.',
  },
  {
    id: 'fail-demo-03',
    name: 'Service Bay Fallback',
    adapterType: ObdAdapterType.MOCK,
    requiresPassword: false,
    note: 'Bilerek hata ureten test cihazi.',
  },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

function hashSeed(input: string) {
  return Array.from(input).reduce((total, char) => total + char.charCodeAt(0), 0);
}

export function createMockSnapshot(
  step: number,
  totalSteps = MOBILE_OBD_TEST_DURATION_SECONDS,
  deviceKey = 'carloi-default',
): ObdMetricSnapshotInput {
  const progress = clamp(step / Math.max(totalSteps, 1), 0, 1);
  const seed = hashSeed(deviceKey) % 17;
  const waveA = Math.sin((step + seed) / 6);
  const waveB = Math.cos((step + seed) / 9);
  const waveC = Math.sin((step + seed) / 13);

  const speed = clamp(Math.round(18 + progress * 72 + waveA * 7 + waveB * 4), 0, 148);
  const rpm = clamp(Math.round(860 + speed * 32 + waveA * 190 + waveC * 90), 720, 5200);
  const coolantTemp = clamp(Math.round(71 + Math.min(progress * 26, 21) + waveB * 2), 68, 108);
  const engineLoad = clamp(round(31 + progress * 32 + waveA * 9), 18, 92);
  const fuelLevel = clamp(round(63 - progress * 11 + waveB * 2), 24, 66);
  const batteryVoltage = clamp(round(12.6 + waveC * 0.3 - progress * 0.25), 11.8, 13.2);
  const intakeAirTemp = clamp(Math.round(22 + progress * 7 + waveB * 3), 18, 36);
  const throttlePosition = clamp(round(18 + progress * 38 + waveA * 11), 10, 78);

  return {
    capturedAt: new Date(Date.now() + step * 1000).toISOString(),
    rpm,
    speed,
    coolantTemp,
    engineLoad,
    fuelLevel,
    batteryVoltage,
    intakeAirTemp,
    throttlePosition,
  };
}

export function buildMockSnapshots(
  durationSeconds: number,
  deviceKey: string,
  sampleCount = 90,
) {
  const total = Math.max(sampleCount, 12);
  return Array.from({ length: total }, (_, index) => {
    const step = Math.round(((index + 1) / total) * durationSeconds);
    return createMockSnapshot(step, durationSeconds, deviceKey);
  });
}

export function buildMockFaultCodes(
  snapshots: ObdMetricSnapshotInput[],
): ObdFaultCodeInput[] {
  if (snapshots.length === 0) {
    return [];
  }

  const maxCoolantTemp = Math.max(...snapshots.map((snapshot) => snapshot.coolantTemp));
  const minBatteryVoltage = Math.min(...snapshots.map((snapshot) => snapshot.batteryVoltage));
  const averageThrottle =
    snapshots.reduce((total, snapshot) => total + snapshot.throttlePosition, 0) /
    snapshots.length;

  const codes: ObdFaultCodeInput[] = [];

  if (maxCoolantTemp >= 103) {
    codes.push({
      code: 'P0217',
      description: 'Motor sicakligi yuksek goruldu.',
      severity: ObdFaultSeverity.CRITICAL,
    });
  }

  if (minBatteryVoltage <= 12) {
    codes.push({
      code: 'P0562',
      description: 'Aku voltaji ideal araligin altina indi.',
      severity: ObdFaultSeverity.WARNING,
    });
  }

  if (averageThrottle >= 62) {
    codes.push({
      code: 'P0121',
      description: 'Gaz pedali tepkisinde dalgalanma izlendi.',
      severity: ObdFaultSeverity.INFO,
    });
  }

  return codes;
}

export function buildMockReportPayload(
  durationSeconds: number,
  deviceKey: string,
): CreateObdReportRequest {
  const snapshots = buildMockSnapshots(durationSeconds, deviceKey);

  return {
    durationSeconds,
    snapshots,
    faultCodes: buildMockFaultCodes(snapshots),
  };
}

export function formatObdCountdown(remainingSeconds: number) {
  const safeRemaining = Math.max(remainingSeconds, 0);
  const minutes = Math.floor(safeRemaining / 60)
    .toString()
    .padStart(2, '0');
  const seconds = Math.floor(safeRemaining % 60)
    .toString()
    .padStart(2, '0');

  return `${minutes}:${seconds}`;
}
