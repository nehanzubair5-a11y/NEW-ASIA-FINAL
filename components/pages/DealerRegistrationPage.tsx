import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth.ts';
import { useData } from '../../hooks/useData.ts';

// Add a simple email validation function
const validateEmail = (email: string): boolean => {
    if (!email) return false;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
};

const DealerRegistrationPage: React.FC<{ onSwitchToLogin: () => void; }> = ({ onSwitchToLogin }) => {
    const { login } = useAuth();
    const { registerDealer } = useData();

    const [formData, setFormData] = useState({
        name: '',
        ownerName: '',
        phone: '',
        email: '',
        city: '',
        password: '',
    });
    const [errors, setErrors] = useState({ email: '', password: '', form: '' });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        // Real-time validation
        if (name === 'email') {
            if (value && !validateEmail(value)) {
                setErrors(prev => ({ ...prev, email: 'Please enter a valid email address.' }));
            } else {
                setErrors(prev => ({ ...prev, email: '' }));
            }
        }
        if (name === 'password') {
            if (value && value.length < 6) {
                setErrors(prev => ({ ...prev, password: 'Password must be at least 6 characters.' }));
            } else {
                setErrors(prev => ({ ...prev, password: '' }));
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors(prev => ({ ...prev, form: '' }));

        const emailIsValid = validateEmail(formData.email);
        const passwordIsValid = formData.password.length >= 6;

        if (!emailIsValid || !passwordIsValid) {
            setErrors(prev => ({
                ...prev,
                email: emailIsValid ? '' : 'Please enter a valid email address.',
                password: passwordIsValid ? '' : 'Password must be at least 6 characters.',
            }));
            return;
        }


        try {
            const { password, ...dealerData } = formData;
            const newDealer = await registerDealer(dealerData);
            
            // In a real app, you would securely create a user account.
            // Here, we simulate by logging them in immediately.
            login(newDealer.email, 'Dealer');
            // The main App component will now route them to the PendingApprovalPage
        } catch (err) {
            setErrors(prev => ({ ...prev, form: 'An error occurred during registration. Please try again.' }));
            console.error(err);
        }
    };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800">Dealer Registration</h1>
          <p className="mt-2 text-sm text-gray-600">Join the New Asia network. Fill out your details below.</p>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label className="text-sm font-medium text-gray-700">Dealer Name</label>
                    <input name="name" type="text" required value={formData.name} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm" />
                </div>
                 <div>
                    <label className="text-sm font-medium text-gray-700">Owner Name</label>
                    <input name="ownerName" type="text" required value={formData.ownerName} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm" />
                </div>
            </div>
            <div>
                <label className="text-sm font-medium text-gray-700">Email Address</label>
                <input 
                    name="email" 
                    type="email" 
                    required 
                    value={formData.email} 
                    onChange={handleChange} 
                    className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm sm:text-sm ${errors.email ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-primary focus:border-primary'}`} 
                />
                 {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="text-sm font-medium text-gray-700">Phone</label>
                    <input name="phone" type="tel" required value={formData.phone} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm" />
                </div>
                <div>
                    <label className="text-sm font-medium text-gray-700">City</label>
                    <input name="city" type="text" required value={formData.city} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm" />
                </div>
            </div>
             <div>
                <label className="text-sm font-medium text-gray-700">Password</label>
                <input 
                    name="password" 
                    type="password" 
                    required 
                    value={formData.password} 
                    onChange={handleChange} 
                    className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm sm:text-sm ${errors.password ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-primary focus:border-primary'}`} 
                />
                {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
            </div>
          {errors.form && <p className="text-sm text-red-600">{errors.form}</p>}
          <div>
            <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
              Register
            </button>
          </div>
        </form>
        <div className="text-sm text-center text-gray-600">
            <button onClick={onSwitchToLogin} className="font-medium text-primary hover:underline">
                Already have an account? Login
            </button>
        </div>
      </div>
    </div>
  );
};

export default DealerRegistrationPage;
