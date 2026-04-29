declare module 'next' {
  export type Metadata = Record<string, unknown>;
  export type NextConfig = Record<string, unknown>;
}

declare module 'next/link' {
  const Link: (props: Record<string, unknown>) => JSX.Element;
  export default Link;
}

declare module 'next/navigation' {
  export function useRouter(): {
    push: (href: string) => void;
    replace: (href: string) => void;
  };
  export function usePathname(): string;
  export function useSearchParams(): {
    get: (key: string) => string | null;
  };
}

declare module 'next/font/google' {
  export function Newsreader(config: Record<string, unknown>): {
    variable: string;
  };
  export function Space_Grotesk(config: Record<string, unknown>): {
    variable: string;
  };
}

declare module 'next/dist/lib/metadata/types/metadata-interface.js' {
  export type ResolvingMetadata = Record<string, unknown>;
  export type ResolvingViewport = Record<string, unknown>;
}

declare module 'next/dist/build/segment-config/app/app-segment-config.js' {
  export type InstantConfigForTypeCheckInternal = Record<string, unknown>;
}

declare module 'next/types.js' {
  export type ResolvingMetadata = Record<string, unknown>;
  export type ResolvingViewport = Record<string, unknown>;
}
