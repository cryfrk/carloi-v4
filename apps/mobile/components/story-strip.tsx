import type { StoryFeedGroup, StoryItem, StoryViewerItem, StoryViewersResponse } from '@carloi-v4/types';
import { useEffect, useMemo, useRef, useState } from 'react';
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
import { demoStoryAnalyticsById, demoStoryGroups } from '../lib/demo-content';
import { resolveMobileMediaUrl } from '../lib/media-url';
import { mobileSocialApi } from '../lib/social-api';
import { MobileMediaView } from './mobile-media-view';

type StoryStripProps = {
  accessToken: string;
  currentUserId: string;
  onCreateStory: () => void;
  onError: (message: string) => void;
  refreshKey?: number;
};

type AnalyticsTab = 'viewers' | 'likes';

const IMAGE_STORY_DURATION_MS = 6200;
const VIDEO_STORY_DURATION_MS = 9000;
const HOLD_THRESHOLD_MS = 220;

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

function formatStoryTime(value: string) {
  return new Date(value).toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function StoryStrip({
  accessToken,
  currentUserId,
  onCreateStory,
  onError,
  refreshKey = 0,
}: StoryStripProps) {
  const [groups, setGroups] = useState<StoryFeedGroup[]>([]);
  const [demoGroupsState, setDemoGroupsState] = useState<StoryFeedGroup[]>(demoStoryGroups);
  const [loading, setLoading] = useState(true);
  const [activeGroupIndex, setActiveGroupIndex] = useState<number | null>(null);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [viewerPaused, setViewerPaused] = useState(false);
  const [viewerItems, setViewerItems] = useState<StoryViewerItem[]>([]);
  const [likerItems, setLikerItems] = useState<StoryViewerItem[]>([]);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [analyticsTab, setAnalyticsTab] = useState<AnalyticsTab>('viewers');

  const animationFrameRef = useRef<number | null>(null);
  const holdStartedAtRef = useRef(0);
  const elapsedBeforePauseRef = useRef(0);
  const segmentStartedAtRef = useRef(0);

  const usingDemoGroups = !loading && groups.length === 0;
  const displayedGroups = usingDemoGroups ? demoGroupsState : groups;
  const activeGroup = activeGroupIndex !== null ? displayedGroups[activeGroupIndex] ?? null : null;
  const activeStory = activeGroup?.stories[activeStoryIndex] ?? null;
  const hasOwnStories = useMemo(
    () => displayedGroups.some((group) => group.owner.id === currentUserId && group.stories.length > 0),
    [currentUserId, displayedGroups],
  );
  const isOwnActiveStory = Boolean(activeStory && activeStory.owner.id === currentUserId);

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

  function stopProgress() {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }

  function closeAnalytics() {
    setAnalyticsOpen(false);
    setLoadingAnalytics(false);
  }

  function closeViewer() {
    stopProgress();
    setActiveGroupIndex(null);
    setActiveStoryIndex(0);
    setViewerItems([]);
    setLikerItems([]);
    setProgress(0);
    setViewerPaused(false);
    setAnalyticsOpen(false);
    elapsedBeforePauseRef.current = 0;
    segmentStartedAtRef.current = 0;
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
    const nextGroup = displayedGroups[nextGroupIndex];

    if (!nextGroup) {
      closeViewer();
      return;
    }

    setActiveGroupIndex(nextGroupIndex);
    setActiveStoryIndex(direction > 0 ? 0 : Math.max(0, nextGroup.stories.length - 1));
    setViewerItems([]);
    setLikerItems([]);
    setAnalyticsOpen(false);
  }

  function pauseProgress() {
    if (!activeStory || viewerPaused) {
      return;
    }

    elapsedBeforePauseRef.current += Math.max(0, Date.now() - segmentStartedAtRef.current);
    stopProgress();
    setViewerPaused(true);
  }

  function resumeProgress() {
    if (!activeStory) {
      return;
    }

    const durationMs = activeStory.media?.mediaType === 'VIDEO' ? VIDEO_STORY_DURATION_MS : IMAGE_STORY_DURATION_MS;
    segmentStartedAtRef.current = Date.now();
    setViewerPaused(false);
    stopProgress();

    const tick = () => {
      const elapsed = elapsedBeforePauseRef.current + Math.max(0, Date.now() - segmentStartedAtRef.current);
      const nextProgress = Math.min(elapsed / durationMs, 1);
      setProgress(nextProgress);

      if (nextProgress >= 1) {
        elapsedBeforePauseRef.current = 0;
        setProgress(0);
        advanceStory(1);
        return;
      }

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);
  }

  function markStoryViewed(story: StoryItem) {
    const updateGroupCollection = (collection: StoryFeedGroup[]) =>
      collection.map((group) => ({
        ...group,
        hasUnviewed:
          group.owner.id === story.owner.id
            ? group.stories.some((item) => (item.id === story.id ? false : !item.viewedByMe))
            : group.hasUnviewed,
        stories: group.stories.map((item) =>
          item.id === story.id ? { ...item, viewedByMe: true } : item,
        ),
      }));

    if (story.id.startsWith('demo-story-')) {
      setDemoGroupsState(updateGroupCollection);
      return;
    }

    setGroups(updateGroupCollection);
  }

  useEffect(() => {
    if (!activeStory) {
      stopProgress();
      setProgress(0);
      setViewerPaused(false);
      setViewerItems([]);
      setLikerItems([]);
      setAnalyticsOpen(false);
      elapsedBeforePauseRef.current = 0;
      segmentStartedAtRef.current = 0;
      return;
    }

    if (!activeStory.id.startsWith('demo-story-')) {
      void mobileSocialApi.viewStory(accessToken, activeStory.id).catch(() => undefined);
    }

    if (!activeStory.viewedByMe) {
      markStoryViewed(activeStory);
    }

    elapsedBeforePauseRef.current = 0;
    setProgress(0);
    setViewerPaused(false);
    resumeProgress();

    return () => {
      stopProgress();
    };
  }, [accessToken, activeStory?.id]);

  function openGroup(groupIndex: number) {
    setActiveGroupIndex(groupIndex);
    setActiveStoryIndex(0);
    setViewerItems([]);
    setLikerItems([]);
    closeAnalytics();
  }

  async function openAnalytics(tab: AnalyticsTab) {
    if (!activeStory) {
      return;
    }

    setAnalyticsTab(tab);
    setAnalyticsOpen(true);

    if (activeStory.id.startsWith('demo-story-')) {
      const analytics = demoStoryAnalyticsById[activeStory.id];
      setViewerItems(analytics?.viewers ?? []);
      setLikerItems(analytics?.likers ?? []);
      return;
    }

    setLoadingAnalytics(true);

    try {
      const response: StoryViewersResponse = await mobileSocialApi.getStoryViewers(accessToken, activeStory.id);
      setViewerItems(response.items);
      // TODO: Backend begenenler endpointi hazir oldugunda bu placeholder kaldirilacak.
      setLikerItems(response.items.slice(0, Math.min(3, response.items.length)));
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Story analitikleri yuklenemedi.');
      setViewerItems([]);
      setLikerItems([]);
    } finally {
      setLoadingAnalytics(false);
    }
  }

  async function deleteActiveStory() {
    if (!activeStory) {
      return;
    }

    if (activeStory.id.startsWith('demo-story-')) {
      setDemoGroupsState((current) =>
        current
          .map((group) => ({
            ...group,
            stories: group.stories.filter((story) => story.id !== activeStory.id),
          }))
          .filter((group) => group.stories.length > 0),
      );
      closeViewer();
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

  function handleViewerPressIn() {
    holdStartedAtRef.current = Date.now();
    pauseProgress();
  }

  function handleViewerPressOut(direction: -1 | 1) {
    const heldFor = Date.now() - holdStartedAtRef.current;
    resumeProgress();

    if (heldFor < HOLD_THRESHOLD_MS) {
      advanceStory(direction);
    }
  }

  const analyticsItems = analyticsTab === 'viewers' ? viewerItems : likerItems;

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
            displayedGroups.map((group, index) => (
              <Pressable key={group.owner.id} onPress={() => openGroup(index)} style={styles.storyBubble}>
                <View style={[styles.storyRing, group.hasUnviewed ? styles.storyRingActive : styles.storyRingViewed]}>
                  {resolveMobileMediaUrl(group.owner.avatarUrl) ? (
                    <Image
                      source={{ uri: resolveMobileMediaUrl(group.owner.avatarUrl)! }}
                      style={styles.storyAvatarImage}
                    />
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

      <Modal visible={Boolean(activeStory)} animationType="fade" statusBarTranslucent transparent onRequestClose={closeViewer}>
        <View style={styles.viewerScreen}>
          {activeStory ? (
            <>
              <View style={styles.progressRow}>
                {activeGroup?.stories.map((story, index) => {
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

              <View style={styles.viewerHeader}>
                <View style={styles.viewerOwnerRow}>
                  <View style={styles.viewerOwnerAvatar}>
                    <Text style={styles.viewerOwnerAvatarLabel}>{activeStory.owner.username.slice(0, 1).toUpperCase()}</Text>
                  </View>
                  <View style={styles.viewerOwnerCopy}>
                    <Text style={styles.viewerOwnerName}>@{activeStory.owner.username}</Text>
                    <Text style={styles.viewerOwnerMeta}>{formatStoryTime(activeStory.createdAt)}</Text>
                  </View>
                </View>
                <Pressable onPress={closeViewer} style={styles.closeButton}>
                  <Text style={styles.closeLabel}>Kapat</Text>
                </Pressable>
              </View>

              <View style={styles.viewerMediaShell}>
                {activeStory.media ? (
                  <MobileMediaView
                    autoPlay={!viewerPaused && activeStory.media.mediaType === 'VIDEO'}
                    loop
                    mediaType={activeStory.media.mediaType}
                    muted={false}
                    nativeControls={false}
                    resizeMode="cover"
                    style={styles.viewerMedia}
                    uri={activeStory.media.url}
                  />
                ) : (
                  <View style={styles.viewerPlaceholder}>
                    <Text style={styles.viewerPlaceholderLabel}>Story medyasi hazirlaniyor</Text>
                  </View>
                )}
                <View style={styles.viewerTapRow}>
                  <Pressable
                    onPressIn={handleViewerPressIn}
                    onPressOut={() => handleViewerPressOut(-1)}
                    style={styles.viewerTapZone}
                  />
                  <Pressable
                    onPressIn={handleViewerPressIn}
                    onPressOut={() => handleViewerPressOut(1)}
                    style={styles.viewerTapZone}
                  />
                </View>
                <View style={styles.viewerOverlayCopy}>
                  {activeStory.caption ? <Text style={styles.viewerCaption}>{activeStory.caption}</Text> : null}
                  <Text style={styles.viewerMetaLine}>{activeStory.locationText ?? 'Konum etiketi eklenmedi'}</Text>
                </View>
              </View>

              <View style={styles.viewerFooter}>
                <View style={styles.viewerHintRow}>
                  <Text style={styles.viewerHint}>Sol/sağ dokunarak ilerle, basılı tutarak duraklat.</Text>
                </View>
                {isOwnActiveStory ? (
                  <View style={styles.viewerActions}>
                    <Pressable style={styles.inlineButton} onPress={() => void openAnalytics('viewers')}>
                      <Text style={styles.inlineButtonLabel}>Gorenler ({activeStory.viewerCount ?? viewerItems.length})</Text>
                    </Pressable>
                    <Pressable style={styles.inlineButton} onPress={() => void openAnalytics('likes')}>
                      <Text style={styles.inlineButtonLabel}>Begenenler</Text>
                    </Pressable>
                    <Pressable style={styles.inlineButtonDanger} onPress={() => void deleteActiveStory()}>
                      <Text style={styles.inlineButtonDangerLabel}>Sil</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            </>
          ) : null}

          {analyticsOpen ? (
            <View style={styles.analyticsBackdrop}>
              <Pressable style={styles.analyticsDismissArea} onPress={closeAnalytics} />
              <View style={styles.analyticsSheet}>
                <View style={styles.analyticsHandle} />
                <View style={styles.analyticsTabRow}>
                  <Pressable style={[styles.analyticsTab, analyticsTab === 'viewers' ? styles.analyticsTabActive : null]} onPress={() => setAnalyticsTab('viewers')}>
                    <Text style={[styles.analyticsTabLabel, analyticsTab === 'viewers' ? styles.analyticsTabLabelActive : null]}>Gorenler</Text>
                  </Pressable>
                  <Pressable style={[styles.analyticsTab, analyticsTab === 'likes' ? styles.analyticsTabActive : null]} onPress={() => setAnalyticsTab('likes')}>
                    <Text style={[styles.analyticsTabLabel, analyticsTab === 'likes' ? styles.analyticsTabLabelActive : null]}>Begenenler</Text>
                  </Pressable>
                </View>
                {loadingAnalytics ? (
                  <View style={styles.analyticsLoading}>
                    <ActivityIndicator color="#111111" />
                    <Text style={styles.analyticsEmptyCopy}>Liste hazirlaniyor...</Text>
                  </View>
                ) : analyticsItems.length > 0 ? (
                  <ScrollView style={styles.analyticsList} contentContainerStyle={styles.analyticsListContent}>
                    {analyticsItems.map((item) => (
                      <View key={item.id} style={styles.analyticsRow}>
                        <View>
                          <Text style={styles.analyticsRowTitle}>@{item.viewer.username}</Text>
                          <Text style={styles.analyticsRowMeta}>{item.viewer.firstName} {item.viewer.lastName}</Text>
                        </View>
                        <Text style={styles.analyticsRowTime}>{formatStoryTime(item.viewedAt)}</Text>
                      </View>
                    ))}
                  </ScrollView>
                ) : (
                  <View style={styles.analyticsLoading}>
                    <Text style={styles.analyticsEmptyTitle}>Henuz hareket yok</Text>
                    <Text style={styles.analyticsEmptyCopy}>
                      {analyticsTab === 'likes'
                        ? 'Begenenler endpointi hazir olana kadar burada demo veya lokal veri gosteriyoruz.'
                        : 'Bu hikaye icin izleyen listesi henuz olusmadi.'}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ) : null}
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
  viewerScreen: {
    flex: 1,
    backgroundColor: '#050b12',
    paddingTop: 18,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#ffffff',
  },
  viewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  viewerOwnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  viewerOwnerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  viewerOwnerAvatarLabel: {
    color: '#ffffff',
    fontWeight: '800',
  },
  viewerOwnerCopy: {
    gap: 2,
  },
  viewerOwnerName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  viewerOwnerMeta: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 11.5,
  },
  closeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  closeLabel: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
  viewerMediaShell: {
    flex: 1,
    position: 'relative',
    marginHorizontal: 10,
    marginBottom: 12,
    overflow: 'hidden',
    borderRadius: 28,
    backgroundColor: '#0f1720',
  },
  viewerMedia: {
    width: '100%',
    height: '100%',
  },
  viewerPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f1720',
  },
  viewerPlaceholderLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '700',
  },
  viewerTapRow: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
  },
  viewerTapZone: {
    flex: 1,
  },
  viewerOverlayCopy: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    gap: 6,
  },
  viewerCaption: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 21,
  },
  viewerMetaLine: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 12,
  },
  viewerFooter: {
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 16,
  },
  viewerHintRow: {
    alignItems: 'center',
  },
  viewerHint: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11.5,
    textAlign: 'center',
  },
  viewerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  inlineButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  inlineButtonLabel: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  inlineButtonDanger: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(248,113,113,0.18)',
  },
  inlineButtonDangerLabel: {
    color: '#fecaca',
    fontSize: 12,
    fontWeight: '700',
  },
  analyticsBackdrop: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  analyticsDismissArea: {
    flex: 1,
  },
  analyticsSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    minHeight: 320,
    maxHeight: '58%',
  },
  analyticsHandle: {
    width: 44,
    height: 5,
    borderRadius: 999,
    alignSelf: 'center',
    marginBottom: 14,
    backgroundColor: '#d1d5db',
  },
  analyticsTabRow: {
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 14,
  },
  analyticsTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#f3f4f6',
  },
  analyticsTabActive: {
    backgroundColor: '#111111',
  },
  analyticsTabLabel: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '700',
  },
  analyticsTabLabelActive: {
    color: '#ffffff',
  },
  analyticsLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 28,
  },
  analyticsEmptyTitle: {
    color: '#111111',
    fontWeight: '700',
  },
  analyticsEmptyCopy: {
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  analyticsList: {
    flex: 1,
  },
  analyticsListContent: {
    gap: 10,
  },
  analyticsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eceff3',
  },
  analyticsRowTitle: {
    color: '#111111',
    fontWeight: '700',
  },
  analyticsRowMeta: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 2,
  },
  analyticsRowTime: {
    color: '#9aa3af',
    fontSize: 12,
  },
});
