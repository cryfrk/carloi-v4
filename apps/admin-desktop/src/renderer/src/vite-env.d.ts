declare global {
  interface Window {
    carloiDesktop: {
      platform: string;
      versions: Record<string, string>;
    };
  }
}

export {};
