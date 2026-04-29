import { PostDetailClient } from '../../../components/post-detail-client';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const resolved = await params;
  return <PostDetailClient postId={resolved.id} />;
}
