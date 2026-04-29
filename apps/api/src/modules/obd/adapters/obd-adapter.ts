import { ObdAdapterType } from '@prisma/client';

export type ObdConnectPayload = {
  deviceName: string;
  deviceId: string;
  password?: string;
};

export type ObdConnectResult = {
  success: boolean;
  provider: string;
  deviceSerial?: string | null;
  connectedAt?: Date | null;
  error?: string | null;
};

export interface ObdAdapter {
  readonly type: ObdAdapterType;
  connect(payload: ObdConnectPayload): Promise<ObdConnectResult>;
}
