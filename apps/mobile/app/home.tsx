import type { FeedPost, SocialComment } from '@carloi-v4/types';
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { MobileShell } from '../components/mobile-shell';
import { StoryStrip } from '../components/story-strip';
import { useAuth } from '../context/auth-context';
import { mobileSocialApi } from '../lib/social-api';

type CommentsState = Record<string, SocialComment[]>;
type DraftState = Record<string, string>;
type ExpandedState = Record<string, boolean>;
type LoadingCommentsState = Record<string, boolean>;
type OpenCommentsState = Record<string, boolean>;

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

  const mediaWidth = useMemo(() => Math.max(280, width - 44), [width]);
  const maybeAccessToken = session?.accessToken;
  const maybeCurrentUserId = session?.user.id;

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
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.mediaTrack}
      >
        {post.media.map((item) => (
          <View key={item.id} style={[styles.mediaFrame, { width: mediaWidth }]}>
            {item.mediaType === 'IMAGE' ? (
              <Image source={{ uri: item.url }} style={styles.mediaImage} resizeMode="cover" />
            ) : (
              <View style={styles.videoPlaceholder}>
                <Text style={styles.videoBadge}>VIDEO</Text>
                <Text numberOfLines={2} style={styles.videoUrl}>
                  {item.url}
                </Text>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    );
  }

  return (
    <MobileShell
      title="Anasayfa"
      subtitle="Takip ettiklerin once, hikayeler tepede, kesif akisi hemen arkada. Post ve story olusturma artik gercek upload ile calisiyor."
      actionLabel="Post olustur"
      onActionPress={() => router.push('/create-post')}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor="#ef8354"
            onRefresh={() => {
              setRefreshing(true);
              setStoryRefreshKey((current) => current + 1);
              void loadFeed(true);
            }}
          />
        }
      >
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

        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color="#ef8354" />
            <Text style={styles.loadingText}>Feed hazirlaniyor...</Text>
          </View>
        ) : null}

        {!loading && feed.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Heniz post yok</Text>
            <Text style={styles.emptyCopy}>
              Ilk postu paylasip feed akisini baslat. Artik galeriden secip gercek medya upload ile coklu icerik olusturabilirsin.
            </Text>
          </View>
        ) : null}

        {feed.map((post) => {
          const comments = commentsByPost[post.id] ?? [];
          const isCaptionExpanded = expandedCaptions[post.id] ?? false;
          const isOwnPost = currentUserId === post.owner.id;

          return (
            <View key={post.id} style={styles.postCard}>
              <View style={styles.postHeader}>
                <View style={styles.ownerBlock}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarLabel}>{post.owner.username.slice(0, 1).toUpperCase()}</Text>
                  </View>
                  <View style={styles.ownerCopy}>
                    <View style={styles.ownerRow}>
                      <Text style={styles.ownerName}>@{post.owner.username}</Text>
                      {post.owner.blueVerified ? <Text style={styles.tickBlue}>Blue</Text> : null}
                      {post.owner.goldVerified ? <Text style={styles.tickGold}>Gold</Text> : null}
                    </View>
                    <Text style={styles.ownerMeta}>
                      {post.locationText || 'Konum eklenmedi'} · {new Date(post.createdAt).toLocaleDateString('tr-TR')}
                    </Text>
                  </View>
                </View>
                {!isOwnPost ? (
                  <Pressable
                    onPress={() => {
                      void handleFollow(post);
                    }}
                    style={styles.followButton}
                  >
                    <Text style={styles.followLabel}>
                      {post.owner.isFollowing ? 'Takibi birak' : 'Takip et'}
                    </Text>
                  </Pressable>
                ) : null}
              </View>

              {renderMedia(post)}

              <View style={styles.actionsRow}>
                <View style={styles.actionCluster}>
                  <Pressable onPress={() => void handleLike(post)} style={styles.actionChip}>
                    <Text style={styles.actionText}>{post.isLiked ? 'Begenildi' : 'Begen'}</Text>
                  </Pressable>
                  <Pressable onPress={() => void toggleComments(post.id)} style={styles.actionChip}>
                    <Text style={styles.actionText}>Yorum</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setNotice('Paylasim kisayiolu bir sonraki asamada eklenecek.')}
                    style={styles.actionChip}
                  >
                    <Text style={styles.actionText}>Paylas</Text>
                  </Pressable>
                </View>
                <Pressable onPress={() => void handleSave(post)} style={styles.actionChip}>
                  <Text style={styles.actionText}>{post.isSaved ? 'Kayitli' : 'Kaydet'}</Text>
                </Pressable>
              </View>

              <View style={styles.metricRow}>
                <Text style={styles.metricText}>{post.likeCount} begeni</Text>
                <Text style={styles.metricText}>{post.commentCount} yorum</Text>
              </View>

              {post.caption ? (
                <View style={styles.captionBlock}>
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
                      <Text style={styles.moreLabel}>
                        {isCaptionExpanded ? 'Kapat' : 'Devamini oku'}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}

              {openComments[post.id] ? (
                <View style={styles.commentsPanel}>
                  {loadingComments[post.id] ? (
                    <ActivityIndicator color="#ef8354" />
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
                          <Text style={styles.commentMeta}>
                            {comment.likeCount} begeni · {comment.replyCount} yanit
                          </Text>
                        </View>
                        <Pressable
                          onPress={() => {
                            void handleCommentLike(post.id, comment);
                          }}
                          style={styles.commentLikeButton}
                        >
                          <Text style={styles.commentLikeLabel}>
                            {comment.isLiked ? 'Begenildi' : 'Begen'}
                          </Text>
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
                      placeholder="Yorum yaz"
                      placeholderTextColor="#6d8090"
                    />
                    <Pressable
                      onPress={() => {
                        void handleCreateComment(post.id);
                      }}
                      style={styles.commentSendButton}
                    >
                      <Text style={styles.commentSendLabel}>Gonder</Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}
            </View>
          );
        })}

        {!loading && nextCursor ? (
          <Pressable
            onPress={() => {
              void loadFeed(false);
            }}
            disabled={loadingMore}
            style={styles.loadMoreButton}
          >
            <Text style={styles.loadMoreLabel}>{loadingMore ? 'Yukleniyor...' : 'Daha fazla goster'}</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    gap: 16,
    paddingBottom: 10,
  },
  banner: {
    borderRadius: 18,
    padding: 14,
  },
  bannerInfo: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  bannerError: {
    backgroundColor: 'rgba(216,82,82,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(216,82,82,0.26)',
  },
  bannerText: {
    color: '#f8f2ea',
    lineHeight: 20,
  },
  loadingCard: {
    paddingVertical: 28,
    alignItems: 'center',
    gap: 10,
    borderRadius: 26,
    backgroundColor: '#0e1f2d',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  loadingText: {
    color: '#d2dde5',
  },
  emptyCard: {
    gap: 8,
    padding: 22,
    borderRadius: 28,
    backgroundColor: '#102030',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  emptyTitle: {
    color: '#f8f2ea',
    fontSize: 20,
    fontWeight: '800',
  },
  emptyCopy: {
    color: '#b7c4ce',
    lineHeight: 22,
  },
  postCard: {
    gap: 14,
    padding: 14,
    borderRadius: 30,
    backgroundColor: '#0d1d2a',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  ownerBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef8354',
  },
  avatarLabel: {
    color: '#08131d',
    fontSize: 18,
    fontWeight: '800',
  },
  ownerCopy: {
    flex: 1,
    gap: 4,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  ownerName: {
    color: '#f8f2ea',
    fontWeight: '800',
    fontSize: 15,
  },
  tickBlue: {
    color: '#77c7ff',
    fontSize: 11,
    fontWeight: '800',
  },
  tickGold: {
    color: '#ffd166',
    fontSize: 11,
    fontWeight: '800',
  },
  ownerMeta: {
    color: '#91a6b5',
    fontSize: 12,
  },
  followButton: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(239,131,84,0.14)',
  },
  followLabel: {
    color: '#ffd6c2',
    fontSize: 12,
    fontWeight: '800',
  },
  mediaTrack: {
    gap: 10,
  },
  mediaFrame: {
    overflow: 'hidden',
    borderRadius: 24,
    backgroundColor: '#08131d',
    aspectRatio: 1,
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  videoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 20,
    backgroundColor: '#122334',
  },
  videoBadge: {
    color: '#ffd6c2',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.6,
  },
  videoUrl: {
    color: '#d5e0e7',
    textAlign: 'center',
    lineHeight: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionChip: {
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#142636',
  },
  actionText: {
    color: '#f8f2ea',
    fontSize: 12,
    fontWeight: '700',
  },
  metricRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metricText: {
    color: '#f8f2ea',
    fontWeight: '700',
    fontSize: 13,
  },
  captionBlock: {
    gap: 6,
  },
  captionText: {
    color: '#d8e1e8',
    lineHeight: 21,
  },
  captionOwner: {
    color: '#f8f2ea',
    fontWeight: '800',
  },
  moreLabel: {
    color: '#ffd6c2',
    fontSize: 12,
    fontWeight: '700',
  },
  commentsPanel: {
    gap: 12,
    paddingTop: 4,
  },
  commentEmpty: {
    color: '#91a6b5',
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
    color: '#d8e1e8',
    lineHeight: 20,
  },
  commentOwner: {
    color: '#f8f2ea',
    fontWeight: '800',
  },
  commentMeta: {
    color: '#8aa0b2',
    fontSize: 12,
  },
  commentLikeButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  commentLikeLabel: {
    color: '#ffd6c2',
    fontSize: 12,
    fontWeight: '700',
  },
  commentComposer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  commentInput: {
    flex: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#f8f2ea',
    backgroundColor: '#08131d',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  commentSendButton: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#ef8354',
  },
  commentSendLabel: {
    color: '#08131d',
    fontWeight: '800',
  },
  loadMoreButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 22,
    backgroundColor: '#ef8354',
    marginBottom: 8,
  },
  loadMoreLabel: {
    color: '#08131d',
    fontWeight: '800',
  },
});
