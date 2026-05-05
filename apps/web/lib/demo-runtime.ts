const runtimeEnvironment = (
  process.env.NEXT_PUBLIC_APP_ENV ??
  process.env.NODE_ENV ??
  'development'
).toLowerCase();

export const webRuntimeIsProduction = runtimeEnvironment === 'production';
export const webDemoContentEnabled = !webRuntimeIsProduction;
