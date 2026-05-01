import type { ListingDamagePartInput, VehicleDamagePartName } from '@carloi-v4/types';
import { DamageStatus, VEHICLE_DAMAGE_PARTS } from '@carloi-v4/types';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { mobileTheme } from '../lib/design-system';
import { damageStatusLabels } from '../lib/listings-ui';

const statusCycle: DamageStatus[] = [
  DamageStatus.NONE,
  DamageStatus.PAINTED,
  DamageStatus.REPLACED,
];

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

function nextStatus(status: DamageStatus) {
  const currentIndex = statusCycle.indexOf(status);
  return statusCycle[(currentIndex + 1) % statusCycle.length];
}

function tone(status: DamageStatus) {
  switch (status) {
    case DamageStatus.NONE:
      return mobileTheme.colors.textMuted;
    case DamageStatus.PAINTED:
      return '#ffd166';
    case DamageStatus.REPLACED:
      return '#ff7b7b';
    default:
      return mobileTheme.colors.textMuted;
  }
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

  function handlePress(partName: VehicleDamagePartName) {
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
    <View style={styles.wrapper}>
      <View style={styles.grid}>
        {VEHICLE_DAMAGE_PARTS.map((partName) => {
          const status = lookup[partName];
          return (
            <Pressable
              key={partName}
              onPress={() => handlePress(partName)}
              style={[styles.partCard, editable ? styles.partCardEditable : null]}
            >
              <Text style={styles.partName}>{partName}</Text>
              <Text style={[styles.partStatus, { color: tone(status) }]}>
                {damageStatusLabels[status]}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {editable ? (
        <Text style={styles.note}>
          Parcalara dokunarak temiz, boyali ve degisen durumlari arasinda gecis yapin.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: mobileTheme.spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: mobileTheme.spacing.sm,
  },
  partCard: {
    width: '48%',
    minHeight: 82,
    padding: 12,
    borderRadius: mobileTheme.radius.md,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    backgroundColor: mobileTheme.colors.surface,
    justifyContent: 'space-between',
  },
  partCardEditable: {
    backgroundColor: mobileTheme.colors.surfaceMuted,
  },
  partName: {
    color: mobileTheme.colors.textStrong,
    fontSize: 12,
    lineHeight: 18,
    textTransform: 'capitalize',
  },
  partStatus: {
    fontWeight: '800',
  },
  note: {
    color: mobileTheme.colors.textMuted,
    lineHeight: 20,
  },
});
