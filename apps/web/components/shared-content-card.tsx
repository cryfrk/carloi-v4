import type {
  SharedListingSystemCard,
  SharedPostSystemCard,
  SharedVehicleSystemCard,
} from '@carloi-v4/types';
import { resolveWebMediaUrl } from '../lib/media-url';

type SharedCard = SharedPostSystemCard | SharedListingSystemCard | SharedVehicleSystemCard;

const labels: Record<SharedCard['type'], string> = {
  POST_CARD: 'Paylasilan gonderi',
  LISTING_CARD: 'Paylasilan ilan',
  VEHICLE_CARD: 'Paylasilan arac',
};

export function SharedContentCard({
  body,
  card,
  mine = false,
  onPress,
}: {
  body?: string | null;
  card: SharedCard;
  mine?: boolean;
  onPress?: () => void;
}) {
  const mediaUrl = resolveWebMediaUrl(card.previewImageUrl);
  const className = `shared-content-card${mine ? ' mine' : ''}${onPress ? ' interactive' : ''}`;
  const content = (
    <>
      <div className="shared-content-thumb-wrap">
        {mediaUrl ? (
          <img alt={card.previewTitle} className="shared-content-thumb" loading="lazy" src={mediaUrl} />
        ) : (
          <div className="shared-content-thumb-fallback">
            <span>{card.type === 'POST_CARD' ? 'POST' : card.type === 'LISTING_CARD' ? 'ILAN' : 'ARAC'}</span>
          </div>
        )}
      </div>
      <div className="shared-content-copy">
        <small className="shared-content-kicker">{labels[card.type]}</small>
        <strong className="shared-content-title">{card.previewTitle}</strong>
        {card.previewSubtitle ? <span className="shared-content-subtitle">{card.previewSubtitle}</span> : null}
        {body ? <p className="shared-content-body">{body}</p> : null}
      </div>
    </>
  );

  if (onPress) {
    return (
      <button className={className} onClick={onPress} type="button">
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
}
