import { PlaceholderScreen } from '../components/placeholder-screen';

export default function Screen() {
  return (
    <PlaceholderScreen
      eyebrow="Platform Placeholder"
      title="Commercial Approvals"
      description="Carloi V4 Admin Mobile icin Commercial Approvals ekrani placeholder olarak hazirlandi. Burasi gercek veri akisi, form mantigi ve navigasyon kurallari icin genisleyebilir bir zemin sunar."
      bullets={[
        'Module structure ready',
        'Navigation flow placeholder',
        'API integration planned'
      ]}
    />
  );
}

