'use client';

import type { SocialMediaType } from '@carloi-v4/types';
import { useEffect, useState } from 'react';
import { resolveWebMediaUrl } from '../lib/media-url';

type WebMediaViewProps = {
  uri: string | null | undefined;
  mediaType: SocialMediaType;
  alt: string;
  className?: string;
  placeholderClassName?: string;
  placeholderLabel?: string;
  controls?: boolean;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  preload?: 'none' | 'metadata' | 'auto';
};

export function WebMediaView({
  uri,
  mediaType,
  alt,
  className,
  placeholderClassName,
  placeholderLabel = 'CARLOI',
  controls = false,
  autoPlay = false,
  muted = false,
  loop = false,
  preload = 'metadata',
}: WebMediaViewProps) {
  const normalizedUri = resolveWebMediaUrl(uri);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [mediaType, normalizedUri]);

  if (!normalizedUri || failed) {
    return (
      <div className={placeholderClassName ?? 'profile-tile-fallback'}>
        {failed ? 'MEDYA' : placeholderLabel}
      </div>
    );
  }

  if (mediaType === 'VIDEO') {
    return (
      <video
        autoPlay={autoPlay}
        className={className}
        controls={controls}
        loop={loop}
        muted={muted}
        onError={() => setFailed(true)}
        playsInline
        preload={preload}
        src={normalizedUri}
      />
    );
  }

  return (
    <img
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setFailed(true)}
      src={normalizedUri}
    />
  );
}
