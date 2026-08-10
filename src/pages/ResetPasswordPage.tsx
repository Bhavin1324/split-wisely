import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Input, Form, message, Alert } from 'antd';
import { Lock, Receipt } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export function ResetPasswordPage() {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  useEffect(() => {
    // Check if the session was successfully established
    const checkSession = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (!currentSession) {
        // If there's no session, it means the token exchange failed or they navigated here directly
        const errorDescription = searchParams.get('error_description');
        if (errorDescription) {
          setSessionError(errorDescription.replace(/\+/g, ' '));
        } else {
          setSessionError("No valid password reset session found. If you opened this link on a different device or browser than the one you requested it from, the security check failed. Please request a new link and open it in the same browser.");
        }
      }
    };
    
    // Slight delay to allow Supabase to parse the URL hash/query params automatically
    const timer = setTimeout(checkSession, 1000);
    return () => clearTimeout(timer);
  }, [searchParams]);

  const handleUpdatePassword = async (values: any) => {
    setLoading(true);
    const { error } = await updatePassword(values.password);
    setLoading(false);

    if (error) {
      message.error(error.message || 'Failed to update password');
    } else {
      message.success('Password updated successfully');
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/30">
            <Receipt className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Set New Password
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Please enter your new password below.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-gray-200/50 sm:rounded-2xl sm:px-10 border border-gray-100">
          
          {sessionError && (
            <Alert
              message="Link Expired or Invalid"
              description={sessionError}
              type="error"
              showIcon
              className="mb-6"
              action={
                <Button size="small" danger onClick={() => navigate('/forgot-password')}>
                  Try Again
                </Button>
              }
            />
          )}

          <Form layout="vertical" onFinish={handleUpdatePassword} requiredMark={false} disabled={!!sessionError}>
            <Form.Item
              name="password"
              label={<span className="text-gray-700 font-medium">New Password</span>}
              rules={[
                { required: true, message: 'Please input your new password!' },
                {
                  validator: (_, value) => {
                    if (!value) return Promise.resolve();
                    const strongPasswordRegex = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;
                    if (!strongPasswordRegex.test(value)) {
                      return Promise.reject(new Error('Password must contain at least one letter and one number, and be at least 6 characters long.'));
                    }
                    return Promise.resolve();
                  }
                }
              ]}
            >
              <Input.Password
                size="large"
                prefix={<Lock className="w-5 h-5 text-gray-400 mr-2" />}
                placeholder="Enter new password"
                className="rounded-xl h-12 border-gray-200 hover:border-primary-400 focus:border-primary-500"
              />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              label={<span className="text-gray-700 font-medium">Confirm Password</span>}
              dependencies={['password']}
              rules={[
                { required: true, message: 'Please confirm your new password!' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('The two passwords that you entered do not match!'));
                  },
                }),
              ]}
            >
              <Input.Password
                size="large"
                prefix={<Lock className="w-5 h-5 text-gray-400 mr-2" />}
                placeholder="Confirm new password"
                className="rounded-xl h-12 border-gray-200 hover:border-primary-400 focus:border-primary-500"
              />
            </Form.Item>

            <Form.Item className="mb-0 mt-6">
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                loading={loading}
                className="w-full h-12 bg-primary-600 hover:bg-primary-700 font-medium rounded-xl text-base shadow-lg shadow-primary-500/30 border-0"
              >
                Update Password
              </Button>
            </Form.Item>
          </Form>
        </div>
      </div>
    </div>
  );
}
