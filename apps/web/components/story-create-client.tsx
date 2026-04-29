'use client';

import Link from 'next/link';
import { MediaAssetPurpose, type MediaAssetUploadResponse } from '@carloi-v4/types';
import { useState } from 'react';
import { AppShell } from './app-shell';
import { useAuth } from './auth-provider';
import { webMediaApi } from '../lib/media-api';
import { SocialApiError, webSocialApi } from '../lib/social-api';

function inferMediaTypeFromMime(mimeType: string) {
  return mimeType.startsWith('video/') ? 'VIDEO' : 'IMAGE';
}

export function StoryCreateClient() {
  const { session, isReady } = useAuth();
  const [caption, setCaption] = useState('');
  const [locationText, setLocationText] = useState('');
  const [uploadedMedia, setUploadedMedia] = useState<MediaAssetUploadResponse | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleFileSelection(event: React.ChangeEvent<HTMLInputElement>) {
    if (!session?.accessToken) {
      return;
    }

    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setUploading(true);
    setErrorMessage(null);
    setMessage(null);

    try {
      const upload = await webMediaApi.uploadFile(session.accessToken, file, MediaAssetPurpose.STORY_MEDIA);
      setUploadedMedia(upload);
      setMessage('Hikaye medyasi yuklendi.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Hikaye medyasi yuklenemedi.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  async function handleSubmit() {
    if (!session?.accessToken || !uploadedMedia) {
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setMessage(null);

    try {
      await webSocialApi.createStory(session.accessToken, {
        caption: caption.trim() || undefined,
        locationText: locationText.trim() || undefined,
        media: {
          url: uploadedMedia.url,
          mediaType: inferMediaTypeFromMime(uploadedMedia.mimeType),
          mediaAssetId: uploadedMedia.id,
        },
      });

      setCaption('');
      setLocationText('');
      setUploadedMedia(null);
      setMessage('Hikaye paylasildi.');
    } catch (error) {
      if (error instanceof SocialApiError || error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Hikaye su anda paylasilamadi.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!isReady) {
    return (
      <AppShell>
        <section className="detail-card gate-card">
          <h3 className="card-title">Oturum kontrol ediliyor</h3>
        </section>
      </AppShell>
    );
  }

  if (!session) {
    return (
      <AppShell>
        <section className="detail-card gate-card">
          <div className="card-label">Auth required</div>
          <h3 className="card-title">Hikaye olusturmak icin giris yapin</h3>
          <div className="gate-actions">
            <Link className="primary-link" href="/login">
              Giris yap
            </Link>
          </div>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <section className="create-grid">
        <article className="detail-card create-panel">
          <div className="card-label">Stories</div>
          <h2 className="card-title">24 saatlik hikaye olustur</h2>
          <p className="card-copy">
            Tek foto ya da 15 saniyelik videonu yukle, hizli bir not ekle ve takip ettiklerinle paylas.
          </p>

          <label className="upload-dropzone">
            <input
              accept="image/jpeg,image/png,image/webp,video/mp4"
              className="upload-input-hidden"
              type="file"
              onChange={(event) => void handleFileSelection(event)}
            />
            <span className="upload-dropzone-title">
              {uploading ? 'Hikaye medyasi yukleniyor...' : 'Story dosyasi sec'}
            </span>
            <span className="upload-dropzone-copy">Tek foto ya da maksimum 15 saniyelik MP4 video.</span>
          </label>

          <label className="input-label">
            <span>Caption</span>
            <textarea
              className="text-input text-area-input"
              maxLength={240}
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
            />
          </label>

          <label className="input-label">
            <span>Konum</span>
            <input
              className="text-input"
              value={locationText}
              onChange={(event) => setLocationText(event.target.value)}
            />
          </label>

          {message ? (
            <div className="detail-card notice-card compact-card">
              <p className="card-copy">{message}</p>
            </div>
          ) : null}
          {errorMessage ? (
            <div className="detail-card error-card compact-card">
              <p className="card-copy">{errorMessage}</p>
            </div>
          ) : null}

          <button
            className="primary-link wide-button"
            disabled={!uploadedMedia || uploading || submitting}
            onClick={() => void handleSubmit()}
          >
            {submitting ? 'Paylasiliyor...' : 'Hikayeyi paylas'}
          </button>
        </article>

        <article className="detail-card create-panel">
          <div className="card-label">Onizleme</div>
          <h3 className="card-title">Story viewer gorunumu</h3>
          {uploadedMedia ? (
            <div className="story-preview-card">
              {inferMediaTypeFromMime(uploadedMedia.mimeType) === 'IMAGE' ? (
                <img alt="Story preview" className="story-preview-media" src={uploadedMedia.url} />
              ) : (
                <video className="story-preview-media" controls preload="metadata" src={uploadedMedia.url} />
              )}
              <div className="story-preview-overlay">
                <span>@{session.user.username}</span>
                <strong>{caption || 'Hikaye notu burada gorunecek'}</strong>
                <small>{locationText || 'Konum eklenmedi'}</small>
              </div>
            </div>
          ) : (
            <div className="empty-upload-state">
              <strong>Onizleme bekleniyor</strong>
              <p>Dosya yuklendikten sonra hikayen burada tam ekran hissiyle gorunecek.</p>
            </div>
          )}
        </article>
      </section>
    </AppShell>
  );
}
