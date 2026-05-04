import { Image } from 'react-native';

const DEMO_MEDIA_MODULES = {
  'demo://car-01': require('../assets/demo-media/car-01.png'),
  'demo://car-02': require('../assets/demo-media/car-02.png'),
  'demo://car-03': require('../assets/demo-media/car-03.png'),
  'demo://car-04': require('../assets/demo-media/car-04.png'),
  'demo://car-05': require('../assets/demo-media/car-05.png'),
  'demo://car-06': require('../assets/demo-media/car-06.png'),
  'demo://car-07': require('../assets/demo-media/car-07.png'),
  'demo://car-08': require('../assets/demo-media/car-08.png'),
  'demo://car-09': require('../assets/demo-media/car-09.png'),
  'demo://car-10': require('../assets/demo-media/car-10.png'),
  'demo://placeholder': require('../assets/demo-media/carloi-placeholder.png'),
} as const;

export type DemoMediaKey = keyof typeof DEMO_MEDIA_MODULES;

const DEMO_MEDIA_URIS: Record<DemoMediaKey, string> = Object.fromEntries(
  Object.entries(DEMO_MEDIA_MODULES).map(([key, moduleRef]) => [
    key,
    Image.resolveAssetSource(moduleRef).uri,
  ]),
) as Record<DemoMediaKey, string>;

export function isDemoMediaKey(value: string | null | undefined): value is DemoMediaKey {
  return Boolean(value && value in DEMO_MEDIA_MODULES);
}

export function resolveDemoMediaUri(value: DemoMediaKey | null | undefined) {
  if (!value) {
    return DEMO_MEDIA_URIS['demo://placeholder'];
  }

  return DEMO_MEDIA_URIS[value] ?? DEMO_MEDIA_URIS['demo://placeholder'];
}
