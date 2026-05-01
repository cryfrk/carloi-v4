function normalizeFlagValue(value?: string) {
  return value?.trim().toLowerCase();
}

export function isObdEnabled() {
  const normalized = normalizeFlagValue(process.env.NEXT_PUBLIC_OBD_ENABLED);

  if (!normalized) {
    return false;
  }

  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}
