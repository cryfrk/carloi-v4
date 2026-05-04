'use client';

import { SharedContentType, type PostDetailResponse } from '@carloi-v4/types';
import { useEffect, useState } from 'react';
import { AppShell } from './app-shell';
import { useAuth } from './auth-provider';
import { WebMediaView } from './web-media-view';
import { demoFeedPostById } from '../lib/demo-content';
import { webSocialApi } from '../lib/social-api';
import { ShareContentSheet } from './share-content-sheet';

export function PostDetailClient({ postId }: { postId: string }) {
  const { session } = useAuth();
  const [post, setPost] = useState<PostDetailResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    if (postId.startsWith('demo-post-')) {
      setPost(demoFeedPostById[postId] ?? null);
      return;
    }

    if (!session?.accessToken) {
      return;
    }

    void webSocialApi
      .getPostDetail(session.accessToken, postId)
      .then(setPost)
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : 'Gonderi yuklenemedi.');
      });
  }, [postId, session?.accessToken]);

  return (
    <AppShell>
      <section className="detail-card ai-detail-shell">
        {notice ? <div className="auth-message success">{notice}</div> : null}
        {errorMessage ? <div className="auth-message error">{errorMessage}</div> : null}
        {post ? (
          <article className="post-card-detail">
            <div className="profile-hero compact">
              <div>
                <p className="brand-kicker">Post</p>
                <h2>@{post.owner.username}</h2>
                <p>{post.owner.firstName} {post.owner.lastName}</p>
              </div>
            </div>

            {post.media.length > 0 ? (
              <div className="post-media-track">
                {post.media.map((item) => {
                  if (!item.url) {
                    return null;
                  }

                  return (
                    <div key={item.id} className="post-media-frame">
                      <WebMediaView
                        alt="Post medyasi"
                        className="post-media-image"
                        controls={item.mediaType === 'VIDEO'}
                        mediaType={item.mediaType}
                        uri={item.url}
                      />
                    </div>
                  );
                })}
              </div>
            ) : null}

            {post.caption ? <p className="post-caption">{post.caption}</p> : null}
            <div className="ai-card-meta">
              <strong>{post.likeCount} begeni</strong>
              <span>{post.commentCount} yorum</span>
            </div>
            <div className="gate-actions">
              <button className="primary-link button-reset" onClick={() => setShareOpen(true)} type="button">
                Paylas
              </button>
            </div>
          </article>
        ) : (
          <div className="ai-empty">Gonderi yukleniyor...</div>
        )}
        <ShareContentSheet
          accessToken={session?.accessToken ?? null}
          contentId={postId}
          contentType={SharedContentType.POST}
          currentUserId={session?.user.id ?? null}
          onClose={() => setShareOpen(false)}
          onShared={(count) => setNotice(`${count} kisiye gonderildi.`)}
          visible={shareOpen}
        />
      </section>
    </AppShell>
  );
}
