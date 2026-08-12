import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Input, Form, message } from 'antd';
import { Mail, ArrowLeft, Receipt } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function ForgotPasswordPage() {
  const { resetPasswordForEmail } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleReset = async (values: { email: string }) => {
    setLoading(true);
    const { error } = await resetPasswordForEmail(values.email);
    setLoading(false);

    if (error) {
      message.error(error.message || 'Failed to send reset email');
    } else {
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen bg-bg-base flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/30">
            <Receipt className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-text-base">
          Reset your password
        </h2>
        <p className="mt-2 text-center text-sm text-text-muted">
          Or{' '}
          <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500 transition-colors">
            return to login
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-bg-surface py-8 px-4 shadow-xl shadow-gray-200/50 sm:rounded-2xl sm:px-10 border border-border-base">
          {submitted ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-success-bg rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-success-text" />
              </div>
              <h3 className="text-xl font-medium text-text-base mb-2">Check your email</h3>
              <p className="text-text-muted mb-6">
                We have sent a password reset link to your email address.
              </p>
              <Link to="/login">
                <Button type="primary" size="large" className="w-full h-12 bg-primary-600 hover:bg-primary-700 font-medium rounded-xl text-base shadow-lg shadow-primary-500/30 border-0">
                  Back to Login
                </Button>
              </Link>
            </div>
          ) : (
            <Form layout="vertical" onFinish={handleReset} requiredMark={false}>
              <Form.Item
                name="email"
                label={<span className="text-gray-700 font-medium">Email address</span>}
                rules={[
                  { required: true, message: 'Please input your email!' },
                  { type: 'email', message: 'Please enter a valid email!' }
                ]}
              >
                <Input
                  size="large"
                  prefix={<Mail className="w-5 h-5 text-text-muted mr-2" />}
                  placeholder="Enter your email"
                  className="rounded-xl h-12 border-border-base hover:border-primary-400 focus:border-primary-500"
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
                  Send Reset Link
                </Button>
              </Form.Item>

              <div className="mt-6 flex justify-center">
                <Link to="/login" className="flex items-center text-sm font-medium text-text-muted hover:text-text-base transition-colors">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to login
                </Link>
              </div>
            </Form>
          )}
        </div>
      </div>
    </div>
  );
}
