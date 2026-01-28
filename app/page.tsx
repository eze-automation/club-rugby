'use client';

import { useState, useRef } from 'react';
import { getMemberByDNI, uploadPayment } from './actions';
import type { Member, Payment } from '../generated/prisma/client';

type MemberWithPayments = Member & { payments: Payment[] };

const categoryLabels: Record<string, string> = {
  PLANTEL_SUPERIOR: 'Plantel Superior',
  M19: 'M19',
  M17: 'M17',
  M16: 'M16',
  M15: 'M15',
  M14: 'M14',
  INFANTILES: 'Infantiles',
};

export default function Home() {
  const [dni, setDni] = useState('');
  const [member, setMember] = useState<MemberWithPayments | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadAmount, setUploadAmount] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dni.trim()) return;

    setLoading(true);
    setError('');
    setMember(null);

    try {
      const result = await getMemberByDNI(dni);
      if (result) {
        setMember(result as MemberWithPayments);
      } else {
        setError('No se encontró ningún socio con ese DNI');
      }
    } catch {
      setError('Error al buscar socio');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !uploadAmount || !member) return;

    setUploading(true);
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('dni', member.dni);
    formData.append('amount', uploadAmount);
    formData.append('receipt', selectedFile);

    try {
      const result = await uploadPayment(formData);
      if (result.success) {
        setSuccess(result.message || 'Comprobante enviado correctamente');
        setSelectedFile(null);
        setUploadAmount('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        // Refresh member data
        const updatedMember = await getMemberByDNI(member.dni);
        if (updatedMember) setMember(updatedMember as MemberWithPayments);
      } else {
        setError(result.error || 'Error al enviar comprobante');
      }
    } catch {
      setError('Error al enviar comprobante');
    } finally {
      setUploading(false);
    }
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
    <>
      <header className="hero">
        <img
          src="/logo.jpg"
          alt="Villegas Rugby Club"
          style={{
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            marginBottom: '1rem',
            border: '3px solid var(--secondary)',
            objectFit: 'cover'
          }}
        />
        <h1>Villegas Rugby Club</h1>
        <p>Sistema de Gestión de Cuotas</p>
      </header>

      <main className="container">
        {/* Search Card */}
        <div className="card">
          <div className="card-header">
            <div className="card-icon">🔍</div>
            <h2 className="card-title">Consultar Estado de Cuenta</h2>
          </div>
          <form onSubmit={handleSearch}>
            <div className="form-group">
              <label className="form-label" htmlFor="dni">
                DNI del Socio
              </label>
              <input
                type="text"
                id="dni"
                className="form-input"
                placeholder="Ej: 32.145.678"
                value={dni}
                onChange={(e) => setDni(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={loading || !dni.trim()}
            >
              {loading ? (
                <span className="loading">
                  <span className="spinner"></span>
                  Buscando...
                </span>
              ) : (
                'Buscar Socio'
              )}
            </button>
          </form>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {/* Member Info */}
        {member && (
          <>
            <div className="member-info">
              <h3 className="member-name">{member.name}</h3>
              <span className="member-category">
                {categoryLabels[member.category] || member.category}
              </span>
              <div>
                <p className="member-debt-label">Saldo actual</p>
                <p
                  className={`member-debt ${parseFloat(member.debt.toString()) > 0 ? 'has-debt' : 'no-debt'
                    }`}
                >
                  {formatCurrency(member.debt)}
                </p>
              </div>
            </div>

            {/* Upload Payment */}
            {parseFloat(member.debt.toString()) > 0 && (
              <div className="card">
                <div className="card-header">
                  <div className="card-icon">📄</div>
                  <h2 className="card-title">Enviar Comprobante de Pago</h2>
                </div>
                <form onSubmit={handleUpload}>
                  <div className="form-group">
                    <label className="form-label">Monto abonado</label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="Ej: 12500"
                      value={uploadAmount}
                      onChange={(e) => setUploadAmount(e.target.value)}
                      min="1"
                      step="1"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Comprobante (imagen)</label>
                    <div
                      className={`file-upload ${selectedFile ? 'has-file' : ''}`}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                      />
                      <div className="file-upload-icon">
                        {selectedFile ? '✅' : '📎'}
                      </div>
                      <p className="file-upload-text">
                        {selectedFile
                          ? selectedFile.name
                          : 'Hacé clic para seleccionar imagen'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary btn-full"
                    disabled={uploading || !selectedFile || !uploadAmount}
                  >
                    {uploading ? (
                      <span className="loading">
                        <span className="spinner"></span>
                        Enviando...
                      </span>
                    ) : (
                      'Enviar Comprobante'
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* Recent Payments */}
            {member.payments && member.payments.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <div className="card-icon">💳</div>
                  <h2 className="card-title">Últimos Pagos</h2>
                </div>
                <ul className="payment-list">
                  {member.payments.map((payment) => (
                    <li key={payment.id} className="payment-item">
                      <div>
                        <strong>{formatCurrency(payment.amount)}</strong>
                        <br />
                        <small style={{ color: 'var(--text-secondary)' }}>
                          {new Date(payment.createdAt).toLocaleDateString('es-AR')}
                        </small>
                      </div>
                      <span
                        className={`payment-status ${payment.status.toLowerCase()}`}
                      >
                        {payment.status === 'PENDING'
                          ? 'Pendiente'
                          : payment.status === 'APPROVED'
                            ? 'Aprobado'
                            : 'Rechazado'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
