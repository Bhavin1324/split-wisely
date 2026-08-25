import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Input, Form, message } from 'antd';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function ForgotPasswordPage() {
  const { resetPasswordForEmail } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  const handleReset = async (values: { email: string }) => {
    setLoading(true);
    const { error } = await resetPasswordForEmail(values.email);
    setLoading(false);

    if (error) {
      messageApi.error(error.message || 'Failed to send reset email');
    } else {
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-700 to-indigo-900 flex items-center justify-center p-4 relative overflow-hidden">
      {contextHolder}

      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-white/5" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute top-1/3 left-1/4 w-64 h-64 rounded-full bg-white/3" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo / Branding Hero */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm mb-4 shadow-xl overflow-hidden">
            <img src="/brand-logo.png" alt="Centfolio" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Centfolio
          </h1>
          <p className="text-primary-100 mt-2 text-sm">
            Split expenses with friends, effortlessly with Centfolio.
          </p>
        </div>

        {/* Reset Password Card */}
        <div className="bg-bg-surface rounded-2xl shadow-2xl p-8 border border-border-base">
          {submitted ? (
            <div className="text-center py-2">
              <div className="w-16 h-16 bg-success-500/10 text-success-text rounded-2xl flex items-center justify-center mx-auto mb-4 border border-success-500/20">
                <CheckCircle2 className="w-8 h-8 text-success-500" />
              </div>
              <h3 className="text-xl font-bold text-text-base mb-2">Check your email</h3>
              <p className="text-xs text-text-muted mb-6 leading-relaxed">
                We sent a password reset link to your email address. Click the link in the email to set a new password.
              </p>
              <div className="space-y-3">
                <Button
                  type="default"
                  size="large"
                  onClick={() => setSubmitted(false)}
                  className="w-full h-11 font-medium rounded-xl text-sm border-border-base hover:border-primary-500"
                >
                  Resend Email
                </Button>
                <Link to="/login" className="block">
                  <Button
                    type="primary"
                    size="large"
                    className="w-full h-11 bg-primary-500 hover:bg-primary-600 font-semibold rounded-xl text-sm border-0"
                  >
                    Back to Login
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-text-base text-center mb-2">
                Reset your password
              </h2>
              <p className="text-xs text-text-muted text-center mb-6">
                Enter your registered email address and we'll send you a recovery link.
              </p>

              <Form layout="vertical" onFinish={handleReset} requiredMark={false} className="space-y-4">
                <Form.Item
                  name="email"
                  label={<span className="text-sm font-medium text-text-base">Email address</span>}
                  rules={[
                    { required: true, message: 'Please enter your email!' },
                    { type: 'email', message: 'Please enter a valid email!' },
                  ]}
                  className="mb-0"
                >
                  <Input
                    size="large"
                    prefix={<Mail className="w-4 h-4 text-text-muted mr-2" />}
                    placeholder="you@example.com"
                    className="rounded-xl h-11 border-border-base hover:border-primary-400 focus:border-primary-500"
                  />
                </Form.Item>

                <Form.Item className="mb-0 pt-2">
                  <Button
                    type="primary"
                    htmlType="submit"
                    size="large"
                    loading={loading}
                    className="w-full h-11 bg-primary-500 hover:bg-primary-600 font-semibold rounded-xl text-sm shadow-md border-0 transition-all"
                  >
                    Send Reset Link
                  </Button>
                </Form.Item>

                <div className="pt-2 flex justify-center">
                  <Link
                    to="/login"
                    className="flex items-center text-sm font-medium text-text-muted hover:text-primary-500 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1.5" />
                    Back to Login
                  </Link>
                </div>
              </Form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
