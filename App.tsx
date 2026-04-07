import React, { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth.ts';
import LoginPage from './components/pages/LoginPage.tsx';
import DashboardLayout from './components/DashboardLayout.tsx';
import DealerDashboardLayout from './components/DealerDashboardLayout.tsx';
import { useAppContext } from './hooks/useAppContext.ts';
import PendingApprovalPage from './components/pages/PendingApprovalPage.tsx';
import DealerRegistrationPage from './components/pages/DealerRegistrationPage.tsx';
import ForgotPasswordPage from './components/pages/ForgotPasswordPage.tsx';
import ResetPasswordPage from './components/pages/ResetPasswordPage.tsx';
import { useData } from './hooks/useData.ts';

const App: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const { dealers } = useData();
  const [authView, setAuthView] = useState<'login' | 'register' | 'forgot-password' | 'reset-password'>('login');
  const [resetToken, setResetToken] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      setResetToken(token);
      setAuthView('reset-password');
    }
  }, []);

  if (!isAuthenticated) {
    if (authView === 'login') {
      return <LoginPage onSwitchToRegister={() => setAuthView('register')} onSwitchToForgotPassword={() => setAuthView('forgot-password')} />;
    }
    if (authView === 'forgot-password') {
      return <ForgotPasswordPage onSwitchToLogin={() => setAuthView('login')} />;
    }
    if (authView === 'reset-password' && resetToken) {
      return <ResetPasswordPage token={resetToken} onSwitchToLogin={() => setAuthView('login')} />;
    }
    return <DealerRegistrationPage onSwitchToLogin={() => setAuthView('login')} />;
  }

  if (user?.role === 'Dealer') {
    const dealerInfo = dealers.find(d => d._id === user.dealerId);
    if (dealerInfo?.registrationApproved) {
        return <DealerDashboardLayout />;
    }
    return <PendingApprovalPage />;
  }

  return <DashboardLayout />;
};

export default App;
