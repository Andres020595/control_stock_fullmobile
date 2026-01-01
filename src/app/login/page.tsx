'use client';

import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { logLogin } from '@/lib/logger';
import { doc, getDoc } from 'firebase/firestore';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await signInWithEmailAndPassword(auth, email, password);

            // Get role for logging
            let role = 'viewer';
            const userDoc = await getDoc(doc(db, 'users', email));
            if (userDoc.exists()) {
                role = userDoc.data().role;
            }

            await logLogin(email, role);
            router.push('/');
        } catch (err: any) {
            console.error('Login error:', err);
            setError('Credenciales inválidas. Por favor intente de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="home-container" style={{ justifyContent: 'center' }}>
            <div className="logo-container" style={{ transform: 'scale(0.8)', marginBottom: '20px' }}>
                <div className="logo-glow"></div>
                <img src="/Logo.png" alt="Full Mobile Logo" className="logo-img" />
            </div>

            <div className="glass-card animate-slide-in" style={{
                padding: '40px',
                width: '100%',
                maxWidth: '450px',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Bienvenido</h1>
                    <p style={{ opacity: 0.6 }}>Inicie sesión para continuar</p>
                </div>

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', opacity: 0.8 }}>Email</label>
                        <input
                            type="email"
                            className="harmony-input"
                            style={{ width: '100%' }}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="correo@ejemplo.com"
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', opacity: 0.8 }}>Contraseña</label>
                        <input
                            type="password"
                            className="harmony-input"
                            style={{ width: '100%' }}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="••••••••"
                        />
                    </div>

                    {error && (
                        <div style={{
                            padding: '12px',
                            background: 'rgba(255, 59, 48, 0.1)',
                            color: '#ff3b30',
                            borderRadius: '12px',
                            fontSize: '0.9rem',
                            textAlign: 'center',
                            border: '1px solid rgba(255, 59, 48, 0.2)'
                        }}>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="harmony-button"
                        style={{
                            width: '100%',
                            padding: '16px',
                            marginTop: '10px',
                            fontSize: '1rem',
                            background: loading ? '#9ca3af' : 'var(--primary-gradient)'
                        }}
                    >
                        {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                    </button>
                </form>
            </div>

            <p style={{ marginTop: '24px', opacity: 0.4, fontSize: '0.8rem' }}>
                Control de Piezas © 2024 Full Mobile
            </p>
        </main>
    );
}
