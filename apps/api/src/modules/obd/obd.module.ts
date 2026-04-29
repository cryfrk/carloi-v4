import { Module } from '@nestjs/common';
import { BluetoothObdAdapter } from './adapters/bluetooth-obd.adapter';
import { MockObdAdapter } from './adapters/mock-obd.adapter';
import { WifiObdAdapter } from './adapters/wifi-obd.adapter';
import { ObdService } from './obd.service';

@Module({
  providers: [ObdService, MockObdAdapter, BluetoothObdAdapter, WifiObdAdapter],
  exports: [ObdService],
})
export class ObdModule {}
