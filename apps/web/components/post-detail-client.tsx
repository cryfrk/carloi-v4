'use client';

import type { PostDetailResponse } from '@carloi-v4/types';
import { useEffect, useState } from 'react';
import { AppShell } from './app-shell';
import { useAuth } from './auth-provider';
import { webLoiAiApi } from '../lib/loi-ai-api';

export function PostDetailClient({ postId }: { postId: string }) {
  const { session } = useAuth();
  const [post, setPost] = useState<PostDetailResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    void webLoiAiApi
      .getPostDetail(session.accessToken, postId)
      .then(setPost)
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : 'Gonderi yuklenemedi.');
      });
  }, [session?.accessToken, postId]);

  return (
    <AppShell>
      <section className="detail-card ai-detail-shell">
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
            {post.media[0] ? <div className="post-media-frame">{post.media[0].url}</div> : null}
            {post.caption ? <p className="post-caption">{post.caption}</p> : null}
            <div className="ai-card-meta">
              <strong>{post.likeCount} begeni</strong>
              <span>{post.commentCount} yorum</span>
            </div>
          </article>
        ) : (
          <div className="ai-empty">Gonderi yukleniyor...</div>
        )}
      </section>
    </AppShell>
  );
}
