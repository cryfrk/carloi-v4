import { Redirect } from 'expo-router';
import { useAdminAuth } from '../context/admin-auth-context';

export default function Screen() {
  const { session } = useAdminAuth();

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (session.admin.role === 'INSURANCE_ADMIN') {
    return <Redirect href="/insurance-requests" />;
  }

  if (session.admin.role === 'COMMERCIAL_ADMIN') {
    return <Redirect href="/commercial-applications" />;
  }

  return <Redirect href="/dashboard" />;
}
