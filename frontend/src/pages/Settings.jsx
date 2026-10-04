import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { api } from '../api.js';
import { Btn, Card, list, useLoad } from '../ui.jsx';

const Toggle = ({ on, set, label, description, disabled = false }) => (
  <div className="row between settings-toggle-row">
    <div>
      <b>{label}</b>
      {description && <p className="muted small">{description}</p>}
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => set(!on)}
      className={'sw' + (on ? ' on' : '')}
    >
      <motion.i layout transition={{ type: 'spring', stiffness: 600, damping: 32 }} />
    </button>
  </div>
);

export default function Settings() {
  const [u, userErr, reloadUser] = useLoad('/auth/me');
  const [n, notifErr, reloadNotif] = useLoad('/notifications/settings');
  const [history, historyErr, reloadHistory] = useLoad('/notifications');
  const [account, setAccount] = useState({ name: '', email: '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });
  const [saving, setSaving] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [compact, setCompact] = useState(() => localStorage.getItem('pulse.compact') === '1');

  useEffect(() => {
    if (u?.user) setAccount({ name: u.user.name || '', email: u.user.email || '' });
  }, [u]);

  useEffect(() => {
    document.body.classList.toggle('compact', compact);
    localStorage.setItem('pulse.compact', compact ? '1' : '0');
  }, [compact]);

  useEffect(() => {
    const err = userErr || notifErr || historyErr;
    if (err) setError(err);
  }, [userErr, notifErr, historyErr]);

  const flash = (text, isError = false) => {
    setError(isError ? text : '');
    setMessage(isError ? '' : text);
    window.clearTimeout(window.__pulseFlash);
    window.__pulseFlash = window.setTimeout(() => {
      setMessage('');
      setError('');
    }, 2200);
  };

  const saveAccount = async e => {
    e.preventDefault();
    setSaving('account');
    try {
      await api('/auth/me', { method: 'PUT', body: account });
      await reloadUser();
      flash('Account details saved.');
    } catch (e) {
      if (e.message !== 'Unauthorized') flash(e.message, true);
    } finally {
      setSaving('');
    }
  };

  const saveNotification = async (patch) => {
    if (!n) return;
    setSaving('notifications');
    try {
      await api('/notifications/settings', {
        method: 'PUT',
        body: {
          emailAlerts: n.emailAlerts,
          weeklyDigest: n.weeklyDigest,
          ...patch
        }
      });
      await reloadNotif();
      flash('Notification settings saved.');
    } catch (e) {
      if (e.message !== 'Unauthorized') flash(e.message, true);
    } finally {
      setSaving('');
    }
  };

  const changePassword = async e => {
    e.preventDefault();
    setSaving('password');
    try {
      await api('/auth/password', { method: 'PUT', body: passwords });
      setPasswords({ currentPassword: '', newPassword: '' });
      flash('Password updated.');
    } catch (e) {
      if (e.message !== 'Unauthorized') flash(e.message, true);
    } finally {
      setSaving('');
    }
  };

  const deleteAccount = async () => {
    const password = window.prompt('Enter your password to permanently delete your PULSE account.');
    if (password === null) return;
    if (!password) {
      flash('Password is required.', true);
      return;
    }
    if (!window.confirm('Delete your account and all monitors, checks, incidents and notifications? This cannot be undone.')) return;

    setSaving('delete');
    try {
      await api('/auth/me', { method: 'DELETE', body: { password } });
      window.location.href = '/';
    } catch (e) {
      if (e.message !== 'Unauthorized') flash(e.message, true);
    } finally {
      setSaving('');
    }
  };

  const items = history?.notifications || [];

  return (
    <>
      <div className="row between settings-head">
        <div>
          <h1>Settings</h1>
          <p className="muted">Manage your account, notifications and dashboard preferences.</p>
        </div>
        {(message || error) && <span className={error ? 'err small' : 'ok-t small'}>{error || message}</span>}
      </div>

      <motion.div className="settings-grid" variants={list} initial="hidden" animate="show">
        <Card>
          <h3>Account</h3>
          <p className="card-desc">Update the name and email attached to your PULSE account.</p>
          <form className="form" onSubmit={saveAccount}>
            <label>Name<input value={account.name} onChange={e => setAccount({ ...account, name: e.target.value })} required /></label>
            <label>Email<input type="email" value={account.email} onChange={e => setAccount({ ...account, email: e.target.value })} required /></label>
            <Btn variant="primary" disabled={saving === 'account'}>{saving === 'account' ? 'Saving…' : 'Save changes'}</Btn>
          </form>
        </Card>

        <Card>
          <h3>Notifications</h3>
          <p className="card-desc">Choose which emails PULSE sends you.</p>
          {n && <>
            <Toggle
              label="Email alerts"
              description="Get notified when a monitor goes down or recovers."
              on={n.emailAlerts}
              disabled={saving === 'notifications'}
              set={v => saveNotification({ emailAlerts: v })}
            />
            <Toggle
              label="Weekly digest"
              description="Receive a weekly uptime and incident summary."
              on={n.weeklyDigest}
              disabled={saving === 'notifications'}
              set={v => saveNotification({ weeklyDigest: v })}
            />
            {!n.emailConfigured && (
              <p className="muted small settings-note">
                SMTP isn't configured on the server, so emails are skipped. Add SMTP environment variables in the Render backend service to enable delivery.
              </p>
            )}
          </>}
          <div className="settings-history">
            <div className="settings-row-label">Recent notifications</div>
            {!items.length && <p className="muted small">No notification history yet.</p>}
            {items.slice(0, 8).map(item => (
              <div key={item.id} className="settings-history-item">
                <span>{item.subject}</span>
                <span className="muted small">{item.status} · {new Date(String(item.created_at).replace(' ', 'T') + 'Z').toLocaleString()}</span>
              </div>
            ))}
            <button type="button" className="btn ghost small-btn" onClick={() => { reloadNotif(); reloadHistory(); }}>
              Refresh history
            </button>
          </div>
        </Card>

        <Card>
          <h3>Password</h3>
          <p className="card-desc">Use at least 8 characters for your new password.</p>
          <form className="form" onSubmit={changePassword}>
            <label>Current password<input type="password" autoComplete="current-password" value={passwords.currentPassword} onChange={e => setPasswords({ ...passwords, currentPassword: e.target.value })} required /></label>
            <label>New password<input type="password" autoComplete="new-password" minLength={8} value={passwords.newPassword} onChange={e => setPasswords({ ...passwords, newPassword: e.target.value })} required /></label>
            <Btn variant="primary" disabled={saving === 'password'}>{saving === 'password' ? 'Updating…' : 'Change password'}</Btn>
          </form>
        </Card>

        <Card>
          <h3>Appearance</h3>
          <p className="card-desc">Control how much monitor information is shown per screen.</p>
          <Toggle
            label="Compact monitor cards"
            description="Use denser monitor rows on the Monitors page."
            on={compact}
            set={setCompact}
          />
        </Card>

        <Card className="danger-card">
          <h3>Delete account</h3>
          <p className="card-desc">Permanently removes your account, monitors, checks, incidents and notification history.</p>
          <Btn variant="ghost" disabled={saving === 'delete'} onClick={deleteAccount}>
            {saving === 'delete' ? 'Deleting…' : 'Delete my account'}
          </Btn>
        </Card>
      </motion.div>
    </>
  );
}
