'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    getMembers,
    getPendingPayments,
    approvePayment,
    rejectPayment,
    logoutAdmin,
    getStats,
    updateMember,
    createMember,
    deleteMember,
    applyMonthlyFee,
} from '../actions';

// Define serialized types (server actions convert Decimal to number)
type SerializedPayment = {
    id: number;
    memberId: number;
    amount: number;
    receiptUrl: string;
    status: string;
    note: string | null;
    createdAt: Date;
    updatedAt: Date;
};

type SerializedMember = {
    id: number;
    dni: string;
    name: string;
    email: string | null;
    phone: string | null;
    category: string;
    debt: number;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
};

type MemberWithPayments = SerializedMember & { payments: SerializedPayment[] };
type PaymentWithMember = SerializedPayment & { member: SerializedMember };

const categoryLabels: Record<string, string> = {
    PLANTEL_SUPERIOR: 'Plantel Superior',
    M19: 'M19',
    M17: 'M17',
    M16: 'M16',
    M15: 'M15',
    M14: 'M14',
    INFANTILES: 'Infantiles',
};

export default function DashboardClient() {
    const [activeTab, setActiveTab] = useState<'payments' | 'members'>('payments');
    const [members, setMembers] = useState<MemberWithPayments[]>([]);
    const [payments, setPayments] = useState<PaymentWithMember[]>([]);
    const [stats, setStats] = useState({ totalMembers: 0, totalDebt: 0, pendingPayments: 0 });
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<number | null>(null);
    const [editingMember, setEditingMember] = useState<MemberWithPayments | null>(null);
    const [showNewMemberForm, setShowNewMemberForm] = useState(false);
    const [newMember, setNewMember] = useState({ dni: '', name: '', email: '', phone: '', category: 'PLANTEL_SUPERIOR', debt: '' });
    const [formError, setFormError] = useState('');
    const [formLoading, setFormLoading] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; name: string } | null>(null);
    const [showFeeModal, setShowFeeModal] = useState(false);
    const [feeAmount, setFeeAmount] = useState('');
    const [feeSuccess, setFeeSuccess] = useState<string | null>(null);
    const router = useRouter();

    const loadData = useCallback(async () => {
        setLoading(true);
        setFormError('');
        try {
            console.log("Fetching dashboard data...");
            const [membersData, paymentsData, statsData] = await Promise.all([
                getMembers(),
                getPendingPayments(),
                getStats(),
            ]);
            console.log("Data fetched:", { members: membersData.length, payments: paymentsData.length });

            setMembers(membersData as MemberWithPayments[]);
            setPayments(paymentsData as PaymentWithMember[]);
            setStats({
                totalMembers: statsData.totalMembers,
                totalDebt: Number(statsData.totalDebt),
                pendingPayments: statsData.pendingPayments,
            });
        } catch (error) {
            console.error("Error loading data:", error);
            setFormError(`Error de conexión: ${error instanceof Error ? error.message : 'Falló la carga de datos'}`);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleApprove = async (paymentId: number) => {
        setActionLoading(paymentId);
        await approvePayment(paymentId);
        await loadData();
        setActionLoading(null);
    };

    const handleReject = async (paymentId: number) => {
        setActionLoading(paymentId);
        await rejectPayment(paymentId);
        await loadData();
        setActionLoading(null);
    };

    const handleLogout = async () => {
        await logoutAdmin();
        router.push('/admin');
    };

    const handleUpdateMember = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingMember) return;
        setFormLoading(true);
        setFormError('');
        await updateMember(editingMember.id, {
            name: editingMember.name,
            email: editingMember.email || '',
            phone: editingMember.phone || '',
            category: editingMember.category,
            debt: editingMember.debt,
        });
        setEditingMember(null);
        await loadData();
        setFormLoading(false);
    };

    const handleCreateMember = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMember.dni || !newMember.name) {
            setFormError('DNI y Nombre son obligatorios');
            return;
        }
        setFormLoading(true);
        setFormError('');
        const result = await createMember({
            ...newMember,
            debt: parseFloat(newMember.debt) || 0,
        });
        if (result.success) {
            setNewMember({ dni: '', name: '', email: '', phone: '', category: 'PLANTEL_SUPERIOR', debt: '' });
            setShowNewMemberForm(false);
            await loadData();
        } else {
            setFormError(result.error || 'Error al crear socio');
        }
        setFormLoading(false);
    };

    const handleDeleteMember = (memberId: number, memberName: string) => {
        setDeleteConfirm({ id: memberId, name: memberName });
    };

    const confirmDelete = async () => {
        if (!deleteConfirm) return;
        setActionLoading(deleteConfirm.id);
        await deleteMember(deleteConfirm.id);
        setDeleteConfirm(null);
        await loadData();
        setActionLoading(null);
    };

    const handleApplyFee = async () => {
        const amount = parseFloat(feeAmount);
        if (isNaN(amount) || amount <= 0) {
            setFormError('Ingresá un monto válido mayor a 0');
            return;
        }
        setFormLoading(true);
        setFormError('');
        const result = await applyMonthlyFee(amount);
        if (result.success) {
            setFeeSuccess(`Cuota de ${formatCurrency(amount)} aplicada a ${result.count} socios`);
            setFeeAmount('');
            setShowFeeModal(false);
            await loadData();
            setTimeout(() => setFeeSuccess(null), 5000);
        } else {
            setFormError(result.error || 'Error al aplicar cuota');
        }
        setFormLoading(false);
    };

    const formatCurrency = (value: number | string | { toString(): string }) => {
        const num = typeof value === 'number' ? value : parseFloat(value.toString());
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 0,
        }).format(num);
    };

    return (
        <div>
            <header className="admin-header">
                <div className="admin-logo" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <img src="/logo.jpg" alt="Logo" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                    Villegas Rugby Club - Admin
                </div>
                <nav className="admin-nav">
                    <button className="btn btn-secondary" onClick={handleLogout}>
                        Cerrar sesión
                    </button>
                </nav>
            </header>

            <main className="admin-main">
                {/* Stats */}
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-value">{stats.totalMembers}</div>
                        <div className="stat-label">Socios</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{formatCurrency(stats.totalDebt)}</div>
                        <div className="stat-label">Deuda Total</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{stats.pendingPayments}</div>
                        <div className="stat-label">Pagos Pendientes</div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="tabs">
                    <button
                        className={`tab ${activeTab === 'payments' ? 'active' : ''}`}
                        onClick={() => setActiveTab('payments')}
                    >
                        📄 Pagos Pendientes ({payments.length})
                    </button>
                    <button
                        className={`tab ${activeTab === 'members' ? 'active' : ''}`}
                        onClick={() => setActiveTab('members')}
                    >
                        👥 Socios ({members.length})
                    </button>
                </div>

                {loading ? (
                    <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                        <span className="loading">
                            <span className="spinner"></span>
                            Cargando...
                        </span>
                    </div>
                ) : activeTab === 'payments' ? (
                    <div className="card">
                        {payments.length === 0 ? (
                            <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                                No hay pagos pendientes 🎉
                            </p>
                        ) : (
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Socio</th>
                                            <th>DNI</th>
                                            <th>Monto</th>
                                            <th>Fecha</th>
                                            <th>Comprobante</th>
                                            <th>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {payments.map((payment) => (
                                            <tr key={payment.id}>
                                                <td>{payment.member.name}</td>
                                                <td>{payment.member.dni}</td>
                                                <td>{formatCurrency(payment.amount)}</td>
                                                <td>
                                                    {new Date(payment.createdAt).toLocaleDateString('es-AR')}
                                                </td>
                                                <td>
                                                    <a
                                                        href={payment.receiptUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style={{ color: 'var(--primary-light)' }}
                                                    >
                                                        Ver 📎
                                                    </a>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                        <button
                                                            className="btn btn-primary"
                                                            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                                                            onClick={() => handleApprove(payment.id)}
                                                            disabled={actionLoading === payment.id}
                                                        >
                                                            {actionLoading === payment.id ? '...' : '✓ Aprobar'}
                                                        </button>
                                                        <button
                                                            className="btn btn-secondary"
                                                            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                                                            onClick={() => handleReject(payment.id)}
                                                            disabled={actionLoading === payment.id}
                                                        >
                                                            ✗ Rechazar
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="card">
                        {/* New Member Button / Form */}
                        {!showNewMemberForm ? (
                            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                                <button
                                    className="btn btn-primary"
                                    onClick={() => setShowNewMemberForm(true)}
                                >
                                    ➕ Agregar Nuevo Socio
                                </button>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => setShowFeeModal(true)}
                                    style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
                                >
                                    💰 Aplicar Cuota Mensual
                                </button>
                            </div>
                        ) : null}

                        {feeSuccess && (
                            <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>
                                {feeSuccess}
                            </div>
                        )}

                        {showNewMemberForm && (
                            <div style={{ marginBottom: '1.5rem', padding: '1.5rem', background: 'var(--bg-input)', borderRadius: '12px' }}>
                                <h3 style={{ marginBottom: '1rem', color: 'var(--secondary)' }}>Nuevo Socio</h3>
                                {formError && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{formError}</div>}
                                <form onSubmit={handleCreateMember}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label className="form-label">DNI *</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                placeholder="Ej: 32.145.678"
                                                value={newMember.dni}
                                                onChange={(e) => setNewMember({ ...newMember, dni: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label className="form-label">Nombre Completo *</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                placeholder="Ej: Juan Pérez"
                                                value={newMember.name}
                                                onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label className="form-label">Email</label>
                                            <input
                                                type="email"
                                                className="form-input"
                                                placeholder="email@ejemplo.com"
                                                value={newMember.email}
                                                onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label className="form-label">Teléfono</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                placeholder="1155551234"
                                                value={newMember.phone}
                                                onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label className="form-label">Categoría</label>
                                            <select
                                                className="form-input"
                                                value={newMember.category}
                                                onChange={(e) => setNewMember({ ...newMember, category: e.target.value })}
                                            >
                                                <option value="PLANTEL_SUPERIOR">Plantel Superior</option>
                                                <option value="M19">M19</option>
                                                <option value="M17">M17</option>
                                                <option value="M16">M16</option>
                                                <option value="M15">M15</option>
                                                <option value="M14">M14</option>
                                                <option value="INFANTILES">Infantiles</option>
                                            </select>
                                        </div>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label className="form-label">Deuda Inicial</label>
                                            <input
                                                type="number"
                                                className="form-input"
                                                placeholder="0"
                                                value={newMember.debt}
                                                onChange={(e) => setNewMember({ ...newMember, debt: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                                        <button type="submit" className="btn btn-primary" disabled={formLoading}>
                                            {formLoading ? 'Guardando...' : 'Guardar Socio'}
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-secondary"
                                            onClick={() => {
                                                setShowNewMemberForm(false);
                                                setFormError('');
                                                setNewMember({ dni: '', name: '', email: '', phone: '', category: 'PLANTEL_SUPERIOR', debt: '' });
                                            }}
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* Edit Member Modal */}
                        {editingMember && (
                            <div style={{ marginBottom: '1.5rem', padding: '1.5rem', background: 'var(--bg-input)', borderRadius: '12px', border: '2px solid var(--secondary)' }}>
                                <h3 style={{ marginBottom: '1rem', color: 'var(--secondary)' }}>✏️ Editar Socio: {editingMember.name}</h3>
                                {formError && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{formError}</div>}
                                <form onSubmit={handleUpdateMember}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label className="form-label">DNI (no editable)</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={editingMember.dni}
                                                disabled
                                                style={{ opacity: 0.6 }}
                                            />
                                        </div>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label className="form-label">Nombre Completo *</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={editingMember.name}
                                                onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label className="form-label">Email</label>
                                            <input
                                                type="email"
                                                className="form-input"
                                                value={editingMember.email || ''}
                                                onChange={(e) => setEditingMember({ ...editingMember, email: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label className="form-label">Teléfono</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={editingMember.phone || ''}
                                                onChange={(e) => setEditingMember({ ...editingMember, phone: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label className="form-label">Categoría</label>
                                            <select
                                                className="form-input"
                                                value={editingMember.category}
                                                onChange={(e) => setEditingMember({ ...editingMember, category: e.target.value })}
                                            >
                                                <option value="PLANTEL_SUPERIOR">Plantel Superior</option>
                                                <option value="M19">M19</option>
                                                <option value="M17">M17</option>
                                                <option value="M16">M16</option>
                                                <option value="M15">M15</option>
                                                <option value="M14">M14</option>
                                                <option value="INFANTILES">Infantiles</option>
                                            </select>
                                        </div>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label className="form-label">Deuda</label>
                                            <input
                                                type="number"
                                                className="form-input"
                                                value={editingMember.debt}
                                                onChange={(e) => setEditingMember({ ...editingMember, debt: parseFloat(e.target.value) || 0 })}
                                            />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                                        <button type="submit" className="btn btn-primary" disabled={formLoading}>
                                            {formLoading ? 'Guardando...' : 'Guardar Cambios'}
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-secondary"
                                            onClick={() => {
                                                setEditingMember(null);
                                                setFormError('');
                                            }}
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Nombre</th>
                                        <th>DNI</th>
                                        <th>Categoría</th>
                                        <th>Deuda</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {members.map((member) => (
                                        <tr key={member.id}>
                                            <td>{member.name}</td>
                                            <td>{member.dni}</td>
                                            <td>
                                                <span className="member-category" style={{ margin: 0 }}>
                                                    {categoryLabels[member.category] || member.category}
                                                </span>
                                            </td>
                                            <td>
                                                <span
                                                    style={{
                                                        color:
                                                            member.debt > 0
                                                                ? 'var(--error)'
                                                                : 'var(--success)',
                                                    }}
                                                >
                                                    {formatCurrency(member.debt)}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button
                                                        className="btn btn-secondary"
                                                        style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                                                        onClick={() => setEditingMember(member)}
                                                    >
                                                        ✏️ Editar
                                                    </button>
                                                    <button
                                                        className="btn"
                                                        style={{
                                                            padding: '0.5rem 1rem',
                                                            fontSize: '0.85rem',
                                                            background: 'var(--error)',
                                                            color: 'white'
                                                        }}
                                                        onClick={() => handleDeleteMember(member.id, member.name)}
                                                        disabled={actionLoading === member.id}
                                                    >
                                                        {actionLoading === member.id ? '...' : '🗑️'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                }}>
                    <div style={{
                        background: 'var(--bg-card)',
                        borderRadius: '16px',
                        padding: '2rem',
                        maxWidth: '400px',
                        textAlign: 'center',
                        border: '1px solid var(--error)',
                    }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
                        <h3 style={{ marginBottom: '1rem' }}>¿Eliminar socio?</h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                            Estás por eliminar a <strong style={{ color: 'var(--text-primary)' }}>{deleteConfirm.name}</strong>.
                            Esta acción no se puede deshacer.
                        </p>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <button
                                className="btn btn-secondary"
                                onClick={() => setDeleteConfirm(null)}
                            >
                                Cancelar
                            </button>
                            <button
                                className="btn"
                                style={{ background: 'var(--error)', color: 'white' }}
                                onClick={confirmDelete}
                                disabled={actionLoading === deleteConfirm.id}
                            >
                                {actionLoading === deleteConfirm.id ? 'Eliminando...' : 'Sí, eliminar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Monthly Fee Modal */}
            {showFeeModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                }}>
                    <div style={{
                        background: 'var(--bg-card)',
                        borderRadius: '16px',
                        padding: '2rem',
                        maxWidth: '400px',
                        width: '90%',
                        border: '1px solid var(--primary)',
                    }}>
                        <h3 style={{ marginBottom: '1rem', color: 'var(--primary-light)' }}>💰 Aplicar Cuota Mensual</h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                            Esto sumará el monto ingresado a la deuda actual de <strong>todos los socios activos</strong>.
                        </p>

                        {formError && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{formError}</div>}

                        <div className="form-group">
                            <label className="form-label">Monto de la cuota</label>
                            <input
                                type="number"
                                className="form-input"
                                placeholder="Ej: 25000"
                                value={feeAmount}
                                onChange={(e) => setFeeAmount(e.target.value)}
                                autoFocus
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                            <button
                                className="btn btn-secondary"
                                onClick={() => {
                                    setShowFeeModal(false);
                                    setFeeAmount('');
                                    setFormError('');
                                }}
                            >
                                Cancelar
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleApplyFee}
                                disabled={formLoading}
                            >
                                {formLoading ? 'Aplicando...' : 'Aplicar a Todos'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
