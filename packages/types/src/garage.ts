import type {
  FuelType,
  MediaType,
  ObdAdapterType,
  ObdConnectionStatus,
  ObdFaultSeverity,
  ObdReportStatus,
  TransmissionType,
  VehicleCatalogEquipmentSource,
  VehicleEquipmentCategory,
  VehicleType,
} from './enums';

export interface GarageVehicleMediaInput {
  url: string;
  mediaType?: MediaType;
  mediaAssetId?: string;
}

export interface GarageVehicleMedia {
  id: string;
  url: string;
  mediaType: MediaType;
  sortOrder: number;
}

export interface VehicleEquipmentItemInput {
  category?: VehicleEquipmentCategory | null;
  name: string;
  note?: string;
}

export interface VehicleEquipmentItem {
  id: string;
  category: VehicleEquipmentCategory | null;
  name: string;
  note: string | null;
  isStandard: boolean;
  manualReviewNeeded: boolean;
}

export interface VehicleEquipmentGroup {
  category: VehicleEquipmentCategory;
  items: Array<{
    id: string;
    name: string;
    isStandard: boolean;
    manualReviewNeeded: boolean;
    source?: VehicleCatalogEquipmentSource | null;
  }>;
}

export interface CreateGarageVehicleRequest {
  vehicleType: VehicleType;
  brandId?: string;
  modelId?: string;
  packageId?: string;
  vehiclePackageId?: string;
  brandText: string;
  modelText: string;
  packageText?: string;
  year: number;
  plateNumber?: string;
  color?: string;
  fuelType: FuelType;
  transmissionType: TransmissionType;
  km: number;
  isPublic?: boolean;
  description?: string;
  equipmentNotes?: string;
  extraEquipment?: VehicleEquipmentItemInput[];
  showInExplore?: boolean;
  openToOffers?: boolean;
  media?: GarageVehicleMediaInput[];
}

export interface UpdateGarageVehicleRequest {
  vehicleType?: VehicleType;
  brandId?: string;
  modelId?: string;
  packageId?: string;
  vehiclePackageId?: string;
  brandText?: string;
  modelText?: string;
  packageText?: string;
  year?: number;
  plateNumber?: string;
  color?: string;
  fuelType?: FuelType;
  transmissionType?: TransmissionType;
  km?: number;
  isPublic?: boolean;
  description?: string;
  equipmentNotes?: string;
  extraEquipment?: VehicleEquipmentItemInput[];
  showInExplore?: boolean;
  openToOffers?: boolean;
  media?: GarageVehicleMediaInput[];
}

export interface GarageVehicleSummary {
  id: string;
  firstMediaUrl: string | null;
  brand: string;
  model: string;
  package: string | null;
  plateNumberMasked: string;
  plateMasked: string;
  year: number;
  km: number;
  isPublic: boolean;
  description: string | null;
  showInExplore: boolean;
  openToOffers: boolean;
}

export interface GarageVehicleSummaryResponse {
  items: GarageVehicleSummary[];
}

export type GarageVehicleOption = GarageVehicleSummary;
export type GarageVehiclesResponse = GarageVehicleSummaryResponse;

export interface ObdFaultCodeInput {
  code: string;
  description?: string;
  severity: ObdFaultSeverity;
}

export interface ObdMetricSnapshotInput {
  capturedAt?: string;
  rpm: number;
  speed: number;
  coolantTemp: number;
  engineLoad: number;
  fuelLevel: number;
  batteryVoltage: number;
  intakeAirTemp: number;
  throttlePosition: number;
}

export interface ObdRawMetricsSummary {
  averageRpm: number;
  maxRpm: number;
  averageSpeed: number;
  maxSpeed: number;
  averageCoolantTemp: number;
  maxCoolantTemp: number;
  averageEngineLoad: number;
  averageFuelLevel: number;
  averageBatteryVoltage: number;
  minBatteryVoltage: number;
  averageIntakeAirTemp: number;
  averageThrottlePosition: number;
}

export interface ObdExpertiseReportSummary {
  id: string;
  reportStatus: ObdReportStatus;
  overallScore: number | null;
  summary: string | null;
  criticalIssues: string[];
  warnings: string[];
  normalFindings: string[];
  faultCodes: Array<{
    code: string;
    description: string | null;
    severity: ObdFaultSeverity;
  }>;
  rawMetricsSummary: ObdRawMetricsSummary | null;
  durationSeconds: number | null;
  reportedAt: string | null;
  createdAt: string;
}

export interface GarageVehicleDetailResponse {
  id: string;
  media: GarageVehicleMedia[];
  brand: string;
  model: string;
  package: string | null;
  vehicleType: VehicleType;
  year: number;
  plateNumberMasked: string;
  color: string | null;
  fuelType: FuelType;
  transmissionType: TransmissionType;
  km: number;
  isPublic: boolean;
  description: string | null;
  equipmentNotes: string | null;
  showInExplore: boolean;
  openToOffers: boolean;
  createdAt: string;
  standardEquipment: VehicleEquipmentGroup[];
  extraEquipment: VehicleEquipmentItem[];
  spec: {
    year: number | null;
    bodyType: string | null;
    engineVolume: number | null;
    enginePower: number | null;
    engineVolumeCc: number | null;
    enginePowerHp: number | null;
    tractionType: string | null;
    fuelType: FuelType | null;
    transmissionType: TransmissionType | null;
    equipmentSummary: string | null;
    multimediaSummary: string | null;
    interiorSummary: string | null;
    exteriorSummary: string | null;
  } | null;
}

export interface GarageVehicleMutationResponse {
  success: true;
  vehicle: GarageVehicleSummary;
}

export type GarageVehicleResponse = GarageVehicleMutationResponse;

export interface PublicGarageResponse {
  items: GarageVehicleSummary[];
  hiddenByProfile: boolean;
}

export interface ConnectObdDeviceRequest {
  adapterType: ObdAdapterType;
  deviceName: string;
  deviceId: string;
  password?: string;
}

export interface ObdConnectionResponse {
  success: true;
  connection: {
    id: string;
    adapterType: ObdAdapterType;
    deviceName: string | null;
    deviceId: string | null;
    connectionStatus: ObdConnectionStatus;
    lastConnectedAt: string | null;
  };
}

export interface CreateObdReportRequest {
  durationSeconds: number;
  snapshots: ObdMetricSnapshotInput[];
  faultCodes?: ObdFaultCodeInput[];
}

export interface CreateObdReportResponse {
  success: true;
  report: ObdExpertiseReportSummary;
}
