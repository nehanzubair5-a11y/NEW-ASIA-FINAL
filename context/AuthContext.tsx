import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthContextType } from '../types.ts';
import { api } from '../api/index.ts';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        try {
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                setUser(JSON.parse(storedUser));
            }
        } catch (error) {
            console.error("Failed to parse user from localStorage", error);
            localStorage.removeItem('user');
        }
    }, []);

    const login = async (email: string, role: string, password?: string): Promise<User> => {
        try {
            // For this prototype, we query the users table directly by email.
            // In a production app, you would use supabase.auth.signInWithPassword()
            const userData = await api.getUserByEmail(email);

            if (!userData) {
                throw new Error('Invalid email or user not found');
            }
            
            // If the user has a password set, verify it
            if (userData.password && password) {
                const encoder = new TextEncoder();
                const pwData = encoder.encode(password);
                const pwHashBuffer = await crypto.subtle.digest('SHA-256', pwData);
                const hashedPassword = Array.from(new Uint8Array(pwHashBuffer), byte => byte.toString(16).padStart(2, '0')).join('');
                
                if (userData.password !== hashedPassword) {
                    throw new Error('Invalid password');
                }
            }
            
            setUser(userData);
            localStorage.setItem('user', JSON.stringify(userData));
            // We don't need a JWT token in localStorage for this prototype since we use Supabase anon key
            return userData;
        } catch (error) {
            console.error("Login error:", error);
            throw error;
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('user');
    };

    const updateCurrentUser = (updatedUser: User) => {
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated: !!user, user, login, logout, updateCurrentUser }}>
            {children}
        </AuthContext.Provider>
    );
};