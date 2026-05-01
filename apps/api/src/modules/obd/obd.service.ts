import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ObdAdapterType,
  ObdConnectionStatus,
  ObdFaultSeverity,
  ObdReportStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { trimNullable } from '../listings/listings.utils';
import { CreateObdReportDto } from '../garage/dto/create-obd-report.dto';
import { ConnectObdDeviceDto } from '../garage/dto/connect-obd-device.dto';
import { BluetoothObdAdapter } from './adapters/bluetooth-obd.adapter';
import { MockObdAdapter } from './adapters/mock-obd.adapter';
import type { ObdAdapter } from './adapters/obd-adapter';
import { WifiObdAdapter } from './adapters/wifi-obd.adapter';
import { serializeObdReport } from './obd.utils';

type SnapshotMetric = CreateObdReportDto['snapshots'][number] & {
  capturedAtDate: Date;
};

const obdVehicleCatalogInclude = Prisma.validator<Prisma.GarageVehicleInclude>()({
  brand: true,
  model: {
    include: {
      brand: true,
    },
  },
  vehiclePackage: {
    include: {
      model: {
        include: {
          brand: true,
        },
      },
      specs: {
        where: {
          isActive: true,
        },
        orderBy: [{ manualReviewNeeded: 'asc' }, { year: 'desc' }, { enginePowerHp: 'desc' }],
        take: 1,
      },
    },
  },
  obdConnections: {
    orderBy: [{ lastConnectedAt: 'desc' }, { createdAt: 'desc' }],
    take: 1,
  },
});

type OwnedVehicleWithCatalog = Prisma.GarageVehicleGetPayload<{
  include: typeof obdVehicleCatalogInclude;
}>;

@Injectable()
export class ObdService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mockAdapter: MockObdAdapter,
    private readonly bluetoothAdapter: BluetoothObdAdapter,
    private readonly wifiAdapter: WifiObdAdapter,
  ) {}

  async connectDevice(userId: string, vehicleId: string, dto: ConnectObdDeviceDto) {
    await this.ensureOwnedVehicle(userId, vehicleId);

    const adapter = this.resolveAdapter(dto.adapterType);
    const result = await adapter.connect({
      deviceName: dto.deviceName,
      deviceId: dto.deviceId,
      password: dto.password,
    });

    if (!result.success) {
      await this.prisma.obdConnection.create({
        data: {
          ownerId: userId,
          garageVehicleId: vehicleId,
          adapterType: dto.adapterType,
          provider: result.provider,
          deviceName: dto.deviceName.trim(),
          deviceId: dto.deviceId.trim(),
          connectionStatus: ObdConnectionStatus.ERROR,
          lastError: result.error ?? 'OBD baglantisi kurulamadi.',
        },
      });

      throw new BadRequestException(result.error ?? 'OBD baglantisi kurulamadi.');
    }

    const basePayload = {
      ownerId: userId,
      garageVehicleId: vehicleId,
      adapterType: dto.adapterType,
      provider: result.provider,
      deviceName: dto.deviceName.trim(),
      deviceId: dto.deviceId.trim(),
      connectionStatus: ObdConnectionStatus.CONNECTED,
      lastConnectedAt: result.connectedAt ?? new Date(),
      lastError: null,
    };

    const connection = result.deviceSerial
      ? await this.prisma.obdConnection.upsert({
          where: {
            deviceSerial: result.deviceSerial,
          },
          update: basePayload,
          create: {
            ...basePayload,
            deviceSerial: result.deviceSerial,
          },
        })
      : await this.prisma.obdConnection.create({
          data: basePayload,
        });

    return {
      success: true,
      connection: {
        id: connection.id,
        adapterType: connection.adapterType,
        deviceName: connection.deviceName ?? null,
        deviceId: connection.deviceId ?? null,
        connectionStatus: connection.connectionStatus,
        lastConnectedAt: connection.lastConnectedAt?.toISOString() ?? null,
      },
    };
  }

  async createReport(userId: string, vehicleId: string, dto: CreateObdReportDto) {
    const vehicle = await this.getOwnedVehicleWithCatalog(userId, vehicleId);
    const normalizedSnapshots = this.normalizeSnapshots(dto.durationSeconds, dto.snapshots);
    const rawMetricsSummary = this.buildRawMetricsSummary(normalizedSnapshots);
    const analysis = this.analyzeVehicleHealth(vehicle, rawMetricsSummary, dto.faultCodes ?? []);
    const startedAt = normalizedSnapshots[0]?.capturedAtDate ?? new Date();
    const endedAt =
      normalizedSnapshots.at(-1)?.capturedAtDate ??
      new Date(startedAt.getTime() + dto.durationSeconds * 1000);
    const latestConnection = vehicle.obdConnections[0] ?? null;
    const brand =
      vehicle.vehiclePackage?.model.brand.name ?? vehicle.model?.brand.name ?? vehicle.brand?.name ?? vehicle.brandText;
    const model = vehicle.vehiclePackage?.model.name ?? vehicle.model?.name ?? vehicle.modelText;
    const packageName = vehicle.vehiclePackage?.name ?? vehicle.packageText ?? null;

    const report = await this.prisma.obdExpertiseReport.create({
      data: {
        garageVehicleId: vehicle.id,
        obdConnectionId: latestConnection?.id ?? null,
        reportStatus: ObdReportStatus.COMPLETED,
        durationSeconds: dto.durationSeconds,
        overallScore: analysis.overallScore,
        summaryText: analysis.summary,
        criticalIssues: analysis.criticalIssues,
        warnings: analysis.warnings,
        normalFindings: analysis.normalFindings,
        rawMetricsSummary,
        reportJson: {
          adapterType: latestConnection?.adapterType ?? ObdAdapterType.MOCK,
          catalogReference: {
            brand,
            model,
            package: packageName,
      bodyType: vehicle.vehiclePackage?.specs?.[0]?.bodyType ?? null,
      engineVolumeCc: vehicle.vehiclePackage?.specs?.[0]?.engineVolumeCc ?? null,
      enginePowerHp: vehicle.vehiclePackage?.specs?.[0]?.enginePowerHp ?? null,
          },
          rawMetricsSummary,
          generatedWith: 'mock-obd-analysis',
        },
        startedAt,
        endedAt,
        reportedAt: endedAt,
        faultCodes: {
          create: (dto.faultCodes ?? []).map((faultCode) => ({
            faultCode: faultCode.code.trim().toUpperCase(),
            description: trimNullable(faultCode.description),
            severity: faultCode.severity,
          })),
        },
        metricSnapshots: {
          create: normalizedSnapshots.map((snapshot) => ({
            garageVehicleId: vehicle.id,
            capturedAt: snapshot.capturedAtDate,
            rpm: snapshot.rpm,
            speed: snapshot.speed,
            coolantTemp: snapshot.coolantTemp,
            engineLoad: snapshot.engineLoad,
            fuelLevel: snapshot.fuelLevel,
            batteryVoltage: new Prisma.Decimal(snapshot.batteryVoltage),
            intakeAirTemp: snapshot.intakeAirTemp,
            throttlePosition: snapshot.throttlePosition,
          })),
        },
      },
      include: {
        faultCodes: true,
      },
    });

    return {
      success: true,
      report: serializeObdReport(report),
    };
  }

  private resolveAdapter(adapterType: ObdAdapterType): ObdAdapter {
    switch (adapterType) {
      case ObdAdapterType.MOCK:
        return this.mockAdapter;
      case ObdAdapterType.BLUETOOTH:
        return this.bluetoothAdapter;
      case ObdAdapterType.WIFI:
        return this.wifiAdapter;
      default:
        return this.mockAdapter;
    }
  }

  private async ensureOwnedVehicle(userId: string, vehicleId: string) {
    const vehicle = await this.prisma.garageVehicle.findFirst({
      where: {
        id: vehicleId,
        ownerId: userId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Arac bulunamadi.');
    }
  }

  private async getOwnedVehicleWithCatalog(
    userId: string,
    vehicleId: string,
  ): Promise<OwnedVehicleWithCatalog> {
    const vehicle = await this.prisma.garageVehicle.findFirst({
      where: {
        id: vehicleId,
        ownerId: userId,
        deletedAt: null,
      },
      include: obdVehicleCatalogInclude,
    });

    if (!vehicle) {
      throw new NotFoundException('Arac bulunamadi.');
    }

    return vehicle;
  }

  private normalizeSnapshots(
    durationSeconds: number,
    snapshots: CreateObdReportDto['snapshots'],
  ): SnapshotMetric[] {
    const endedAt = Date.now();
    const startedAt = endedAt - durationSeconds * 1000;
    const divisor = Math.max(snapshots.length - 1, 1);

    return snapshots.map((snapshot, index) => ({
      ...snapshot,
      capturedAtDate: snapshot.capturedAt
        ? new Date(snapshot.capturedAt)
        : new Date(startedAt + Math.floor((durationSeconds * 1000 * index) / divisor)),
    }));
  }

  private buildRawMetricsSummary(snapshots: SnapshotMetric[]) {
    const average = (values: number[]) =>
      values.reduce((total, value) => total + value, 0) / Math.max(values.length, 1);
    const maximum = (values: number[]) => Math.max(...values);
    const minimum = (values: number[]) => Math.min(...values);
    const round = (value: number) => Number(value.toFixed(2));

    const rpmValues = snapshots.map((snapshot) => snapshot.rpm);
    const speedValues = snapshots.map((snapshot) => snapshot.speed);
    const coolantValues = snapshots.map((snapshot) => snapshot.coolantTemp);
    const engineLoadValues = snapshots.map((snapshot) => snapshot.engineLoad);
    const fuelValues = snapshots.map((snapshot) => snapshot.fuelLevel);
    const batteryValues = snapshots.map((snapshot) => snapshot.batteryVoltage);
    const intakeValues = snapshots.map((snapshot) => snapshot.intakeAirTemp);
    const throttleValues = snapshots.map((snapshot) => snapshot.throttlePosition);

    return {
      averageRpm: round(average(rpmValues)),
      maxRpm: maximum(rpmValues),
      averageSpeed: round(average(speedValues)),
      maxSpeed: maximum(speedValues),
      averageCoolantTemp: round(average(coolantValues)),
      maxCoolantTemp: maximum(coolantValues),
      averageEngineLoad: round(average(engineLoadValues)),
      averageFuelLevel: round(average(fuelValues)),
      averageBatteryVoltage: round(average(batteryValues)),
      minBatteryVoltage: round(minimum(batteryValues)),
      averageIntakeAirTemp: round(average(intakeValues)),
      averageThrottlePosition: round(average(throttleValues)),
    };
  }

  private analyzeVehicleHealth(
    vehicle: OwnedVehicleWithCatalog,
    rawMetricsSummary: ReturnType<typeof this.buildRawMetricsSummary>,
    faultCodes: CreateObdReportDto['faultCodes'],
  ) {
    const criticalIssues: string[] = [];
    const warnings: string[] = [];
    const normalFindings: string[] = [];
    let overallScore = 100;

    const criticalFaults = (faultCodes ?? []).filter(
      (faultCode) => faultCode.severity === ObdFaultSeverity.CRITICAL,
    );
    const warningFaults = (faultCodes ?? []).filter(
      (faultCode) => faultCode.severity === ObdFaultSeverity.WARNING,
    );

    for (const faultCode of criticalFaults) {
      criticalIssues.push(
        `${faultCode.code.trim().toUpperCase()}: ${trimNullable(faultCode.description) ?? 'Kritik ariza kodu tespit edildi.'}`,
      );
      overallScore -= 18;
    }

    for (const faultCode of warningFaults) {
      warnings.push(
        `${faultCode.code.trim().toUpperCase()}: ${trimNullable(faultCode.description) ?? 'Takip gerektiren ariza kodu tespit edildi.'}`,
      );
      overallScore -= 9;
    }

    if (rawMetricsSummary.maxCoolantTemp >= 115) {
      criticalIssues.push('Motor sogutma sicakligi kritik seviyeye cikti.');
      overallScore -= 20;
    } else if (rawMetricsSummary.maxCoolantTemp >= 105) {
      warnings.push('Motor sogutma sicakligi yuksek seyrediyor.');
      overallScore -= 8;
    } else {
      normalFindings.push('Motor sogutma sicakligi stabil gorunuyor.');
    }

    if (rawMetricsSummary.minBatteryVoltage < 11.8) {
      criticalIssues.push('Aku voltaji kritik esigin altina dustu.');
      overallScore -= 18;
    } else if (rawMetricsSummary.averageBatteryVoltage < 12.2) {
      warnings.push('Aku voltaji dusuk, sarj sistemi kontrol edilmeli.');
      overallScore -= 8;
    } else {
      normalFindings.push('Aku ve sarj sistemi voltaj degerleri normal aralikta.');
    }

    if (rawMetricsSummary.averageEngineLoad > 85) {
      warnings.push('Motor yuk degeri yuksek, detayli mekanik kontrol onerilir.');
      overallScore -= 6;
    } else {
      normalFindings.push('Motor yuk degerleri dengeli gorunuyor.');
    }

    if (rawMetricsSummary.averageFuelLevel < 10) {
      warnings.push('Test sirasinda yakit seviyesi cok dusuk gorundu.');
      overallScore -= 4;
    } else {
      normalFindings.push('Yakit seviyesi test boyunca yeterli gorundu.');
    }

    if ((faultCodes ?? []).length === 0) {
      normalFindings.push('Aktif OBD ariza kodu algilanmadi.');
    }

    const brand =
      vehicle.vehiclePackage?.model.brand.name ?? vehicle.model?.brand.name ?? vehicle.brand?.name ?? vehicle.brandText;
    const model = vehicle.vehiclePackage?.model.name ?? vehicle.model?.name ?? vehicle.modelText;
    const packageName = vehicle.vehiclePackage?.name ?? vehicle.packageText ?? null;
    const spec = vehicle.vehiclePackage?.specs?.[0] ?? null;

    if (spec?.bodyType || spec?.enginePowerHp || spec?.engineVolumeCc) {
      normalFindings.push(
        `${brand} ${model}${packageName ? ` ${packageName}` : ''} katalog verisi referans alinarak analiz tamamlandi.`,
      );
    }

    overallScore = Math.max(0, Math.min(100, overallScore));

    const summary =
      overallScore >= 85
        ? 'Arac genel olarak saglikli gorunuyor, belirgin bir OBD riski tespit edilmedi.'
        : overallScore >= 65
          ? 'Arac kullanilabilir gorunuyor ancak izlenmesi gereken teknik bulgular var.'
          : 'Aracta dikkat gerektiren teknik uyarilar tespit edildi, detayli expertiz onerilir.';

    return {
      overallScore,
      summary,
      criticalIssues,
      warnings,
      normalFindings,
    };
  }
}
