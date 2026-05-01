import { ProfileClient } from '../../../components/profile-client';

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const resolvedSearch = searchParams ? await searchParams : {};
  const tabValue = Array.isArray(resolvedSearch.tab) ? resolvedSearch.tab[0] : resolvedSearch.tab;
  const initialTab = tabValue === 'listings' || tabValue === 'vehicles' ? tabValue : 'posts';

  return <ProfileClient identifier={resolvedParams.id} initialTab={initialTab} />;
}

