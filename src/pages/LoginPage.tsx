import { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { Button, Input, Divider, message, Modal } from 'antd';
import { Receipt, Mail, Lock, User, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  // Check if real Supabase keys are configured in environment
  const isSupabaseConfigured =
    import.meta.env.VITE_SUPABASE_URL &&
    import.meta.env.VITE_SUPABASE_URL !== 'https://placeholder.supabase.co';

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-base">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  // If user is already authenticated, don't show login page again
  if (session) {
    return <Navigate to="/dashboard" replace />;
  }

  // ── Real / Demo Email Sign In / Sign Up ──────────────────────────────
  const handleAuth = async () => {
    if (!isSupabaseConfigured) {
      // Demo mode: go directly to dashboard
      messageApi.info(`Demo Mode: ${isLoginMode ? 'Logging in' : 'Signing up'}...`);
      navigate('/dashboard');
      return;
    }

    // Robust Form Validation
    if (!email || !password) {
      messageApi.error('Please enter your email and password.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      messageApi.error('Please enter a valid email address.');
      return;
    }

    // Apply Strong Password Validation to BOTH Login and Signup
    const strongPasswordRegex = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;
    if (!strongPasswordRegex.test(password)) {
      messageApi.error('For your security, password must contain at least one letter and one number, and be at least 6 characters long.');
      return;
    }
    
    if (!isLoginMode) {
      if (!fullName || fullName.trim().length < 2) {
        messageApi.error('Please enter a valid full name (at least 2 characters).');
        return;
      }
    }

    setLoading(true);
    let authError = null;
    let authSession = null;
    let authUser = null;

    if (isLoginMode) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      authError = error;
      authSession = data.session;
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      });
      authError = error;
      authSession = data.session;
      authUser = data.user;
      
      if (!error && data.user?.identities?.length === 0) {
        authError = new Error('This email is already registered. Please sign in instead.');
      }
    }

    setLoading(false);

    if (authError) {
      // Provide a helpful message if email confirmation is required but not done
      if (authError.message.toLowerCase().includes('email not confirmed')) {
        messageApi.error('Email not confirmed. Please check your inbox or disable "Confirm Email" in your Supabase Auth settings.');
      } else {
        messageApi.error(authError.message);
      }
    } else {
      if (isLoginMode) {
        messageApi.success('Successfully signed in!');
        navigate('/dashboard');
      } else {
        if (authSession) {
          messageApi.success('Successfully signed up! You are now logged in.');
          navigate('/dashboard');
        } else if (authUser) {
          Modal.success({
            title: 'Check your email',
            content: 'Registration successful! We have sent a confirmation link to your email address. Please click it to activate your account.',
            okText: 'Got it',
          });
          setIsLoginMode(true);
          setPassword('');
        }
      }
    }
  };

  // ── Real / Demo Google OAuth Sign In ──────────────────────
  const handleGoogleSignIn = async () => {
    const searchParams = new URLSearchParams(window.location.search);
    const returnTo = searchParams.get('returnTo') || '/dashboard';

    if (!isSupabaseConfigured) {
      // Demo mode fallback
      messageApi.info('Demo Mode: Google Sign-In simulated.');
      navigate(returnTo);
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}${returnTo}`,
      },
    });
    setLoading(false);

    if (error) {
      messageApi.error(`Google Sign-In failed: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-500 via-primary-600 to-teal-700 p-4">
      {contextHolder}

      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-white/5" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute top-1/3 left-1/4 w-64 h-64 rounded-full bg-white/3" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo / Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm mb-4">
            <Receipt className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            SplitWisely
          </h1>
          <p className="text-primary-100 mt-2 text-sm">
            Split expenses with friends, effortlessly.
          </p>
        </div>

        {/* Login/Signup Card */}
        <div className="bg-bg-surface rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-text-base text-center mb-6">
            {isLoginMode ? 'Welcome back' : 'Create an account'}
          </h2>

          <div className="space-y-4">
            {/* Full Name Input (Sign Up Only) */}
            {!isLoginMode && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Full Name
                </label>
                <Input
                  size="large"
                  placeholder="John Doe"
                  prefix={<User className="w-4 h-4 text-text-muted" />}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            )}

            {/* Email Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <Input
                size="large"
                placeholder="you@example.com"
                prefix={<Mail className="w-4 h-4 text-text-muted" />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <Input.Password
                size="large"
                placeholder={isLoginMode ? "Enter your password" : "Create a password"}
                prefix={<Lock className="w-4 h-4 text-text-muted" />}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onPressEnter={handleAuth}
              />
              {isLoginMode && (
                <div className="flex justify-end mt-2">
                  <Link to="/forgot-password" className="text-sm text-primary-600 hover:text-primary-700">
                    Forgot your password?
                  </Link>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="primary"
              size="large"
              block
              loading={loading}
              onClick={handleAuth}
              className="!bg-primary-600 !border-primary-600 hover:!bg-primary-700 !h-11 !font-semibold mt-2"
              icon={<ArrowRight className="w-4 h-4" />}
              iconPosition="end"
            >
              {isLoginMode ? 'Sign In' : 'Sign Up'}
            </Button>
            
            {/* Toggle Mode */}
            <div className="text-center text-sm text-text-muted mt-2">
              {isLoginMode ? "Don't have an account? " : "Already have an account? "}
              <button 
                type="button" 
                onClick={() => setIsLoginMode(!isLoginMode)}
                className="text-primary-600 hover:text-primary-700 font-medium transition-colors"
              >
                {isLoginMode ? 'Sign up' : 'Sign in'}
              </button>
            </div>
          </div>

          <Divider className="!my-6">
            <span className="text-xs text-text-muted px-2">or</span>
          </Divider>

          {/* Real Supabase Google Sign In */}
          <Button
            size="large"
            block
            loading={loading}
            onClick={handleGoogleSignIn}
            className="!h-11 !font-medium"
            icon={
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            }
          >
            Continue with Google
          </Button>

          {/* Mode Indicator */}
          <p className="text-center text-xs text-text-muted mt-6">
            {isSupabaseConfigured
              ? 'Connected to live Supabase Auth'
              : 'Demo mode active — click Sign In or Google to explore'}
          </p>
        </div>
      </div>
    </div>
  );
}
