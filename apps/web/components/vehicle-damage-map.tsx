'use client';

import type { ListingDamagePartInput, VehicleDamagePartName } from '@carloi-v4/types';
import { DamageStatus, VEHICLE_DAMAGE_PARTS } from '@carloi-v4/types';
import { damageStatusLabels } from '../lib/listings-ui';

const statusCycle: DamageStatus[] = [
  DamageStatus.NONE,
  DamageStatus.PAINTED,
  DamageStatus.REPLACED,
];

const partAreas: Array<{ partName: VehicleDamagePartName; area: string }> = [
  { partName: 'on tampon', area: 'front-bumper' },
  { partName: 'kaput', area: 'hood' },
  { partName: 'arka tampon', area: 'rear-bumper' },
  { partName: 'sol on camurluk', area: 'left-front-fender' },
  { partName: 'sol on kapi', area: 'left-front-door' },
  { partName: 'sol arka kapi', area: 'left-rear-door' },
  { partName: 'sol arka camurluk', area: 'left-rear-fender' },
  { partName: 'tavan', area: 'roof' },
  { partName: 'sag on camurluk', area: 'right-front-fender' },
  { partName: 'sag on kapi', area: 'right-front-door' },
  { partName: 'sag arka kapi', area: 'right-rear-door' },
  { partName: 'sag arka camurluk', area: 'right-rear-fender' },
  { partName: 'bagaj kapagi', area: 'trunk' },
];

function nextStatus(status: DamageStatus) {
  const currentIndex = statusCycle.indexOf(status);
  return statusCycle[(currentIndex + 1) % statusCycle.length];
}

function normalizeValue(
  value: ListingDamagePartInput[],
): Record<VehicleDamagePartName, DamageStatus> {
  return VEHICLE_DAMAGE_PARTS.reduce(
    (accumulator, partName) => {
      accumulator[partName] =
        value.find((item) => item.partName === partName)?.damageStatus ?? DamageStatus.NONE;
      return accumulator;
    },
    {} as Record<VehicleDamagePartName, DamageStatus>,
  );
}

export function VehicleDamageMap({
  value,
  onChange,
  editable = false,
}: {
  value: ListingDamagePartInput[];
  onChange?: (nextValue: ListingDamagePartInput[]) => void;
  editable?: boolean;
}) {
  const lookup = normalizeValue(value);

  function updatePart(partName: VehicleDamagePartName) {
    if (!editable || !onChange) {
      return;
    }

    const nextLookup = {
      ...lookup,
      [partName]: nextStatus(lookup[partName]),
    };

    onChange(
      VEHICLE_DAMAGE_PARTS.map((item) => ({
        partName: item,
        damageStatus: nextLookup[item],
      })),
    );
  }

  return (
    <div className="damage-map-card">
      <div className="damage-map-grid">
        {partAreas.map((item) => {
          const status = lookup[item.partName];
          return (
            <button
              key={item.partName}
              className="damage-part-button"
              data-status={status}
              data-editable={editable}
              style={{ gridArea: item.area }}
              type="button"
              onClick={() => updatePart(item.partName)}
              disabled={!editable}
            >
              <span>{item.partName}</span>
              <strong>{damageStatusLabels[status]}</strong>
            </button>
          );
        })}
      </div>
      {editable ? (
        <p className="damage-map-note">
          Parcalara tiklayarak sirayla temiz, boyali ve degisen durumlari arasinda gecis yapin.
        </p>
      ) : null}
    </div>
  );
}
