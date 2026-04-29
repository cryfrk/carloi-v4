import { Injectable } from '@nestjs/common';
import { ObdAdapterType } from '@prisma/client';
import type { ObdAdapter, ObdConnectPayload, ObdConnectResult } from './obd-adapter';

@Injectable()
export class WifiObdAdapter implements ObdAdapter {
  readonly type = ObdAdapterType.WIFI;

  async connect(_payload: ObdConnectPayload): Promise<ObdConnectResult> {
    return {
      success: false,
      provider: 'wifi-obd',
      error: 'WiFi OBD baglantisi henuz bu surumde aktif degil.',
    };
  }
}
