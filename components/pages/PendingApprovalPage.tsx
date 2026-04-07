import React from 'react';
import { useAuth } from '../../hooks/useAuth.ts';
import { LogOutIcon } from '../icons/Icons.tsx';

const PendingApprovalPage: React.FC = () => {
  const { logout, user } = useAuth();

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-lg p-8 text-center bg-white rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-gray-800">Registration Pending</h1>
        <p className="mt-4 text-gray-600">
          Hello, {user?.name}. Your dealer account registration is currently under review by our administration team.
        </p>
        <p className="mt-2 text-gray-600">
          You will be notified once your account is approved. If you have any questions, please contact support.
        </p>
        <button
          onClick={logout}
          className="mt-8 w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          <LogOutIcon className="mr-2" />
          Logout
        </button>
      </div>
    </div>
  );
};

export default PendingApprovalPage;
