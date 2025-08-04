import { useEffect } from 'react';
import { useRouter } from 'next/router';

function IndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/crews');
  }, [router]);

  return null;
}

export default IndexPage;
