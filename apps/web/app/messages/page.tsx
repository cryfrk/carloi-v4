import { Suspense } from 'react';
import { MessagesClient } from '../../components/messages-client';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <MessagesClient />
    </Suspense>
  );
}
