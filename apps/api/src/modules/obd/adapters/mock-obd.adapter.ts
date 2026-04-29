import { Injectable } from '@nestjs/common';
import { ObdAdapterType } from '@prisma/client';
import type { ObdAdapter, ObdConnectPayload, ObdConnectResult } from './obd-adapter';

@Injectable()
export class MockObdAdapter implements ObdAdapter {
  readonly type = ObdAdapterType.MOCK;

  async connect(payload: ObdConnectPayload): Promise<ObdConnectResult> {
    const normalizedPassword = payload.password?.trim().toLowerCase();
    const shouldFail =
      normalizedPassword === 'fail' || payload.deviceId.trim().toLowerCase().includes('fail');

    if (shouldFail) {
      return {
        success: false,
        provider: 'mock-obd',
        error: 'Mock OBD cihazi baglanti istegini reddetti.',
      };
    }

    return {
      success: true,
      provider: 'mock-obd',
      deviceSerial: `MOCK-${payload.deviceId.trim().toUpperCase()}`,
      connectedAt: new Date(),
    };
  }
}
