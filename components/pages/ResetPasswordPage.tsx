import React, { useState } from 'react';
import { api } from '../../api/index.ts';

const ResetPasswordPage: React.FC<{ token: string; onSwitchToLogin: () => void }> = ({ token, onSwitchToLogin }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      const success = await api.resetPassword(token, password);
      if (success) {
        setIsSuccess(true);
      } else {
        setError('Invalid or expired reset token. Please request a new one.');
      }
    } catch (err: any) {
      setError('Failed to reset password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-100 dark:bg-slate-900">
      <div className="w-full max-w-md m-4 bg-white dark:bg-slate-800 shadow-2xl rounded-xl overflow-hidden p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Create New Password</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Please enter your new password below.
          </p>
        </div>

        {isSuccess ? (
          <div className="text-center space-y-6">
            <div className="p-4 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-md">
              <p>Your password has been successfully reset.</p>
            </div>
            <button
              onClick={() => {
                // Remove token from URL
                window.history.replaceState({}, document.title, window.location.pathname);
                onSwitchToLogin();
              }}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200"
            >
              Return to Login
            </button>
          </div>
        ) : (
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm rounded-md">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="password" className="text-sm font-medium text-slate-700 dark:text-slate-300">New Password</label>
              <input
                id="password" name="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-white dark:bg-slate-700 dark:text-slate-200"
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700 dark:text-slate-300">Confirm New Password</label>
              <input
                id="confirmPassword" name="confirmPassword" type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-white dark:bg-slate-700 dark:text-slate-200"
              />
            </div>
            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200 disabled:opacity-50"
              >
                {isSubmitting ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
            <div className="text-center">
              <button type="button" onClick={() => {
                window.history.replaceState({}, document.title, window.location.pathname);
                onSwitchToLogin();
              }} className="text-sm font-medium text-primary hover:underline">
                Back to Login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;
