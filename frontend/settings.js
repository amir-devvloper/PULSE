const nameInput = document.getElementById('settingsName');
const emailInput = document.getElementById('settingsEmail');
const msg = document.getElementById('settings-msg');
const saveBtn = document.getElementById('save-account');
const compact = document.getElementById('compact-toggle');
const alertsToggle = document.getElementById('alerts-toggle');
const digestToggle = document.getElementById('digest-toggle');
const notifMsg = document.getElementById('notif-msg');
const notifDesc = document.getElementById('notif-desc');
const notifHistory = document.getElementById('notif-history');

compact.checked = localStorage.getItem('pulse.compact') === '1';
compact.addEventListener('change', () => {
    localStorage.setItem('pulse.compact', compact.checked ? '1' : '0');
    document.body.classList.toggle('compact', compact.checked);
});

function say(box, text, isError) {
    box.textContent = text;
    box.style.color = isError ? '' : 'var(--success)';
    box.style.background = isError ? '' : 'var(--success-soft)';
    box.style.borderColor = isError ? '' : 'transparent';
    box.classList.add('is-visible');
}

// ---------- account ----------

api('/auth/me').then(({ user }) => {
    nameInput.value = user.name;
    emailInput.value = user.email;
}).catch(() => {});

saveBtn.addEventListener('click', async () => {
    msg.classList.remove('is-visible');
    saveBtn.disabled = true;
    try {
        const { user } = await api('/auth/me', {
            method: 'PUT',
            body: { name: nameInput.value, email: emailInput.value }
        });
        nameInput.value = user.name;
        emailInput.value = user.email;
        say(msg, 'Saved.', false);
    } catch (e) {
        if (e.message !== 'Unauthorized') say(msg, e.message, true);
    } finally {
        saveBtn.disabled = false;
    }
});

// ---------- notifications ----------

function renderHistory(items) {
    if (!items.length) { notifHistory.replaceChildren(); return; }
    const wrap = el('div', 'notif-list');
    wrap.append(el('div', 'settings-row-label', 'Recent emails'));
    for (const n of items.slice(0, 8)) {
        const row = el('div', 'settings-row-desc', `${fmtTime(n.created_at)} — ${n.subject} (${n.status})`);
        if (n.error_message && n.status !== 'sent') row.title = n.error_message;
        wrap.append(row);
    }
    notifHistory.replaceChildren(wrap);
}

async function loadNotifications() {
    try {
        const [{ settings }, { notifications }] = await Promise.all([
            api('/notifications/settings'),
            api('/notifications')
        ]);
        alertsToggle.checked = settings.emailAlerts;
        digestToggle.checked = settings.weeklyDigest;
        if (!settings.emailConfigured) {
            notifDesc.textContent = 'Email sending is not set up on this server yet (SMTP_HOST is missing), so alerts are only logged below.';
        }
        renderHistory(notifications);
    } catch (e) {
        if (e.message !== 'Unauthorized') say(notifMsg, e.message, true);
    }
}

async function saveNotification(toggle, key) {
    notifMsg.classList.remove('is-visible');
    toggle.disabled = true;
    try {
        await api('/notifications/settings', { method: 'PUT', body: { [key]: toggle.checked } });
        say(notifMsg, 'Saved.', false);
    } catch (e) {
        toggle.checked = !toggle.checked;
        if (e.message !== 'Unauthorized') say(notifMsg, e.message, true);
    } finally {
        toggle.disabled = false;
    }
}

alertsToggle.addEventListener('change', () => saveNotification(alertsToggle, 'emailAlerts'));
digestToggle.addEventListener('change', () => saveNotification(digestToggle, 'weeklyDigest'));
loadNotifications();

// ---------- password ----------

const currentPw = document.getElementById('currentPassword');
const newPw = document.getElementById('newPassword');
const pwMsg = document.getElementById('password-msg');
const pwBtn = document.getElementById('save-password');

pwBtn.addEventListener('click', async () => {
    pwMsg.classList.remove('is-visible');
    pwBtn.disabled = true;
    try {
        await api('/auth/password', {
            method: 'PUT',
            body: { currentPassword: currentPw.value, newPassword: newPw.value }
        });
        currentPw.value = '';
        newPw.value = '';
        say(pwMsg, 'Password updated.', false);
    } catch (e) {
        if (e.message !== 'Unauthorized') say(pwMsg, e.message, true);
    } finally {
        pwBtn.disabled = false;
    }
});

// ---------- delete account ----------

const delPw = document.getElementById('deletePassword');
const delMsg = document.getElementById('delete-msg');
const delBtn = document.getElementById('delete-account');

delBtn.addEventListener('click', async () => {
    delMsg.classList.remove('is-visible');
    if (!delPw.value) { say(delMsg, 'Enter your password to confirm.', true); return; }
    if (!await PulseFX.confirm('Delete your account and all of its data? This cannot be undone.', { confirmText: 'Delete account' })) return;
    delBtn.disabled = true;
    try {
        await api('/auth/me', { method: 'DELETE', body: { password: delPw.value } });
        window.location.href = 'index.html';
    } catch (e) {
        delBtn.disabled = false;
        if (e.message !== 'Unauthorized') say(delMsg, e.message, true);
    }
});
