import { Ionicons } from '@expo/vector-icons';
import type { FeedPost, SocialComment } from '@carloi-v4/types';
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { MobileMediaView } from '../components/mobile-media-view';
import { MobileShell } from '../components/mobile-shell';
import { StoryStrip } from '../components/story-strip';
import { useAuth } from '../context/auth-context';
import { demoFeedComments, demoFeedPosts } from '../lib/demo-content';
import { mobileDemoContentEnabled } from '../lib/demo-runtime';
import { resolveMobileMediaUrl } from '../lib/media-url';
import { mobileSocialApi } from '../lib/social-api';

type CommentsState = Record<string, SocialComment[]>;
type DraftState = Record<string, string>;
type ExpandedState = Record<string, boolean>;
type LoadingCommentsState = Record<string, boolean>;
type OpenCommentsState = Record<string, boolean>;

type PostSkeletonProps = {
  mediaWidth: number;
};

function FeedSkeleton({ mediaWidth }: PostSkeletonProps) {
  return (
    <View style={styles.skeletonStack}>
      {Array.from({ length: 2 }).map((_, index) => (
        <View key={index} style={styles.skeletonPost}>
          <View style={styles.skeletonHeader}>
            <View style={styles.skeletonAvatar} />
            <View style={styles.skeletonHeaderCopy}>
              <View style={styles.skeletonLineShort} />
              <View style={styles.skeletonLineTiny} />
            </View>
          </View>
          <View style={[styles.skeletonMedia, { width: mediaWidth }]} />
          <View style={styles.skeletonActions}>
            <View style={styles.skeletonActionDot} />
            <View style={styles.skeletonActionDot} />
            <View style={styles.skeletonActionDot} />
          </View>
          <View style={styles.skeletonLineMedium} />
          <View style={styles.skeletonLineLong} />
          <View style={styles.skeletonLineMedium} />
        </View>
      ))}
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { width } = useWindowDimensions();
  const [feed, setFeed] = useState<FeedPost[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [expandedCaptions, setExpandedCaptions] = useState<ExpandedState>({});
  const [commentsByPost, setCommentsByPost] = useState<CommentsState>({});
  const [commentDrafts, setCommentDrafts] = useState<DraftState>({});
  const [loadingComments, setLoadingComments] = useState<LoadingCommentsState>({});
  const [openComments, setOpenComments] = useState<OpenCommentsState>({});
  const [storyRefreshKey, setStoryRefreshKey] = useState(0);
  const [demoFeedState, setDemoFeedState] = useState<FeedPost[]>(() => (mobileDemoContentEnabled ? demoFeedPosts : []));

  const mediaWidth = useMemo(() => Math.max(320, width), [width]);
  const maybeAccessToken = session?.accessToken;
  const maybeCurrentUserId = session?.user.id;
  const demoMode = mobileDemoContentEnabled && !loading && feed.length === 0;
  const showRealEmptyState = !loading && !demoMode && feed.length === 0;
  const displayedFeed = demoMode ? demoFeedState : feed;

  useEffect(() => {
    if (maybeAccessToken) {
      void loadFeed(true);
    }
  }, [maybeAccessToken]);

  if (!maybeAccessToken || !maybeCurrentUserId) {
    return <Redirect href="/login" />;
  }

  const accessToken: string = maybeAccessToken;
  const currentUserId: string = maybeCurrentUserId;

  async function loadFeed(reset: boolean) {
    const cursor = reset ? undefined : nextCursor ?? undefined;

    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    setErrorMessage(null);

    try {
      const response = await mobileSocialApi.getFeed(accessToken, cursor);
      setFeed((current) => (reset ? response.items : [...current, ...response.items]));
      setNextCursor(response.nextCursor);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Feed su anda yuklenemedi.');
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }

  function patchPost(postId: string, updater: (post: FeedPost) => FeedPost) {
    setFeed((current) => current.map((post) => (post.id === postId ? updater(post) : post)));
  }

  function patchDemoPost(postId: string, updater: (post: FeedPost) => FeedPost) {
    setDemoFeedState((current) => current.map((post) => (post.id === postId ? updater(post) : post)));
  }

  function patchOwner(ownerId: string, following: boolean) {
    setFeed((current) =>
      current.map((post) =>
        post.owner.id === ownerId
          ? { ...post, owner: { ...post.owner, isFollowing: following } }
          : post,
      ),
    );
  }

  async function handleLike(post: FeedPost) {
    if (post.id.startsWith('demo-')) {
      patchDemoPost(post.id, (current) => ({
        ...current,
        isLiked: !current.isLiked,
        likeCount: current.likeCount + (current.isLiked ? -1 : 1),
      }));
      return;
    }

    try {
      const response = post.isLiked
        ? await mobileSocialApi.unlikePost(accessToken, post.id)
        : await mobileSocialApi.likePost(accessToken, post.id);

      patchPost(post.id, (current) => ({
        ...current,
        likeCount: response.likeCount,
        commentCount: response.commentCount,
        isLiked: response.isLiked,
        isSaved: response.isSaved,
      }));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Post etkilesimi tamamlanamadi.');
    }
  }

  async function handleSave(post: FeedPost) {
    if (post.id.startsWith('demo-')) {
      patchDemoPost(post.id, (current) => ({
        ...current,
        isSaved: !current.isSaved,
      }));
      setNotice('Bu ornek gonderi kaydedildi. Gercek gonderiler profilindeki Kaydedilenler alaninda toplanir.');
      return;
    }

    try {
      const response = post.isSaved
        ? await mobileSocialApi.unsavePost(accessToken, post.id)
        : await mobileSocialApi.savePost(accessToken, post.id);

      patchPost(post.id, (current) => ({
        ...current,
        likeCount: response.likeCount,
        commentCount: response.commentCount,
        isLiked: response.isLiked,
        isSaved: response.isSaved,
      }));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Kaydetme islemi tamamlanamadi.');
    }
  }

  async function handleFollow(post: FeedPost) {
    if (post.id.startsWith('demo-')) {
      setNotice('Bu bir onboarding hesabi. Gercek akista kullanicilari takip edip feedini sekillendirebilirsin.');
      return;
    }

    try {
      const response = post.owner.isFollowing
        ? await mobileSocialApi.unfollowUser(accessToken, post.owner.id)
        : await mobileSocialApi.followUser(accessToken, post.owner.id);

      patchOwner(post.owner.id, response.following);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Takip islemi tamamlanamadi.');
    }
  }

  async function toggleComments(postId: string) {
    const isOpen = openComments[postId] ?? false;

    setOpenComments((current) => ({
      ...current,
      [postId]: !isOpen,
    }));

    if (!isOpen && postId.startsWith('demo-')) {
      setCommentsByPost((current) => ({
        ...current,
        [postId]: current[postId] ?? demoFeedComments[postId] ?? [],
      }));
      return;
    }

    if (!isOpen && !commentsByPost[postId] && !loadingComments[postId]) {
      setLoadingComments((current) => ({ ...current, [postId]: true }));

      try {
        const response = await mobileSocialApi.getComments(accessToken, postId);
        setCommentsByPost((current) => ({ ...current, [postId]: response.items }));
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Yorumlar alinamadi.');
      } finally {
        setLoadingComments((current) => ({ ...current, [postId]: false }));
      }
    }
  }

  async function handleCreateComment(postId: string) {
    const body = commentDrafts[postId]?.trim();

    if (!body) {
      return;
    }

    if (postId.startsWith('demo-')) {
      const newComment: SocialComment = {
        id: `demo-local-${Date.now()}`,
        body,
        createdAt: new Date().toISOString(),
        parentCommentId: null,
        owner: {
          id: currentUserId,
          username: session?.user.username ?? 'siz',
          firstName: session?.user.firstName ?? 'Siz',
          lastName: session?.user.lastName ?? '',
          avatarUrl: null,
          blueVerified: false,
          goldVerified: false,
        },
        likeCount: 0,
        replyCount: 0,
        isLiked: false,
      };
      setCommentDrafts((current) => ({ ...current, [postId]: '' }));
      setCommentsByPost((current) => ({
        ...current,
        [postId]: [newComment, ...(current[postId] ?? demoFeedComments[postId] ?? [])],
      }));
      setOpenComments((current) => ({ ...current, [postId]: true }));
      patchDemoPost(postId, (current) => ({
        ...current,
        commentCount: current.commentCount + 1,
      }));
      return;
    }

    try {
      const response = await mobileSocialApi.createComment(accessToken, postId, { body });
      setCommentDrafts((current) => ({ ...current, [postId]: '' }));
      setCommentsByPost((current) => ({
        ...current,
        [postId]: [response.comment, ...(current[postId] ?? [])],
      }));
      setOpenComments((current) => ({ ...current, [postId]: true }));
      patchPost(postId, (current) => ({
        ...current,
        commentCount: current.commentCount + 1,
      }));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Yorum gonderilemedi.');
    }
  }

  async function handleCommentLike(postId: string, comment: SocialComment) {
    if (postId.startsWith('demo-')) {
      setCommentsByPost((current) => ({
        ...current,
        [postId]: (current[postId] ?? []).map((item) =>
          item.id === comment.id
            ? { ...item, isLiked: !item.isLiked, likeCount: item.likeCount + (item.isLiked ? -1 : 1) }
            : item,
        ),
      }));
      return;
    }

    try {
      const response = comment.isLiked
        ? await mobileSocialApi.unlikeComment(accessToken, postId, comment.id)
        : await mobileSocialApi.likeComment(accessToken, postId, comment.id);

      setCommentsByPost((current) => ({
        ...current,
        [postId]: (current[postId] ?? []).map((item) =>
          item.id === comment.id
            ? { ...item, isLiked: response.isLiked, likeCount: response.likeCount }
            : item,
        ),
      }));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Yorum begenisi guncellenemedi.');
    }
  }

  function renderMedia(post: FeedPost) {
    return (
      <ScrollView
        horizontal
        pagingEnabled
        removeClippedSubviews
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.mediaTrack}
      >
        {post.media.map((item, index) => (
          <View key={item.id} style={[styles.mediaFrame, { width: mediaWidth }]}>
            <MobileMediaView
              autoPlay={item.mediaType === 'VIDEO'}
              mediaType={item.mediaType}
              nativeControls={item.mediaType === 'VIDEO'}
              style={styles.mediaImage}
              uri={item.url}
            />
            {post.media.length > 1 ? (
              <View style={styles.mediaCounter}>
                <Text style={styles.mediaCounterLabel}>{index + 1}/{post.media.length}</Text>
              </View>
            ) : null}
          </View>
        ))}
      </ScrollView>
    );
  }

  function renderPost({ item: post }: { item: FeedPost }) {
    const comments = commentsByPost[post.id] ?? [];
    const isCaptionExpanded = expandedCaptions[post.id] ?? false;
    const isOwnPost = currentUserId === post.owner.id;

    return (
      <View style={styles.postCard}>
        <View style={styles.postHeader}>
          <View style={styles.ownerBlock}>
            <View style={styles.avatar}>
              {resolveMobileMediaUrl(post.owner.avatarUrl) ? (
                <Image source={{ uri: resolveMobileMediaUrl(post.owner.avatarUrl)! }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarLabel}>{post.owner.username.slice(0, 1).toUpperCase()}</Text>
              )}
            </View>
            <View style={styles.ownerCopy}>
              <View style={styles.ownerRow}>
                <Text style={styles.ownerName}>@{post.owner.username}</Text>
                {post.owner.blueVerified ? <Text style={styles.tickBlue}>Blue</Text> : null}
                {post.owner.goldVerified ? <Text style={styles.tickGold}>Gold</Text> : null}
              </View>
              <Text style={styles.ownerMeta}>{post.locationText || 'Konum eklenmedi'}</Text>
            </View>
          </View>

          {!isOwnPost ? (
            <Pressable onPress={() => void handleFollow(post)} style={styles.followButton}>
              <Text style={styles.followLabel}>{post.owner.isFollowing ? 'Takiptesin' : 'Takip et'}</Text>
            </Pressable>
          ) : null}
        </View>

        {renderMedia(post)}

        <View style={styles.actionsRow}>
          <View style={styles.actionCluster}>
            <Pressable onPress={() => void handleLike(post)} style={styles.iconActionButton}>
              <Ionicons
                color={post.isLiked ? '#ef4444' : '#111111'}
                name={post.isLiked ? 'heart' : 'heart-outline'}
                size={24}
              />
            </Pressable>
            <Pressable onPress={() => void toggleComments(post.id)} style={styles.iconActionButton}>
              <Ionicons color="#111111" name="chatbubble-outline" size={22} />
            </Pressable>
            <Pressable
              onPress={() => setNotice('Paylasim kisayiolu bir sonraki asamada eklenecek.')}
              style={styles.iconActionButton}
            >
              <Ionicons color="#111111" name="paper-plane-outline" size={22} />
            </Pressable>
          </View>
          <Pressable onPress={() => void handleSave(post)} style={styles.iconActionButton}>
            <Ionicons color="#111111" name={post.isSaved ? 'bookmark' : 'bookmark-outline'} size={22} />
          </Pressable>
        </View>

        <View style={styles.metaColumn}>
          <Text style={styles.likeCountText}>{post.likeCount} begeni</Text>
          <View style={styles.captionBlock}>
            {post.caption ? (
              <>
                <Text numberOfLines={isCaptionExpanded ? undefined : 3} style={styles.captionText}>
                  <Text style={styles.captionOwner}>@{post.owner.username} </Text>
                  {post.caption}
                </Text>
                {post.caption.length > 120 ? (
                  <Pressable
                    onPress={() =>
                      setExpandedCaptions((current) => ({
                        ...current,
                        [post.id]: !isCaptionExpanded,
                      }))
                    }
                  >
                    <Text style={styles.moreLabel}>{isCaptionExpanded ? 'Daha az goster' : 'Devamini oku'}</Text>
                  </Pressable>
                ) : null}
              </>
            ) : null}
          </View>
          <Pressable onPress={() => void toggleComments(post.id)}>
            <Text style={styles.commentSummary}>{post.commentCount > 0 ? `${post.commentCount} yorumu gor` : 'Ilk yorumu yap'}</Text>
          </Pressable>
          <Text style={styles.postTime}>{new Date(post.createdAt).toLocaleDateString('tr-TR')}</Text>
        </View>

        {openComments[post.id] ? (
          <View style={styles.commentsPanel}>
            {loadingComments[post.id] ? (
              <ActivityIndicator color="#111111" />
            ) : comments.length === 0 ? (
              <Text style={styles.commentEmpty}>Henuz yorum yok.</Text>
            ) : (
              comments.map((comment) => (
                <View key={comment.id} style={styles.commentRow}>
                  <View style={styles.commentContent}>
                    <Text style={styles.commentBody}>
                      <Text style={styles.commentOwner}>@{comment.owner.username} </Text>
                      {comment.body}
                    </Text>
                    <Text style={styles.commentMeta}>{comment.likeCount} begeni</Text>
                  </View>
                  <Pressable onPress={() => void handleCommentLike(post.id, comment)} style={styles.commentLikeButton}>
                    <Ionicons
                      color={comment.isLiked ? '#ef4444' : '#6b7280'}
                      name={comment.isLiked ? 'heart' : 'heart-outline'}
                      size={16}
                    />
                  </Pressable>
                </View>
              ))
            )}

            <View style={styles.commentComposer}>
              <TextInput
                style={styles.commentInput}
                value={commentDrafts[post.id] ?? ''}
                onChangeText={(value) =>
                  setCommentDrafts((current) => ({
                    ...current,
                    [post.id]: value,
                  }))
                }
                placeholder="Yorum ekle"
                placeholderTextColor="#9aa3af"
              />
              <Pressable onPress={() => void handleCreateComment(post.id)} style={styles.commentSendButton}>
                <Text style={styles.commentSendLabel}>Paylas</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <MobileShell
      title="Anasayfa"
      subtitle="Takip ettiklerin ve senin ilgine gore secilen postlar burada akar."
      actionLabel="Olustur"
      onActionPress={() => router.push('/create-post')}
    >
      <FlatList
        data={loading ? [] : displayedFeed}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={7}
        removeClippedSubviews
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor="#111111"
            onRefresh={() => {
              setRefreshing(true);
              setStoryRefreshKey((current) => current + 1);
              void loadFeed(true);
            }}
          />
        }
        ListHeaderComponent={
          <View>
            {notice ? (
              <View style={[styles.banner, styles.bannerInfo]}>
                <Text style={styles.bannerText}>{notice}</Text>
              </View>
            ) : null}
            {errorMessage ? (
              <View style={[styles.banner, styles.bannerError]}>
                <Text style={styles.bannerText}>{errorMessage}</Text>
              </View>
            ) : null}

            <StoryStrip
              accessToken={accessToken}
              currentUserId={currentUserId}
              onCreateStory={() => router.push('/create-story')}
              onError={(message) => setErrorMessage(message)}
              refreshKey={storyRefreshKey}
            />

            {loading ? <FeedSkeleton mediaWidth={mediaWidth} /> : null}
            {demoMode ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>Carloi'ye hos geldin</Text>
                <Text style={styles.emptyCopy}>
                  Ilk gonderini olustur, aracini profile ekle ve akisin nasil gorunecegini ornek postlarla kesfet.
                </Text>
                <Pressable style={styles.onboardingButton} onPress={() => router.push('/create')}>
                  <Text style={styles.onboardingButtonLabel}>Ilk paylasimini baslat</Text>
                </Pressable>
              </View>
            ) : null}
            {showRealEmptyState ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>Akis henuz bos</Text>
                <Text style={styles.emptyCopy}>
                  Gercek gonderiler paylasildiginda burada gorunecek. Ilk gonderini olusturabilir veya kesfete goz atabilirsin.
                </Text>
                <View style={styles.emptyActions}>
                  <Pressable style={styles.onboardingButton} onPress={() => router.push('/create')}>
                    <Text style={styles.onboardingButtonLabel}>Gonderi olustur</Text>
                  </Pressable>
                  <Pressable style={styles.secondaryCta} onPress={() => router.push('/explore')}>
                    <Text style={styles.secondaryCtaLabel}>Kesfete git</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </View>
        }
        ListFooterComponent={
          !loading && nextCursor ? (
            <Pressable onPress={() => void loadFeed(false)} disabled={loadingMore} style={styles.loadMoreButton}>
              <Text style={styles.loadMoreLabel}>{loadingMore ? 'Yukleniyor...' : 'Daha fazla goster'}</Text>
            </Pressable>
          ) : (
            <View style={styles.footerGap} />
          )
        }
      />
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  listContent: {
    paddingBottom: 20,
    backgroundColor: '#ffffff',
  },
  banner: {
    marginBottom: 8,
    marginHorizontal: 14,
    borderRadius: 12,
    padding: 12,
  },
  bannerInfo: {
    backgroundColor: '#f5f7fa',
  },
  bannerError: {
    backgroundColor: '#fff1f2',
  },
  bannerText: {
    color: '#374151',
    lineHeight: 20,
  },
  skeletonStack: {
    backgroundColor: '#ffffff',
  },
  skeletonPost: {
    gap: 10,
    marginHorizontal: -14,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eceff3',
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
  },
  skeletonAvatar: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: '#eceff3',
  },
  skeletonHeaderCopy: {
    gap: 6,
  },
  skeletonLineShort: {
    width: 92,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#eceff3',
  },
  skeletonLineTiny: {
    width: 68,
    height: 9,
    borderRadius: 999,
    backgroundColor: '#f1f3f6',
  },
  skeletonMedia: {
    aspectRatio: 4 / 5,
    backgroundColor: '#eef1f4',
  },
  skeletonActions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 12,
  },
  skeletonActionDot: {
    width: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: '#eceff3',
  },
  skeletonLineMedium: {
    width: 132,
    height: 10,
    marginHorizontal: 14,
    borderRadius: 999,
    backgroundColor: '#eceff3',
  },
  skeletonLineLong: {
    width: '72%',
    height: 10,
    marginHorizontal: 14,
    borderRadius: 999,
    backgroundColor: '#f1f3f6',
  },
  emptyState: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    color: '#111111',
    fontSize: 18,
    fontWeight: '700',
  },
  emptyCopy: {
    color: '#6b7280',
    lineHeight: 20,
    textAlign: 'center',
  },
  onboardingButton: {
    marginTop: 8,
    minHeight: 42,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    backgroundColor: '#111111',
  },
  onboardingButtonLabel: {
    color: '#ffffff',
    fontWeight: '700',
  },
  emptyActions: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  secondaryCta: {
    marginTop: 8,
    minHeight: 42,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: '#d7dce3',
    backgroundColor: '#ffffff',
  },
  secondaryCtaLabel: {
    color: '#111111',
    fontWeight: '700',
  },
  postCard: {
    gap: 8,
    marginHorizontal: -14,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eceff3',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 14,
  },
  ownerBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111111',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarLabel: {
    color: '#ffffff',
    fontWeight: '800',
  },
  ownerCopy: {
    flex: 1,
    gap: 1,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  ownerName: {
    color: '#111111',
    fontSize: 13.5,
    fontWeight: '700',
  },
  tickBlue: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '800',
  },
  tickGold: {
    color: '#f59e0b',
    fontSize: 11,
    fontWeight: '800',
  },
  ownerMeta: {
    color: '#6b7280',
    fontSize: 11.5,
  },
  followButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  followLabel: {
    color: '#111111',
    fontSize: 12,
    fontWeight: '700',
  },
  mediaTrack: {
    gap: 0,
  },
  mediaFrame: {
    aspectRatio: 4 / 5,
    backgroundColor: '#eef1f4',
    overflow: 'hidden',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  mediaCounter: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(17,17,17,0.58)',
  },
  mediaCounterLabel: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
  },
  actionCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  iconActionButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaColumn: {
    gap: 4,
    paddingHorizontal: 14,
  },
  likeCountText: {
    color: '#111111',
    fontSize: 12.5,
    fontWeight: '700',
  },
  captionBlock: {
    gap: 4,
  },
  captionText: {
    color: '#111111',
    fontSize: 13.5,
    lineHeight: 18,
  },
  captionOwner: {
    fontWeight: '700',
  },
  moreLabel: {
    color: '#6b7280',
    fontSize: 11.5,
    fontWeight: '600',
  },
  commentSummary: {
    color: '#6b7280',
    fontSize: 12,
  },
  postTime: {
    color: '#9aa3af',
    fontSize: 10.5,
    textTransform: 'uppercase',
  },
  commentsPanel: {
    gap: 10,
    paddingTop: 2,
    paddingHorizontal: 14,
  },
  commentEmpty: {
    color: '#6b7280',
    fontSize: 13,
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  commentContent: {
    flex: 1,
    gap: 4,
  },
  commentBody: {
    color: '#111111',
    lineHeight: 19,
  },
  commentOwner: {
    fontWeight: '700',
  },
  commentMeta: {
    color: '#6b7280',
    fontSize: 12,
  },
  commentLikeButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentComposer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 4,
  },
  commentInput: {
    flex: 1,
    minHeight: 36,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#f3f4f6',
    color: '#111111',
  },
  commentSendButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  commentSendLabel: {
    color: '#111111',
    fontWeight: '700',
  },
  loadMoreButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 14,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 20,
    backgroundColor: '#111111',
  },
  loadMoreLabel: {
    color: '#ffffff',
    fontWeight: '700',
  },
  footerGap: {
    height: 8,
  },
});
