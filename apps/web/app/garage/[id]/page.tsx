'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function GarageDetailRedirectPage(props: PageProps) {
  const router = useRouter();

  useEffect(() => {
    void props.params.then((resolved) => {
      router.replace(`/vehicles/${resolved.id}`);
    });
  }, [props.params, router]);

  return null;
}
