'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
    user: User | null;
    role: 'admin' | 'editor' | 'viewer' | null;
    loading: boolean;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    role: null,
    loading: true,
    logout: async () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<'admin' | 'editor' | 'viewer' | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setUser(user);

            if (user && user.email) {
                try {
                    const userDoc = await getDoc(doc(db, 'users', user.email));
                    if (userDoc.exists()) {
                        setRole(userDoc.data().role as any);
                    } else {
                        setRole('viewer'); // Default role if not found
                    }
                } catch (error) {
                    console.error("Error fetching user role:", error);
                    setRole('viewer');
                }
            } else {
                setRole(null);
            }

            setLoading(false);

            // Protection logic
            if (!user && pathname !== '/login') {
                router.push('/login');
            }
            if (user && pathname === '/login') {
                router.push('/');
            }
        });

        return () => unsubscribe();
    }, [pathname, router]);

    const logout = async () => {
        try {
            await signOut(auth);
            router.push('/login');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, role, loading, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
