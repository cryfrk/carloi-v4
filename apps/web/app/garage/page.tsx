'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function GarageRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/profile?tab=vehicles');
  }, [router]);

  return null;
}
