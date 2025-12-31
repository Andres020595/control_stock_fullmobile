import Link from 'next/link';
import { Monitor, Cpu, Battery, Smartphone } from 'lucide-react';

export default function Home() {
    const components = [
        { title: 'Pantallas LCD', icon: <Monitor size={48} />, href: '/lcd', active: true },
        { title: 'Baterías', icon: <Battery size={48} />, href: '#', active: false },
        { title: 'Placas Base', icon: <Cpu size={48} />, href: '#', active: false },
        { title: 'Cámaras', icon: <Smartphone size={48} />, href: '#', active: false },
    ];

    return (
        <main className="home-container">
            <div className="logo-container">
                <div className="logo-glow"></div>
                <img src="/Logo.png" alt="Full Mobile Logo" className="logo-img" />
            </div>
            <header className="home-header">
                <h1 style={{ fontSize: '3.5rem', marginBottom: '8px' }}>Full Mobile</h1>
                <h2 style={{ fontSize: '1.8rem', marginBottom: '16px', opacity: 0.8, fontWeight: 500 }}>Control de Piezas</h2>
                <p style={{ fontSize: '1.1rem', opacity: 0.6 }}>Gestión profesional de inventario y precios</p>
            </header>

            <div className="home-grid">
                {components.map((c) => (
                    <Link
                        key={c.title}
                        href={c.active ? c.href : '#'}
                        className={`home-card ${!c.active ? 'disabled' : ''}`}
                    >
                        <div className="glass-card" style={{
                            padding: '40px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '24px',
                            height: '320px',
                            justifyContent: 'center'
                        }}>
                            <div style={{
                                background: c.active ? 'var(--primary-gradient)' : 'rgba(255,255,255,0.1)',
                                color: c.active ? 'white' : 'rgba(255,255,255,0.4)',
                                padding: '24px',
                                borderRadius: '24px',
                                boxShadow: c.active ? '0 8px 24px rgba(10, 132, 255, 0.3)' : 'none'
                            }}>
                                {c.icon}
                            </div>
                            <h2 style={{ fontSize: '1.5rem' }}>{c.title}</h2>
                            {!c.active && <span style={{ fontSize: '0.9rem', opacity: 0.5 }}>Próximamente</span>}
                        </div>
                    </Link>
                ))}
            </div>
        </main>
    );
}
