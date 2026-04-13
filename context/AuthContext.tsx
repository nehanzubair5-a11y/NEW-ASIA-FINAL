import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthContextType } from '../types.ts';
import { api, mapToCamelCase } from '../api/index.ts';
import { supabase, supabaseAdminAuth } from '../src/lib/supabase.ts';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check active sessions and sets the user
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                fetchAndSetUser(session.user.id);
            } else {
                setIsLoading(false);
            }
        });

        // Listen for changes on auth state (logged in, signed out, etc.)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                fetchAndSetUser(session.user.id);
            } else {
                setUser(null);
                setIsLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchAndSetUser = async (authId: string) => {
        try {
            // First, try to get the user by their auth_id
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('auth_id', authId)
                .single();
            
            if (data) {
                setUser(mapToCamelCase(data) as User);
            } else if (error && error.code !== 'PGRST116') {
                console.error("Error fetching user profile:", error);
            }
        } catch (error) {
            console.error("Failed to fetch user profile", error);
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (email: string, password?: string): Promise<User> => {
        try {
            if (!password) {
                throw new Error('Password is required for login');
            }

            // Add a timeout to prevent hanging if Supabase is sleeping or unreachable
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Connection timeout. Supabase might be waking up or unreachable. Please try again.')), 15000)
            );

            // 1. Try to sign in with Supabase Auth
            const authPromise = supabase.auth.signInWithPassword({
                email,
                password,
            });

            const { data: signInData, error: signInError } = await Promise.race([authPromise, timeoutPromise]) as any;

            if (signInError) {
                if (signInError.message.includes('Invalid API key')) {
                    throw new Error('Your Supabase API key is invalid. Please check your VITE_SUPABASE_ANON_KEY environment variable.');
                }
                // If invalid credentials, it might be because they are in public.users but not auth.users (auto-migration needed)
                if (signInError.message.includes('Invalid login credentials')) {
                    // Auto-migrate: Sign them up in auth.users
                    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                        email,
                        password,
                    });

                    if (signUpError) {
                        // If they are already registered, it means they just entered the wrong password
                        if (signUpError.message.includes('already registered')) {
                            throw signInError;
                        }
                        if (signUpError.message.includes('rate limit')) {
                            throw new Error('Email rate limit exceeded. Please try again later or use an existing account.');
                        }
                        throw signUpError;
                    }

                    if (signUpData.user) {
                        // Now that they are authenticated, we can query public.users
                        const { data: userData, error: userError } = await supabase
                            .from('users')
                            .select('*')
                            .eq('email', email)
                            .single();

                        if (userError || !userData) {
                            // User not found in public.users, they shouldn't be able to login
                            await supabase.auth.signOut();
                            throw new Error('Invalid email or user not found');
                        }

                        // Link the new auth.uid() to their public.users record
                        const { error: updateError } = await supabase
                            .from('users')
                            .update({ auth_id: signUpData.user.id })
                            .eq('email', email);
                        
                        if (updateError) {
                            console.error("Failed to link auth_id:", updateError);
                            throw new Error("Failed to complete account migration.");
                        }

                        const mappedUser = mapToCamelCase(userData) as User;
                        setUser(mappedUser);
                        return mappedUser;
                    }
                }
                throw signInError;
            }

            // If sign in succeeded, fetch the user profile
            if (signInData.user) {
                const { data, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('auth_id', signInData.user.id)
                    .single();
                
                if (error) {
                    // Fallback: maybe they signed up but linking failed? Try to link by email
                    const { data: emailData, error: emailError } = await supabase.from('users').select('*').eq('email', email).single();
                    
                    if (emailData) {
                        // Update auth_id even if it was previously set, to fix broken links (e.g., if user was deleted and recreated in Auth)
                        await supabase.from('users').update({ auth_id: signInData.user.id }).eq('email', email);
                        
                        const mappedUser = mapToCamelCase(emailData) as User;
                        setUser(mappedUser);
                        return mappedUser;
                    } else {
                        // User exists in Supabase Auth but not in public.users. Auto-create a profile.
                        let defaultRole = 'Dealer';
                        if (email === 'admin@system.com' || email === 'super@system.com' || email === 'zyakhh@gmail.com') {
                            defaultRole = 'Super Admin';
                        }
                        
                        const newUser = {
                            _id: `user-${Date.now()}`,
                            auth_id: signInData.user.id,
                            email: email,
                            name: email.split('@')[0],
                            role: defaultRole,
                        };
                        const { error: insertError } = await supabase.from('users').insert(newUser);
                        if (insertError) {
                            console.error("Failed to auto-create user profile:", insertError);
                            throw new Error('Failed to create user profile in database.');
                        }
                        const mappedUser = mapToCamelCase(newUser) as User;
                        setUser(mappedUser);
                        return mappedUser;
                    }
                }
                
                const mappedUser = mapToCamelCase(data) as User;
                setUser(mappedUser);
                return mappedUser;
            }
            
            throw new Error('Login failed');
        } catch (error) {
            console.error("Login error:", error);
            throw error;
        }
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
    };

    const updateCurrentUser = (updatedUser: User) => {
        setUser(updatedUser);
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated: !!user, user, login, logout, updateCurrentUser }}>
            {!isLoading && children}
        </AuthContext.Provider>
    );
};