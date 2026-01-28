'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginAdmin } from './actions';

export default function AdminLogin() {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const result = await loginAdmin(password);
        if (result.success) {
            router.push('/admin/dashboard');
        } else {
            setError(result.error || 'Error de autenticación');
        }
        setLoading(false);
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-dark)'
        }}>
            <div className="card" style={{ maxWidth: '400px', width: '100%' }}>
                <div className="card-header" style={{ justifyContent: 'center' }}>
                    <div className="card-icon">🔐</div>
                    <h2 className="card-title">Panel de Administración</h2>
                </div>

                {error && <div className="alert alert-error">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label" htmlFor="password">
                            Contraseña
                        </label>
                        <input
                            type="password"
                            id="password"
                            className="form-input"
                            placeholder="Ingresá la contraseña"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <button
                        type="submit"
                        className="btn btn-primary btn-full"
                        disabled={loading || !password}
                    >
                        {loading ? (
                            <span className="loading">
                                <span className="spinner"></span>
                                Verificando...
                            </span>
                        ) : (
                            'Ingresar'
                        )}
                    </button>
                </form>

                <p style={{
                    textAlign: 'center',
                    marginTop: '1.5rem',
                    color: 'var(--text-secondary)',
                    fontSize: '0.85rem'
                }}>
                    <a href="/" style={{ color: 'var(--primary-light)' }}>
                        ← Volver al inicio
                    </a>
                </p>
            </div>
        </div>
    );
}
