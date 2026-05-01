'use client';

import Link from 'next/link';
import type {
  FeedPost,
  SocialComment,
  StoryFeedGroup,
  StoryItem,
  StoryViewerItem,
} from '@carloi-v4/types';
import { useEffect, useMemo, useState } from 'react';
import { AppShell } from './app-shell';
import { CommentIcon, HeartIcon, SaveIcon, ShareIcon } from './app-icons';
import { useAuth } from './auth-provider';
import { webSocialApi } from '../lib/social-api';

type CommentsState = Record<string, SocialComment[]>;
type DraftState = Record<string, string>;
type ExpandedState = Record<string, boolean>;
type OpenCommentsState = Record<string, boolean>;
type LoadingCommentsState = Record<string, boolean>;

function StoryAvatar({ group }: { group: StoryFeedGroup }) {
  const firstLetter = group.owner.username.slice(0, 1).toUpperCase();

  return group.owner.avatarUrl ? (
    <img alt={group.owner.username} className="story-avatar-image" loading="lazy" src={group.owner.avatarUrl} />
  ) : (
    <span className="story-avatar-fallback">{firstLetter}</span>
  );
}

function StoryStripSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="story-bubble">
          <span className="story-avatar-shell skeleton">
            <span className="story-avatar-skeleton" />
          </span>
          <span className="story-bubble-label skeleton-label" />
        </div>
      ))}
    </>
  );
}

function FeedSkeleton() {
  return (
    <div className="feed-skeleton-stack">
      {Array.from({ length: 2 }).map((_, index) => (
        <article key={index} className="feed-post-card skeleton-post">
          <div className="feed-post-header">
            <div className="feed-owner-block">
              <div className="feed-avatar skeleton-avatar" />
              <div className="feed-owner-copy">
                <div className="skeleton-line short" />
                <div className="skeleton-line tiny" />
              </div>
            </div>
          </div>
          <div className="post-media-frame skeleton-media" />
          <div className="instagram-action-row skeleton-actions">
            <div className="instagram-action-group">
              <span className="skeleton-action-dot" />
              <span className="skeleton-action-dot" />
              <span className="skeleton-action-dot" />
            </div>
          </div>
          <div className="skeleton-line medium" />
          <div className="skeleton-line long" />
          <div className="skeleton-line medium" />
        </article>
      ))}
    </div>
  );
}

export function SocialHomeClient() {
  const { session, isReady } = useAuth();
  const [feed, setFeed] = useState<FeedPost[]>([]);
  const [stories, setStories] = useState<StoryFeedGroup[]>([]);
  const [storyViewers, setStoryViewers] = useState<StoryViewerItem[]>([]);
  const [storyViewersLoading, setStoryViewersLoading] = useState(false);
  const [activeStoryGroupIndex, setActiveStoryGroupIndex] = useState<number | null>(null);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingStories, setLoadingStories] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [expandedCaptions, setExpandedCaptions] = useState<ExpandedState>({});
  const [commentsByPost, setCommentsByPost] = useState<CommentsState>({});
  const [commentDrafts, setCommentDrafts] = useState<DraftState>({});
  const [openComments, setOpenComments] = useState<OpenCommentsState>({});
  const [loadingComments, setLoadingComments] = useState<LoadingCommentsState>({});

  const activeStoryGroup =
    activeStoryGroupIndex !== null ? (stories[activeStoryGroupIndex] ?? null) : null;
  const activeStory: StoryItem | null = activeStoryGroup?.stories[activeStoryIndex] ?? null;
  const isOwnActiveStory = Boolean(session && activeStory && activeStory.owner.id === session.user.id);

  useEffect(() => {
    if (session?.accessToken) {
      void Promise.all([loadFeed(true), loadStories()]);
    }
  }, [session?.accessToken]);

  useEffect(() => {
    if (!session?.accessToken || !activeStory) {
      setStoryViewers([]);
      return;
    }

    if (!isOwnActiveStory && !activeStory.viewedByMe) {
      void webSocialApi.viewStory(session.accessToken, activeStory.id).then(() => {
        setStories((current) =>
          current.map((group, groupIndex) =>
            groupIndex !== activeStoryGroupIndex
              ? group
              : {
                  ...group,
                  hasUnviewed: group.stories.some((story) =>
                    story.id === activeStory.id ? false : !story.viewedByMe,
                  ),
                  stories: group.stories.map((story) =>
                    story.id === activeStory.id
                      ? { ...story, viewedByMe: true }
                      : story,
                  ),
                },
          ),
        );
      }).catch(() => {
        setNotice('Story goruntuleme bilgisi simdilik guncellenemedi.');
      });
    }

    if (isOwnActiveStory) {
      setStoryViewersLoading(true);
      void webSocialApi
        .getStoryViewers(session.accessToken, activeStory.id)
        .then((response) => setStoryViewers(response.items))
        .catch(() => setStoryViewers([]))
        .finally(() => setStoryViewersLoading(false));
    } else {
      setStoryViewers([]);
    }
  }, [activeStory?.id, activeStory?.viewedByMe, activeStoryGroupIndex, isOwnActiveStory, session?.accessToken]);

  async function loadStories() {
    if (!session) {
      return;
    }

    setLoadingStories(true);

    try {
      const response = await webSocialApi.getStoriesFeed(session.accessToken);
      setStories(response.items);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Story akisi su anda yuklenemedi.');
    } finally {
      setLoadingStories(false);
    }
  }

  async function loadFeed(reset: boolean) {
    if (!session) {
      return;
    }

    const cursor = reset ? undefined : nextCursor ?? undefined;

    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    setErrorMessage(null);

    try {
      const response = await webSocialApi.getFeed(session.accessToken, cursor);
      setFeed((current) => (reset ? response.items : [...current, ...response.items]));
      setNextCursor(response.nextCursor);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Feed su anda yuklenemedi.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  function openStoryGroup(groupIndex: number) {
    const group = stories[groupIndex];

    if (!group) {
      return;
    }

    const firstUnviewedIndex = group.stories.findIndex((story) => !story.viewedByMe);
    setActiveStoryGroupIndex(groupIndex);
    setActiveStoryIndex(firstUnviewedIndex >= 0 ? firstUnviewedIndex : 0);
  }

  function closeStoryViewer() {
    setActiveStoryGroupIndex(null);
    setActiveStoryIndex(0);
    setStoryViewers([]);
  }

  function moveStory(step: 1 | -1) {
    if (activeStoryGroupIndex === null || !activeStoryGroup) {
      return;
    }

    const nextStoryIndex = activeStoryIndex + step;

    if (nextStoryIndex >= 0 && nextStoryIndex < activeStoryGroup.stories.length) {
      setActiveStoryIndex(nextStoryIndex);
      return;
    }

    const nextGroupIndex = activeStoryGroupIndex + step;
    const nextGroup = stories[nextGroupIndex];

    if (!nextGroup) {
      closeStoryViewer();
      return;
    }

    setActiveStoryGroupIndex(nextGroupIndex);
    setActiveStoryIndex(step === 1 ? 0 : Math.max(nextGroup.stories.length - 1, 0));
  }

  async function handleDeleteActiveStory() {
    if (!session?.accessToken || !activeStory || !isOwnActiveStory) {
      return;
    }

    try {
      await webSocialApi.deleteStory(session.accessToken, activeStory.id);
      setStories((current) =>
        current
          .map((group) =>
            group.owner.id !== activeStory.owner.id
              ? group
              : {
                  ...group,
                  stories: group.stories.filter((story) => story.id !== activeStory.id),
                },
          )
          .filter((group) => group.stories.length > 0),
      );
      closeStoryViewer();
      setNotice('Hikaye silindi.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Hikaye silinemedi.');
    }
  }

  function patchPost(postId: string, updater: (post: FeedPost) => FeedPost) {
    setFeed((current) => current.map((post) => (post.id === postId ? updater(post) : post)));
  }

  function patchOwner(ownerId: string, following: boolean) {
    setFeed((current) =>
      current.map((post) =>
        post.owner.id === ownerId ? { ...post, owner: { ...post.owner, isFollowing: following } } : post,
      ),
    );
  }

  async function handleLike(post: FeedPost) {
    if (!session) {
      return;
    }

    try {
      const response = post.isLiked
        ? await webSocialApi.unlikePost(session.accessToken, post.id)
        : await webSocialApi.likePost(session.accessToken, post.id);

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
    if (!session) {
      return;
    }

    try {
      const response = post.isSaved
        ? await webSocialApi.unsavePost(session.accessToken, post.id)
        : await webSocialApi.savePost(session.accessToken, post.id);

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
    if (!session) {
      return;
    }

    try {
      const response = post.owner.isFollowing
        ? await webSocialApi.unfollowUser(session.accessToken, post.owner.id)
        : await webSocialApi.followUser(session.accessToken, post.owner.id);

      patchOwner(post.owner.id, response.following);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Takip islemi tamamlanamadi.');
    }
  }

  async function toggleComments(postId: string) {
    if (!session) {
      return;
    }

    const isOpen = openComments[postId] ?? false;

    setOpenComments((current) => ({
      ...current,
      [postId]: !isOpen,
    }));

    if (!isOpen && !commentsByPost[postId] && !loadingComments[postId]) {
      setLoadingComments((current) => ({ ...current, [postId]: true }));

      try {
        const response = await webSocialApi.getComments(session.accessToken, postId);
        setCommentsByPost((current) => ({ ...current, [postId]: response.items }));
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Yorumlar alinamadi.');
      } finally {
        setLoadingComments((current) => ({ ...current, [postId]: false }));
      }
    }
  }

  async function handleCreateComment(postId: string) {
    if (!session) {
      return;
    }

    const body = commentDrafts[postId]?.trim();

    if (!body) {
      return;
    }

    try {
      const response = await webSocialApi.createComment(session.accessToken, postId, { body });
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
    if (!session) {
      return;
    }

    try {
      const response = comment.isLiked
        ? await webSocialApi.unlikeComment(session.accessToken, postId, comment.id)
        : await webSocialApi.likeComment(session.accessToken, postId, comment.id);

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

  if (!isReady) {
    return (
      <AppShell>
        <section className="auth-entry-card">
          <div className="card-label">Auth status</div>
          <h3 className="card-title">Oturum kontrol ediliyor</h3>
          <p className="card-copy">Carloi hesabiniz yuklenirken feed hazirlaniyor.</p>
        </section>
      </AppShell>
    );
  }

  if (!session) {
    return (
      <div className="auth-entry-wrap">
        <section className="auth-entry-card">
          <div className="card-label">Carloi Feed</div>
          <h3 className="card-title">Sosyal akisa devam etmek icin giris yapin</h3>
          <p className="card-copy">
            Post akisi, hikayeler, ilanlar ve mesajlar tek bir sade deneyimde burada toplanir.
          </p>
          <div className="gate-actions">
            <Link className="primary-link" href="/login">
              Giris yap
            </Link>
            <Link className="secondary-link" href="/register">
              Uye ol
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <AppShell>
      <div className="feed-page-shell instagram-feed-shell">
      <section className="story-strip-card instagram-story-row">
        <div className="story-strip-row">
          <Link className="story-bubble own-story" href="/stories/create">
            <span className="story-avatar-shell own">+</span>
            <span className="story-bubble-label">Hikayen</span>
          </Link>
          {loadingStories ? (
            <StoryStripSkeleton />
          ) : stories.length === 0 ? (
            <div className="story-loading-copy">Henuz aktif hikaye yok.</div>
          ) : (
            stories.map((group, index) => (
              <button key={`${group.owner.id}-${group.latestCreatedAt ?? 'story'}`} className="story-bubble button-reset" type="button" onClick={() => openStoryGroup(index)}>
                <span className={`story-avatar-shell ${group.hasUnviewed ? 'unviewed' : 'viewed'}`}>
                  <StoryAvatar group={group} />
                </span>
                <span className="story-bubble-label">@{group.owner.username}</span>
              </button>
            ))
          )}
        </div>
      </section>

      {notice ? (
        <section className="detail-card notice-card">
          <p className="card-copy">{notice}</p>
        </section>
      ) : null}
      {errorMessage ? (
        <section className="detail-card error-card">
          <p className="card-copy">{errorMessage}</p>
        </section>
      ) : null}

      {loading ? (
        <FeedSkeleton />
      ) : feed.length === 0 ? (
        <section className="detail-card gate-card">
          <div className="card-label">First post</div>
          <h3 className="card-title">Heniz post yok</h3>
          <p className="card-copy">Ilk postu yukleyip sosyal akis bilgisini baslatabilirsiniz.</p>
        </section>
      ) : null}

      <div className="feed-stack instagram-feed">
        {feed.map((post) => {
          const comments = commentsByPost[post.id] ?? [];
          const expanded = expandedCaptions[post.id] ?? false;
          const isOwnPost = session.user.id === post.owner.id;

          return (
            <article key={post.id} className="feed-post-card">
              <header className="feed-post-header">
                <div className="feed-owner-block">
                  <div className="feed-avatar">{post.owner.username.slice(0, 1).toUpperCase()}</div>
                  <div className="feed-owner-copy">
                    <div className="feed-owner-row">
                      <strong>@{post.owner.username}</strong>
                      {post.owner.blueVerified ? <span className="tick-badge blue">Blue</span> : null}
                      {post.owner.goldVerified ? <span className="tick-badge gold">Gold</span> : null}
                    </div>
                    <span className="feed-owner-meta">
                      {post.locationText || 'Konum eklenmedi'} · {new Date(post.createdAt).toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                </div>
                {!isOwnPost ? (
                  <button className="secondary-link subtle-button" onClick={() => void handleFollow(post)}>
                    {post.owner.isFollowing ? 'Takibi birak' : 'Takip et'}
                  </button>
                ) : null}
              </header>

              <div className="post-media-track">
                {post.media.map((item) => (
                  <div key={item.id} className="post-media-frame">
                    {item.mediaType === 'IMAGE' ? (
                      <img alt="Post medyasi" className="post-media-image" loading="lazy" src={item.url} />
                    ) : (
                      <video className="post-media-image" controls preload="metadata" src={item.url} />
                    )}
                  </div>
                ))}
              </div>

              <div className="instagram-action-row">
                <div className="instagram-action-group">
                  <button
                    aria-label={post.isLiked ? 'Begeniyi kaldir' : 'Begen'}
                    className={`icon-action-button${post.isLiked ? ' active' : ''}`}
                    onClick={() => void handleLike(post)}
                    type="button"
                  >
                    <HeartIcon className="inline-action-icon" filled={post.isLiked} />
                  </button>
                  <button
                    aria-label="Yorumlari goster"
                    className="icon-action-button"
                    onClick={() => void toggleComments(post.id)}
                    type="button"
                  >
                    <CommentIcon className="inline-action-icon" />
                  </button>
                  <button
                    aria-label="Paylas"
                    className="icon-action-button"
                    onClick={() => setNotice('Paylasim kisayiolu bir sonraki asamada eklenecek.')}
                    type="button"
                  >
                    <ShareIcon className="inline-action-icon" />
                  </button>
                </div>
                <button
                  aria-label={post.isSaved ? 'Kaydi kaldir' : 'Kaydet'}
                  className={`icon-action-button${post.isSaved ? ' active' : ''}`}
                  onClick={() => void handleSave(post)}
                  type="button"
                >
                  <SaveIcon className="inline-action-icon" filled={post.isSaved} />
                </button>
              </div>

              <div className="post-metrics">
                <span>{post.likeCount} begeni</span>
                <span>{post.commentCount} yorum</span>
              </div>

              {post.caption ? (
                <div className="post-caption-block">
                  <p className={`post-caption ${expanded ? 'expanded' : ''}`}>
                    <strong>@{post.owner.username}</strong> {post.caption}
                  </p>
                  {post.caption.length > 160 ? (
                    <button
                      className="caption-toggle"
                      onClick={() =>
                        setExpandedCaptions((current) => ({
                          ...current,
                          [post.id]: !expanded,
                        }))
                      }
                    >
                      {expanded ? 'Kapat' : 'Devamini oku'}
                    </button>
                  ) : null}
                </div>
              ) : null}

              {openComments[post.id] ? (
                <section className="comments-panel">
                  {loadingComments[post.id] ? (
                    <p className="comment-empty">Yorumlar yukleniyor...</p>
                  ) : comments.length === 0 ? (
                    <p className="comment-empty">Henuz yorum yok.</p>
                  ) : (
                    comments.map((comment) => (
                      <div className="comment-row" key={comment.id}>
                        <div className="comment-copy">
                          <p>
                            <strong>@{comment.owner.username}</strong> {comment.body}
                          </p>
                          <span>
                            {comment.likeCount} begeni · {comment.replyCount} yanit
                          </span>
                        </div>
                        <button className="comment-like" onClick={() => void handleCommentLike(post.id, comment)}>
                          {comment.isLiked ? 'Begenildi' : 'Begen'}
                        </button>
                      </div>
                    ))
                  )}

                  <div className="comment-composer">
                    <input
                      className="comment-input"
                      value={commentDrafts[post.id] ?? ''}
                      onChange={(event) =>
                        setCommentDrafts((current) => ({
                          ...current,
                          [post.id]: event.target.value,
                        }))
                      }
                      placeholder="Yorum yaz"
                    />
                    <button className="primary-link small-button" onClick={() => void handleCreateComment(post.id)}>
                      Gonder
                    </button>
                  </div>
                </section>
              ) : null}
            </article>
          );
        })}
      </div>
      </div>

      {!loading && nextCursor ? (
        <div className="load-more-wrap">
          <button className="primary-link" onClick={() => void loadFeed(false)}>
            {loadingMore ? 'Yukleniyor...' : 'Daha fazla goster'}
          </button>
        </div>
      ) : null}

      {activeStory && activeStoryGroup ? (
        <div className="story-viewer-overlay" role="dialog">
          <div className="story-viewer-card">
            <div className="story-progress-row">
              {activeStoryGroup.stories.map((story, index) => (
                <span
                  key={story.id}
                  className={`story-progress-bar ${index <= activeStoryIndex ? 'active' : ''}`}
                />
              ))}
            </div>

            <div className="story-viewer-head">
              <div className="story-viewer-owner">
                <span className="story-inline-avatar">
                  <StoryAvatar group={activeStoryGroup} />
                </span>
                <div>
                  <strong>@{activeStory.owner.username}</strong>
                  <small>{new Date(activeStory.createdAt).toLocaleString('tr-TR')}</small>
                </div>
              </div>
              <div className="story-viewer-actions">
                {isOwnActiveStory ? (
                  <button className="secondary-link subtle-button" onClick={() => void handleDeleteActiveStory()}>
                    Sil
                  </button>
                ) : null}
                <button className="secondary-link subtle-button" onClick={closeStoryViewer}>
                  Kapat
                </button>
              </div>
            </div>

            <div className="story-viewer-body">
              <button className="story-nav-zone left button-reset" type="button" onClick={() => moveStory(-1)} />
              <div className="story-viewer-media-shell">
                {activeStory.media?.mediaType === 'VIDEO' ? (
                  <video className="story-viewer-media" controls autoPlay preload="metadata" src={activeStory.media.url} />
                ) : activeStory.media ? (
                  <img alt="Story medyasi" className="story-viewer-media" src={activeStory.media.url} />
                ) : (
                  <div className="empty-upload-state"><strong>Story medyasi yok</strong></div>
                )}
                <div className="story-viewer-copy">
                  {activeStory.caption ? <p>{activeStory.caption}</p> : null}
                  <small>{activeStory.locationText || 'Konum eklenmedi'}</small>
                </div>
              </div>
              <button className="story-nav-zone right button-reset" type="button" onClick={() => moveStory(1)} />
            </div>

            {isOwnActiveStory ? (
              <div className="story-viewers-panel">
                <div className="story-viewers-head">
                  <strong>Goruntuleyenler</strong>
                  <span>{activeStory.viewerCount ?? storyViewers.length}</span>
                </div>
                {storyViewersLoading ? (
                  <p className="story-loading-copy">Goruntuleyenler yukleniyor...</p>
                ) : storyViewers.length === 0 ? (
                  <p className="story-loading-copy">Bu hikayeyi henuz kimse gormedi.</p>
                ) : (
                  <div className="story-viewers-list">
                    {storyViewers.map((viewer) => (
                      <div className="story-viewer-row" key={viewer.id}>
                        <strong>@{viewer.viewer.username}</strong>
                        <span>{new Date(viewer.viewedAt).toLocaleTimeString('tr-TR')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
