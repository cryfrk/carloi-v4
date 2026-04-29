import { ProfileClient } from '../../../components/profile-client';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const resolved = await params;
  return <ProfileClient identifier={resolved.id} />;
}
