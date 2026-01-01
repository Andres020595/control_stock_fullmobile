'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, X, MessageSquare, User, Bot } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export default function Assistant() {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    if (!user) return null;

    const handleSend = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: Message = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/assistant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, userMessage].map(m => ({
                        role: m.role,
                        content: m.content
                    }))
                })
            });

            const data = await response.json();
            if (data.answer) {
                setMessages(prev => [...prev, { role: 'assistant', content: data.answer }]);
            } else if (data.error) {
                const errorMsg = data.details ? `${data.error} (${data.details})` : data.error;
                setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${errorMsg}` }]);
            }
        } catch (error) {
            setMessages(prev => [...prev, { role: 'assistant', content: 'Lo siento, hubo un problema al conectar con el asistente.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="assistant-trigger"
                style={{
                    position: 'fixed',
                    bottom: '24px',
                    right: '24px',
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: 'var(--primary-gradient)',
                    color: 'white',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 8px 32px rgba(10, 132, 255, 0.4)',
                    cursor: 'pointer',
                    zIndex: 1000,
                    transition: 'transform 0.3s ease'
                }}
            >
                {isOpen ? <X size={28} /> : <Sparkles size={28} />}
            </button>

            {/* Chat Panel */}
            {isOpen && (
                <div className="glass-card assistant-panel animate-slide-in" style={{
                    position: 'fixed',
                    bottom: '100px',
                    right: '24px',
                    width: '400px',
                    height: '550px',
                    zIndex: 999,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    background: 'rgba(28, 28, 30, 0.95)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 12px 48px rgba(0, 0, 0, 0.5)'
                }}>
                    {/* Header */}
                    <header style={{
                        padding: '20px',
                        borderBottom: '1px solid rgba(255,255,255,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        <div style={{
                            background: 'var(--primary-gradient)',
                            padding: '8px',
                            borderRadius: '10px'
                        }}>
                            <Bot size={20} color="white" />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1rem' }}>Asistente Full Mobile</h3>
                            <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.5 }}>Información de Negocio en Tiempo Real</p>
                        </div>
                    </header>

                    {/* Messages Area */}
                    <div
                        ref={scrollRef}
                        style={{
                            flex: 1,
                            padding: '20px',
                            overflowY: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '16px'
                        }}
                    >
                        {messages.length === 0 && (
                            <div style={{ textAlign: 'center', marginTop: '40px', opacity: 0.5 }}>
                                <MessageSquare size={40} style={{ marginBottom: '16px' }} />
                                <p>Hola, soy tu asistente de negocio.</p>
                                <p style={{ fontSize: '0.85rem' }}>¿En qué puedo ayudarte hoy?</p>
                            </div>
                        )}
                        {messages.map((m, i) => (
                            <div key={i} style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: m.role === 'user' ? 'flex-end' : 'flex-start'
                            }}>
                                <div style={{
                                    maxWidth: '85%',
                                    padding: '12px 16px',
                                    borderRadius: '16px',
                                    fontSize: '0.95rem',
                                    lineHeight: '1.4',
                                    background: m.role === 'user' ? 'var(--harmony-blue)' : 'rgba(255,255,255,0.08)',
                                    color: 'white',
                                    borderBottomRightRadius: m.role === 'user' ? '4px' : '16px',
                                    borderBottomLeftRadius: m.role === 'assistant' ? '4px' : '16px'
                                }}>
                                    {m.content}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '12px' }}>
                                <div className="typing-dot" style={{ width: '8px', height: '8px', background: 'white', borderRadius: '50%', opacity: 0.4 }}></div>
                                <div className="typing-dot" style={{ width: '8px', height: '8px', background: 'white', borderRadius: '50%', opacity: 0.6 }}></div>
                                <div className="typing-dot" style={{ width: '8px', height: '8px', background: 'white', borderRadius: '50%', opacity: 0.8 }}></div>
                            </div>
                        )}
                    </div>

                    {/* Input Area */}
                    <form
                        onSubmit={handleSend}
                        style={{
                            padding: '20px',
                            borderTop: '1px solid rgba(255,255,255,0.1)',
                            display: 'flex',
                            gap: '10px'
                        }}
                    >
                        <input
                            type="text"
                            placeholder="Escribe tu duda aquí..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            style={{
                                flex: 1,
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '12px',
                                padding: '12px 16px',
                                color: 'white',
                                outline: 'none'
                            }}
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isLoading}
                            style={{
                                background: 'var(--primary-gradient)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '12px',
                                width: '45px',
                                height: '45px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                opacity: !input.trim() || isLoading ? 0.5 : 1
                            }}
                        >
                            <Send size={20} />
                        </button>
                    </form>
                </div>
            )}

            <style jsx>{`
                .assistant-trigger:hover { transform: scale(1.1); }
                .typing-dot { animation: pulse 1.5s infinite ease-in-out; }
                .typing-dot:nth-child(2) { animation-delay: 0.2s; }
                .typing-dot:nth-child(3) { animation-delay: 0.4s; }
                @keyframes pulse { 0%, 100% { transform: scale(0.8); opacity: 0.4; } 50% { transform: scale(1.2); opacity: 0.9; } }
            `}</style>
        </>
    );
}
