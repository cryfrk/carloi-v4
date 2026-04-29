import { Injectable } from '@nestjs/common';
import { ObdAdapterType } from '@prisma/client';
import type { ObdAdapter, ObdConnectPayload, ObdConnectResult } from './obd-adapter';

@Injectable()
export class BluetoothObdAdapter implements ObdAdapter {
  readonly type = ObdAdapterType.BLUETOOTH;

  async connect(_payload: ObdConnectPayload): Promise<ObdConnectResult> {
    return {
      success: false,
      provider: 'bluetooth-obd',
      error: 'Bluetooth OBD baglantisi henuz bu surumde aktif degil.',
    };
  }
}
