'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Admin Editor Route
 * 
 * Redirects to the Decap CMS static admin interface
 * Located at /public/admin/index.html
 */
export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the static admin page
    router.push('/admin/');
  }, [router]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#1a1a1a',
      color: '#fff',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <h1>Loading Editor...</h1>
      <p>Redirecting to Decap CMS content editor</p>
    </div>
  );
}
