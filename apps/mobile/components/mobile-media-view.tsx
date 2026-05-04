import type { SocialMediaType } from '@carloi-v4/types';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useEffect, useState } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  View,
  type ImageStyle,
  type ImageResizeMode,
  type StyleProp,
} from 'react-native';
import { resolveMobileMediaUrl } from '../lib/media-url';

type MobileMediaViewProps = {
  uri: string | null | undefined;
  mediaType: SocialMediaType;
  style?: StyleProp<ImageStyle>;
  resizeMode?: ImageResizeMode;
  nativeControls?: boolean;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
};

export function MobileMediaView({
  uri,
  mediaType,
  style,
  resizeMode = 'cover',
  nativeControls = false,
  autoPlay = false,
  muted,
  loop,
}: MobileMediaViewProps) {
  const normalizedUri = resolveMobileMediaUrl(uri);
  const [imageFailed, setImageFailed] = useState(false);
  const player = useVideoPlayer(mediaType === 'VIDEO' ? normalizedUri ?? null : null, (instance) => {
    instance.loop = loop ?? autoPlay;
    instance.muted = muted ?? !nativeControls;

    if (autoPlay) {
      instance.play();
    } else {
      instance.pause();
    }
  });

  useEffect(() => {
    setImageFailed(false);
  }, [mediaType, normalizedUri]);

  useEffect(() => {
    if (mediaType !== 'VIDEO') {
      return;
    }

    player.loop = loop ?? autoPlay;
    player.muted = muted ?? !nativeControls;

    if (autoPlay) {
      player.play();
    } else {
      player.pause();
    }
  }, [autoPlay, loop, mediaType, muted, nativeControls, player]);

  if (!normalizedUri || imageFailed) {
    return (
      <View style={[styles.placeholder, style]}>
        <Text style={styles.placeholderLabel}>{imageFailed ? 'Medya goruntulenemedi' : 'Medya hazirlaniyor'}</Text>
      </View>
    );
  }

  if (mediaType === 'VIDEO') {
    return (
      <VideoView
        allowsPictureInPicture={false}
        contentFit={resizeMode === 'contain' ? 'contain' : 'cover'}
        nativeControls={nativeControls}
        player={player}
        style={style}
      />
    );
  }

  return (
    <Image
      onError={() => setImageFailed(true)}
      source={{ uri: normalizedUri }}
      style={style}
      resizeMode={resizeMode}
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef1f4',
  },
  placeholderLabel: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '700',
  },
});
