import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { message } from 'antd';
import { supabase } from '../lib/supabase';
import { PageLoader } from '../components/ui/PageLoader';

export function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCodeExchange = async () => {
      const code = searchParams.get('code');
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setError(error.message);
          message.error('Failed to verify email. The link may have expired.');
          navigate('/login');
        } else {
          message.success('Email successfully confirmed!');
          navigate('/dashboard');
        }
      } else {
        navigate('/login');
      }
    };
    handleCodeExchange();
  }, [navigate, searchParams]);

  if (error) {
    return null;
  }

  return <PageLoader />;
}
