'use client';

import { useRouter } from 'next/navigation';

const CREATE_ACTIONS = [
  {
    key: 'post',
    title: 'Gonderi olustur',
    description: 'Feed icin foto veya video paylas.',
    href: '/create-post',
  },
  {
    key: 'story',
    title: 'Hikaye olustur',
    description: 'Tam ekran hikaye akisini hazirla.',
    href: '/create-story',
  },
  {
    key: 'listing',
    title: 'Ilan olustur',
    description: 'Aracini satisa cikarmak icin ilan hazirla.',
    href: '/listings/create',
  },
  {
    key: 'vehicle',
    title: 'Arac ekle',
    description: 'Profilindeki arac koleksiyonuna yeni arac ekle.',
    href: '/vehicles/create',
  },
];

export function CreateActionSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const router = useRouter();

  if (!visible) {
    return null;
  }

  return (
    <div className="create-sheet-overlay" role="dialog" aria-modal="true">
      <button aria-label="Kapat" className="create-sheet-dismiss" onClick={onClose} type="button" />
      <div className="create-sheet-panel">
        <div className="create-sheet-handle" />
        <div className="create-sheet-header">
          <strong>Ne yapmak istiyorsun?</strong>
          <span>Bulundugun sayfadan ayrilmadan Carloi icin yeni icerik sec.</span>
        </div>
        <div className="create-sheet-grid">
          {CREATE_ACTIONS.map((action) => (
            <button
              key={action.key}
              className="create-sheet-card"
              onClick={() => {
                onClose();
                router.push(action.href);
              }}
              type="button"
            >
              <div>
                <strong>{action.title}</strong>
                <span>{action.description}</span>
              </div>
              <small>Ac</small>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
