const runtimeEnvironment = (
  process.env.EXPO_PUBLIC_APP_ENV ??
  process.env.NODE_ENV ??
  'development'
).toLowerCase();

export const mobileRuntimeIsProduction = runtimeEnvironment === 'production';
export const mobileDemoContentEnabled = !mobileRuntimeIsProduction;
