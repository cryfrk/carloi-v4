import { Suspense } from 'react';
import { ListingsHomeClient } from '../../components/listings-home-client';

export default function ListingsPage() {
  return (
    <Suspense fallback={null}>
      <ListingsHomeClient />
    </Suspense>
  );
}
