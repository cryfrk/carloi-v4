'use client';

import Link from 'next/link';
import { MediaAssetPurpose, type CreatePostMediaInput, type MediaAssetUploadResponse } from '@carloi-v4/types';
import { useMemo, useState } from 'react';
import { AppShell } from './app-shell';
import { useAuth } from './auth-provider';
import { webMediaApi } from '../lib/media-api';
import { SocialApiError, webSocialApi } from '../lib/social-api';

function inferMediaTypeFromMime(mimeType: string): CreatePostMediaInput['mediaType'] {
  return mimeType.startsWith('video/') ? 'VIDEO' : 'IMAGE';
}

export function SocialCreateClient() {
  const { session, isReady } = useAuth();
  const [caption, setCaption] = useState('');
  const [locationText, setLocationText] = useState('');
  const [media, setMedia] = useState<MediaAssetUploadResponse[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hasValidMedia = useMemo(() => media.length > 0, [media]);

  async function handleFileSelection(event: React.ChangeEvent<HTMLInputElement>) {
    if (!session?.accessToken) {
      return;
    }

    const files = event.target.files;

    if (!files?.length) {
      return;
    }

    setUploading(true);
    setErrorMessage(null);
    setMessage(null);

    try {
      const uploads = await webMediaApi.uploadFiles(
        session.accessToken,
        files,
        MediaAssetPurpose.POST_MEDIA,
      );

      setMedia((current) => [...current, ...uploads].slice(0, 10));
      setMessage(`${uploads.length} medya yuklendi.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Medya yuklenemedi.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  async function handleSubmit() {
    if (!session) {
      return;
    }

    if (media.length === 0) {
      setErrorMessage('En az bir medya yukleyin.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setMessage(null);

    try {
      await webSocialApi.createPost(session.accessToken, {
        caption: caption.trim() || undefined,
        locationText: locationText.trim() || undefined,
        media: media.map((item) => ({
          url: item.url,
          mediaType: inferMediaTypeFromMime(item.mimeType),
          mediaAssetId: item.id,
        })),
      });

      setMessage('Post olusturuldu. Feed ekranina donup sonucu gorebilirsiniz.');
      setCaption('');
      setLocationText('');
      setMedia([]);
    } catch (error) {
      if (error instanceof SocialApiError || error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Post su anda olusturulamadi.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!isReady) {
    return (
      <AppShell>
        <section className="detail-card gate-card">
          <div className="card-label">Auth status</div>
          <h3 className="card-title">Oturum kontrol ediliyor</h3>
          <p className="card-copy">Create akisi hazirlanirken oturum bilgisi dogrulaniyor.</p>
        </section>
      </AppShell>
    );
  }

  if (!session) {
    return (
      <AppShell>
        <section className="detail-card gate-card">
          <div className="card-label">Auth required</div>
          <h3 className="card-title">Post olusturmak icin giris yapin</h3>
          <p className="card-copy">Dogrulanmis bir hesapla giris yaptiginizda create akisi aktif hale gelir.</p>
          <div className="gate-actions">
            <Link className="primary-link" href="/login">
              Giris yap
            </Link>
            <Link className="secondary-link" href="/register">
              Uye ol
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
          <div className="card-label">Post composer</div>
          <h2 className="card-title">Gercek medya upload ile paylas</h2>
          <p className="card-copy">
            Gorsel ya da video dosyalarini yukleyip coklu medya sirasi, caption ve konumu tek ekrandan yonet.
          </p>

          <label className="input-label">
            <span>Caption</span>
            <textarea
              className="text-input text-area-input"
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              placeholder="Maksimum 600 karakter"
              maxLength={600}
            />
          </label>

          <label className="input-label">
            <span>Konum</span>
            <input
              className="text-input"
              value={locationText}
              onChange={(event) => setLocationText(event.target.value)}
              placeholder="Ornek: Istanbul / Sariyer"
            />
          </label>

          <label className="upload-dropzone">
            <input
              accept="image/jpeg,image/png,image/webp,video/mp4"
              className="upload-input-hidden"
              multiple
              type="file"
              onChange={(event) => void handleFileSelection(event)}
            />
            <span className="upload-dropzone-title">
              {uploading ? 'Dosyalar yukleniyor...' : 'Dosya sec ve yukle'}
            </span>
            <span className="upload-dropzone-copy">JPEG, PNG, WEBP veya MP4. En fazla 10 medya.</span>
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
            disabled={submitting || uploading || !hasValidMedia}
            onClick={() => void handleSubmit()}
          >
            {submitting ? 'Paylasiliyor...' : 'Paylas'}
          </button>
        </article>

        <article className="detail-card create-panel">
          <div className="create-toolbar">
            <div>
              <div className="card-label">Media list</div>
              <h3 className="card-title">Coklu secim ve sira</h3>
            </div>
          </div>

          <div className="media-entry-stack">
            {media.length === 0 ? (
              <div className="empty-upload-state">
                <strong>Henuz medya yok</strong>
                <p>Sol taraftan dosya secerek ilk gorsel veya videoyu yukleyin.</p>
              </div>
            ) : null}

            {media.map((item, index) => (
              <div className="media-entry-card" key={item.id}>
                <div className="media-entry-head">
                  <strong>Medya {index + 1}</strong>
                  <span>{inferMediaTypeFromMime(item.mimeType)}</span>
                </div>
                <div className="composer-preview-frame">
                  {inferMediaTypeFromMime(item.mimeType) === 'IMAGE' ? (
                    <img alt="Preview" className="post-media-image" src={item.url} />
                  ) : (
                    <video className="post-media-image" controls preload="metadata" src={item.url} />
                  )}
                </div>
                <div className="media-entry-tools">
                  <button
                    className="post-action"
                    disabled={index === 0}
                    onClick={() =>
                      setMedia((current) => {
                        const next = [...current];
                        const currentItem = next[index];
                        const previousItem = next[index - 1];

                        if (!currentItem || !previousItem) {
                          return current;
                        }

                        next[index - 1] = currentItem;
                        next[index] = previousItem;
                        return next;
                      })
                    }
                  >
                    Yukari
                  </button>
                  <button
                    className="post-action"
                    disabled={index === media.length - 1}
                    onClick={() =>
                      setMedia((current) => {
                        const next = [...current];
                        const currentItem = next[index];
                        const nextItem = next[index + 1];

                        if (!currentItem || !nextItem) {
                          return current;
                        }

                        next[index + 1] = currentItem;
                        next[index] = nextItem;
                        return next;
                      })
                    }
                  >
                    Asagi
                  </button>
                  <button
                    className="post-action"
                    onClick={() => setMedia((current) => current.filter((entry) => entry.id !== item.id))}
                  >
                    Sil
                  </button>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </AppShell>
  );
}
