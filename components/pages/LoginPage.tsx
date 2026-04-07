import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth.ts';
import { useAppContext } from '../../hooks/useAppContext.ts';
import { ActionType } from '../../types.ts';
import { seedSupabaseDatabase } from '../../utils/seedSupabase.ts';

const LoginPage: React.FC<{ onSwitchToRegister: () => void; onSwitchToForgotPassword: () => void }> = ({ onSwitchToRegister, onSwitchToForgotPassword }) => {
  const [email, setEmail] = useState('admin@system.com');
  const [password, setPassword] = useState('password');
  const [role, setRole] = useState<string>('Admin');
  const [isSeeding, setIsSeeding] = useState(false);
  const { login } = useAuth();
  const { logAction } = useAppContext();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const loggedInUser = await login(email, role, password);
      
      if (loggedInUser.role === 'Dealer' && loggedInUser.dealerId) {
          logAction(ActionType.Login, 'Dealers', loggedInUser.dealerId, `Dealer ${loggedInUser.name} logged in.`, loggedInUser);
      } else {
          logAction(ActionType.Login, 'Users', loggedInUser._id, `User ${loggedInUser.name} logged in.`, loggedInUser);
      }
    } catch (error) {
      alert("Login failed. Please check your credentials. If the database is empty, click 'Seed Database' first.");
    }
  };

  const handleSeedDatabase = async () => {
    setIsSeeding(true);
    try {
      const success = await seedSupabaseDatabase();
      setIsSeeding(false);
      if (success) {
        alert("Database seeded successfully! The page will now reload.");
        window.location.reload();
      } else {
        alert("Failed to seed database. Check console for errors.");
      }
    } catch (err: any) {
      setIsSeeding(false);
      alert("Error seeding database: " + (err.message || JSON.stringify(err)));
    }
  };

  const demoRoles = [
      'Admin', 'Super Admin', 'Dealer', 'Product Manager', 'Booking Manager', 'Stock Controller', 'Finance / Auditor', 'Logistics'
  ];

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-100 dark:bg-slate-900">
      <div className="w-full max-w-4xl m-4 grid md:grid-cols-2 shadow-2xl rounded-xl overflow-hidden">
        <div className="hidden md:flex flex-col items-center justify-center bg-gradient-to-br from-primary to-secondary p-12 text-white">
          <h1 className="text-6xl font-extrabold tracking-tighter">NEW ASIA</h1>
          <p className="mt-6 text-center text-red-100 font-medium text-lg">Dealer Management System</p>
        </div>
        <div className="p-8 sm:p-12 bg-white dark:bg-slate-800">
          <div className="text-left">
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Dealer Portal Login</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Please sign in to your account to continue.</p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-300">Email Address</label>
              <input
                id="email" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-white dark:bg-slate-700 dark:text-slate-200"
              />
            </div>
            <div>
              <div className="flex justify-between items-center">
                <label htmlFor="password-2" className="text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
                <button type="button" onClick={onSwitchToForgotPassword} className="text-sm font-medium text-primary hover:underline">
                  Forgot password?
                </button>
              </div>
              <input
                id="password" name="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-white dark:bg-slate-700 dark:text-slate-200"
              />
            </div>
            <div>
              <label htmlFor="role" className="text-sm font-medium text-slate-700 dark:text-slate-300">Login As (For Demo)</label>
              <select
                id="role" name="role" value={role} onChange={(e) => setRole(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-white dark:bg-slate-700 dark:text-slate-200"
              >
                {demoRoles.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200 hover:shadow-lg"
              >
                Sign in
              </button>
            </div>
          </form>
          <div className="text-sm text-center text-slate-600 dark:text-slate-400 mt-6 space-y-4">
              <p>For simulation purposes. No real authentication is performed.</p>
              <button onClick={onSwitchToRegister} className="font-medium text-primary hover:underline block w-full">
                  Register as a New Dealer
              </button>
              <button 
                onClick={handleSeedDatabase} 
                disabled={isSeeding}
                className="font-medium text-slate-500 hover:text-slate-700 underline block w-full"
              >
                  {isSeeding ? 'Seeding Database...' : 'Seed Supabase Database (Run Once)'}
              </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;