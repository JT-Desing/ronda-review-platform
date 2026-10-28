import React, { useState } from 'react';
import { api } from '../state/accountStorage.js';
import { BrandLoader } from './BrandLoader.jsx';
import rondaLogo from '../ronda-logo-white-silver.svg';
import { clearPasswordResetLink } from '../domain/password-reset-link.js';

export function PasswordRecovery({ token = '', invalidLink = false, initialEmail = '', onBack, onRequestNewLink }) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [requested, setRequested] = useState(false);
  const [completed, setCompleted] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      if (token) {
        if (password !== confirmation) throw new Error('Las contraseñas no coinciden.');
        await api('/api/auth/password-reset/complete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password }) });
        clearPasswordResetLink();
        setCompleted(true);
        setPassword('');
        setConfirmation('');
      } else {
        await api('/api/auth/password-reset/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
        setRequested(true);
      }
    } catch (failure) {
      setError(failure.message || 'No se pudo completar la solicitud. Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  return <main className="account-access"><section className="account-card" aria-labelledby="password-recovery-title">
    <span className="account-brand"><img src={rondaLogo} alt=""/><span>Ronda</span></span>
    <h1 id="password-recovery-title">{invalidLink ? 'El enlace no es válido' : token ? 'Crea una contraseña nueva' : 'Recupera tu cuenta'}</h1>
    {invalidLink ? <><p role="alert" className="account-error">El enlace de recuperación está incompleto o no es válido. Solicita uno nuevo para continuar.</p><button className="account-primary" type="button" onClick={onRequestNewLink}>Solicitar un enlace nuevo</button><button className="account-text-button" type="button" onClick={onBack}>Volver a iniciar sesión</button></> : token ? completed ? <><p role="status">Tu contraseña se actualizó. Ya puedes entrar con la nueva contraseña.</p><button className="account-primary" type="button" onClick={onBack}>Ir a iniciar sesión</button></> : <>
      <p>Elige una contraseña de 12 a 128 caracteres. Por seguridad, se cerrarán las demás sesiones.</p>
      <form onSubmit={submit}>
        <label>Nueva contraseña<input autoFocus type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={password} onChange={event => setPassword(event.target.value)}/></label>
        <label>Confirma tu contraseña<input type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={confirmation} onChange={event => setConfirmation(event.target.value)}/></label>
        {error && <p role="alert" className="account-error">{error}</p>}
        <button className="account-primary" disabled={busy || password.length < 12 || !confirmation}>{busy ? <BrandLoader size="inline" label="Actualizando contraseña…"/> : 'Actualizar contraseña'}</button>
      </form>
    </> : requested ? <><p role="status">Si el correo corresponde a una cuenta, recibirás instrucciones cuando el servicio de correo esté disponible. Revisa también la carpeta de spam.</p><p>El enlace es de un solo uso y vence en 30 minutos.</p><button className="account-primary" type="button" onClick={onBack}>Volver a iniciar sesión</button></> : <>
      <p>Escribe el correo de tu cuenta. Si existe, enviaremos un enlace de un solo uso que vence en 30 minutos.</p>
      <form onSubmit={submit}>
        <label>Correo<input autoFocus type="email" autoComplete="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)}/></label>
        {error && <p role="alert" className="account-error">{error}</p>}
        <button className="account-primary" disabled={busy || !email.trim()}>{busy ? <BrandLoader size="inline" label="Solicitando enlace…"/> : 'Enviar instrucciones'}</button>
      </form>
      <button className="account-text-button" type="button" onClick={onBack}>Volver a iniciar sesión</button>
    </>}
  </section></main>;
}
