import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';

function IndexPage() {
  const router = useRouter();
  const { accessToken } = useAuth();

  useEffect(() => {
    if (accessToken) {
      router.replace('/crews');
    } else {
      router.replace('/login');
    }
  }, [router, accessToken]);

  return null;
}

export default IndexPage;
