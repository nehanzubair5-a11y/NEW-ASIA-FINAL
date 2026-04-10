import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthContextType } from '../types.ts';
import { api, mapToCamelCase } from '../api/index.ts';
import { supabase, supabaseAdminAuth, isSupabaseConfigured } from '../src/lib/supabase.ts';

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
            if (!isSupabaseConfigured) {
                throw new Error('Supabase is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment variables.');
            }

            if (!password) {
                throw new Error('Password is required for login');
            }

            // 1. Try to sign in with Supabase Auth
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

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
                    if (emailData && !emailData.auth_id) {
                        await supabase.from('users').update({ auth_id: signInData.user.id }).eq('email', email);
                        
                        const mappedUser = mapToCamelCase(emailData) as User;
                        setUser(mappedUser);
                        return mappedUser;
                    }
                    console.error("User profile not found after login:", error, emailError);
                    throw new Error('User profile not found in database');
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