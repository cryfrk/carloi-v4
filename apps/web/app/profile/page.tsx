import { ProfileClient } from '../../components/profile-client';

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ searchParams }: PageProps) {
  const resolved = searchParams ? await searchParams : {};
  const tabValue = Array.isArray(resolved.tab) ? resolved.tab[0] : resolved.tab;
  const initialTab = tabValue === 'posts' || tabValue === 'listings' || tabValue === 'vehicles' ? tabValue : 'vehicles';

  return <ProfileClient initialTab={initialTab} />;
}

