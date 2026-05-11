'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Loader } from 'lucide-react';

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, userRole, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) router.push('/login');
      else if (userRole !== 'admin') router.push('/');
    }
  }, [user, userRole, loading, router]);

  if (loading || !user || userRole !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
