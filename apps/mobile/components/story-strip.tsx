import type { StoryFeedGroup, StoryItem, StoryViewerItem } from '@carloi-v4/types';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { mobileSocialApi } from '../lib/social-api';

type StoryStripProps = {
  accessToken: string;
  currentUserId: string;
  onCreateStory: () => void;
  onError: (message: string) => void;
  refreshKey?: number;
};

function StorySkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, index) => (
        <View key={index} style={styles.storyBubble}>
          <View style={[styles.storyRing, styles.storyRingSkeleton]}>
            <View style={styles.storyAvatarSkeleton} />
          </View>
          <View style={styles.storyLabelSkeleton} />
        </View>
      ))}
    </>
  );
}

export function StoryStrip({
  accessToken,
  currentUserId,
  onCreateStory,
  onError,
  refreshKey = 0,
}: StoryStripProps) {
  const [groups, setGroups] = useState<StoryFeedGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeGroupIndex, setActiveGroupIndex] = useState<number | null>(null);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [viewerItems, setViewerItems] = useState<StoryViewerItem[]>([]);
  const [loadingViewers, setLoadingViewers] = useState(false);

  const activeGroup = activeGroupIndex !== null ? groups[activeGroupIndex] ?? null : null;
  const activeStory = activeGroup?.stories[activeStoryIndex] ?? null;
  const hasOwnStories = useMemo(
    () => groups.some((group) => group.owner.id === currentUserId && group.stories.length > 0),
    [currentUserId, groups],
  );

  useEffect(() => {
    setLoading(true);

    void mobileSocialApi
      .getStoriesFeed(accessToken)
      .then((response) => {
        setGroups(response.items);
      })
      .catch((error) => {
        onError(error instanceof Error ? error.message : 'Story akisi yuklenemedi.');
      })
      .finally(() => setLoading(false));
  }, [accessToken, onError, refreshKey]);

  useEffect(() => {
    if (!activeStory) {
      setProgress(0);
      setViewerItems([]);
      return;
    }

    void mobileSocialApi.viewStory(accessToken, activeStory.id).catch(() => undefined);
    setGroups((current) =>
      current.map((group) => ({
        ...group,
        hasUnviewed: group.owner.id === activeStory.owner.id ? false : group.hasUnviewed,
        stories: group.stories.map((story) =>
          story.id === activeStory.id ? { ...story, viewedByMe: true } : story,
        ),
      })),
    );

    setProgress(0);
    const durationMs = 15000;
    const stepMs = 250;
    const interval = setInterval(() => {
      setProgress((current) => {
        const next = current + stepMs / durationMs;
        return next >= 1 ? 1 : next;
      });
    }, stepMs);
    const timeout = setTimeout(() => {
      advanceStory(1);
    }, durationMs);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [accessToken, activeStory?.id]);

  function openGroup(groupIndex: number) {
    setActiveGroupIndex(groupIndex);
    setActiveStoryIndex(0);
    setViewerItems([]);
  }

  function closeViewer() {
    setActiveGroupIndex(null);
    setActiveStoryIndex(0);
    setViewerItems([]);
    setProgress(0);
  }

  function advanceStory(direction: -1 | 1) {
    if (!activeGroup) {
      return;
    }

    const nextStoryIndex = activeStoryIndex + direction;

    if (nextStoryIndex >= 0 && nextStoryIndex < activeGroup.stories.length) {
      setActiveStoryIndex(nextStoryIndex);
      return;
    }

    const nextGroupIndex = (activeGroupIndex ?? 0) + direction;
    const nextGroup = groups[nextGroupIndex];

    if (!nextGroup) {
      closeViewer();
      return;
    }

    setActiveGroupIndex(nextGroupIndex);
    setActiveStoryIndex(direction > 0 ? 0 : Math.max(0, nextGroup.stories.length - 1));
    setViewerItems([]);
  }

  async function loadViewers(story: StoryItem) {
    setLoadingViewers(true);

    try {
      const response = await mobileSocialApi.getStoryViewers(accessToken, story.id);
      setViewerItems(response.items);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Story izleyenleri yuklenemedi.');
    } finally {
      setLoadingViewers(false);
    }
  }

  async function deleteActiveStory() {
    if (!activeStory) {
      return;
    }

    try {
      await mobileSocialApi.deleteStory(accessToken, activeStory.id);
      setGroups((current) =>
        current
          .map((group) => ({
            ...group,
            stories: group.stories.filter((story) => story.id !== activeStory.id),
          }))
          .filter((group) => group.stories.length > 0),
      );
      closeViewer();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Story silinemedi.');
    }
  }

  return (
    <>
      <View style={styles.container}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stripRow}>
          <Pressable onPress={onCreateStory} style={styles.storyBubble}>
            <View style={[styles.storyRing, styles.ownStoryRing]}>
              <View style={styles.ownStoryInner}>
                <Text style={styles.plusLabel}>+</Text>
              </View>
            </View>
            <Text numberOfLines={1} style={styles.storyLabel}>
              {hasOwnStories ? 'Hikayen' : 'Ekle'}
            </Text>
          </Pressable>

          {loading ? (
            <StorySkeleton />
          ) : (
            groups.map((group, index) => (
              <Pressable key={group.owner.id} onPress={() => openGroup(index)} style={styles.storyBubble}>
                <View style={[styles.storyRing, group.hasUnviewed ? styles.storyRingActive : styles.storyRingViewed]}>
                  {group.owner.avatarUrl ? (
                    <Image source={{ uri: group.owner.avatarUrl }} style={styles.storyAvatarImage} />
                  ) : (
                    <View style={styles.storyFallback}>
                      <Text style={styles.storyFallbackLabel}>{group.owner.username.slice(0, 1).toUpperCase()}</Text>
                    </View>
                  )}
                </View>
                <Text numberOfLines={1} style={styles.storyLabel}>
                  @{group.owner.username}
                </Text>
              </Pressable>
            ))
          )}
        </ScrollView>
      </View>

      <Modal visible={Boolean(activeStory)} transparent animationType="fade" onRequestClose={closeViewer}>
        <View style={styles.modalBackdrop}>
          <View style={styles.viewerCard}>
            {activeGroup ? (
              <View style={styles.progressRow}>
                {activeGroup.stories.map((story, index) => {
                  const width =
                    index < activeStoryIndex
                      ? ('100%' as `${number}%`)
                      : index === activeStoryIndex
                        ? (`${Math.round(progress * 100)}%` as `${number}%`)
                        : ('0%' as `${number}%`);
                  return (
                    <View key={story.id} style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width }]} />
                    </View>
                  );
                })}
              </View>
            ) : null}

            {activeStory ? (
              <>
                <View style={styles.viewerHeader}>
                  <View style={styles.viewerOwner}>
                    <Text style={styles.viewerOwnerName}>@{activeStory.owner.username}</Text>
                    <Text style={styles.viewerMeta}>
                      {new Date(activeStory.createdAt).toLocaleTimeString('tr-TR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                  <Pressable onPress={closeViewer}>
                    <Text style={styles.closeLabel}>Kapat</Text>
                  </Pressable>
                </View>

                <View style={styles.viewerMediaShell}>
                  {activeStory.media?.mediaType === 'IMAGE' ? (
                    <Image source={{ uri: activeStory.media.url }} style={styles.viewerMedia} resizeMode="cover" />
                  ) : (
                    <View style={styles.viewerVideoPlaceholder}>
                      <Text style={styles.viewerVideoLabel}>VIDEO STORY</Text>
                      <Text style={styles.viewerVideoUrl}>{activeStory.media?.url ?? 'Video bulunamadi.'}</Text>
                    </View>
                  )}
                  <View style={styles.viewerTapRow}>
                    <Pressable style={styles.viewerTapZone} onPress={() => advanceStory(-1)} />
                    <Pressable style={styles.viewerTapZone} onPress={() => advanceStory(1)} />
                  </View>
                </View>

                <View style={styles.viewerFooter}>
                  <View style={styles.viewerCopy}>
                    {activeStory.caption ? <Text style={styles.viewerCaption}>{activeStory.caption}</Text> : null}
                    <Text style={styles.viewerMeta}>{activeStory.locationText ?? 'Konum eklenmedi'} · 24 saatlik hikaye</Text>
                  </View>
                  {activeStory.owner.id === currentUserId ? (
                    <View style={styles.viewerActions}>
                      <Pressable style={styles.inlineButton} onPress={() => void loadViewers(activeStory)}>
                        <Text style={styles.inlineButtonLabel}>
                          {loadingViewers ? 'Izleyenler...' : `Izleyenler (${activeStory.viewerCount ?? 0})`}
                        </Text>
                      </Pressable>
                      <Pressable style={styles.inlineButton} onPress={() => void deleteActiveStory()}>
                        <Text style={styles.inlineButtonLabel}>Sil</Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>

                {viewerItems.length > 0 ? (
                  <View style={styles.viewerListCard}>
                    {viewerItems.map((item) => (
                      <View key={item.id} style={styles.viewerRow}>
                        <Text style={styles.viewerRowName}>@{item.viewer.username}</Text>
                        <Text style={styles.viewerRowMeta}>
                          {new Date(item.viewedAt).toLocaleTimeString('tr-TR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 4,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eceff3',
  },
  stripRow: {
    gap: 12,
    paddingHorizontal: 14,
  },
  storyBubble: {
    width: 74,
    alignItems: 'center',
    gap: 6,
  },
  storyRing: {
    width: 72,
    height: 72,
    borderRadius: 999,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyRingActive: {
    backgroundColor: '#f97316',
  },
  storyRingViewed: {
    backgroundColor: '#d7dde4',
  },
  ownStoryRing: {
    backgroundColor: '#e8eef4',
  },
  ownStoryInner: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e7eaee',
  },
  plusLabel: {
    color: '#111111',
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 30,
  },
  storyAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  storyFallback: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  storyFallbackLabel: {
    color: '#111111',
    fontSize: 22,
    fontWeight: '800',
  },
  storyLabel: {
    width: '100%',
    color: '#111111',
    fontSize: 11,
    textAlign: 'center',
  },
  storyRingSkeleton: {
    backgroundColor: '#ebeff3',
  },
  storyAvatarSkeleton: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#f5f7fa',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  storyLabelSkeleton: {
    width: 48,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#eceff3',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(4,10,16,0.88)',
    padding: 16,
    justifyContent: 'center',
  },
  viewerCard: {
    gap: 14,
    padding: 16,
    borderRadius: 28,
    backgroundColor: '#08131d',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  progressRow: {
    flexDirection: 'row',
    gap: 6,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#ef8354',
  },
  viewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  viewerOwner: {
    gap: 4,
  },
  viewerOwnerName: {
    color: '#f8f2ea',
    fontWeight: '800',
    fontSize: 16,
  },
  viewerMeta: {
    color: '#9eb0be',
    fontSize: 12,
  },
  closeLabel: {
    color: '#ffd6c2',
    fontWeight: '800',
  },
  viewerMediaShell: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 24,
    backgroundColor: '#0d1d2a',
    aspectRatio: 0.62,
  },
  viewerMedia: {
    width: '100%',
    height: '100%',
  },
  viewerVideoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 8,
  },
  viewerVideoLabel: {
    color: '#ffd6c2',
    fontWeight: '800',
  },
  viewerVideoUrl: {
    color: '#d4dfe7',
    textAlign: 'center',
  },
  viewerTapRow: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
  },
  viewerTapZone: {
    flex: 1,
  },
  viewerFooter: {
    gap: 12,
  },
  viewerCopy: {
    gap: 6,
  },
  viewerCaption: {
    color: '#f8f2ea',
    lineHeight: 22,
  },
  viewerActions: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  inlineButton: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(239,131,84,0.16)',
  },
  inlineButtonLabel: {
    color: '#ffd6c2',
    fontWeight: '800',
    fontSize: 12,
  },
  viewerListCard: {
    gap: 10,
    paddingTop: 8,
  },
  viewerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  viewerRowName: {
    color: '#f8f2ea',
    fontWeight: '700',
  },
  viewerRowMeta: {
    color: '#9eb0be',
    fontSize: 12,
  },
});
