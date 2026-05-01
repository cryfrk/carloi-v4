import { DamageStatus, FuelType, SellerType, TransmissionType } from '@carloi-v4/types';

export const fuelTypeLabels: Record<FuelType, string> = {
  [FuelType.GASOLINE]: 'Benzin',
  [FuelType.DIESEL]: 'Dizel',
  [FuelType.HYBRID]: 'Hibrit',
  [FuelType.ELECTRIC]: 'Elektrik',
  [FuelType.LPG]: 'LPG',
  [FuelType.OTHER]: 'Diger',
};

export const transmissionLabels: Record<TransmissionType, string> = {
  [TransmissionType.MANUAL]: 'Manuel',
  [TransmissionType.AUTOMATIC]: 'Otomatik',
  [TransmissionType.SEMI_AUTOMATIC]: 'Yari otomatik',
  [TransmissionType.CVT]: 'CVT',
};

export const sellerTypeLabels: Record<SellerType, string> = {
  [SellerType.OWNER]: 'Sahibinden',
  [SellerType.DEALER]: 'Galeriden',
};

export const damageStatusLabels: Record<DamageStatus, string> = {
  [DamageStatus.NONE]: 'Temiz',
  [DamageStatus.PAINTED]: 'Boyali',
  [DamageStatus.REPLACED]: 'Degisen',
};

export function formatPrice(value: number, currency = 'TRY') {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatKm(value: number | null) {
  if (value === null) {
    return '-';
  }

  return `${new Intl.NumberFormat('tr-TR').format(value)} km`;
}

export function damageStatusColor(status: DamageStatus) {
  switch (status) {
    case DamageStatus.NONE:
      return 'var(--muted)';
    case DamageStatus.PAINTED:
      return '#ffd166';
    case DamageStatus.REPLACED:
      return '#ff7b7b';
    default:
      return 'var(--muted)';
  }
}

