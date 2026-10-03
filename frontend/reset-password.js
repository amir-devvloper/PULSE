const form = document.getElementById('reset-form');
const box = document.getElementById('form-error');
const token = new URLSearchParams(window.location.search).get('token');

function say(text, isError) {
    box.textContent = text;
    box.style.color = isError ? '' : 'var(--success)';
    box.style.background = isError ? '' : 'var(--success-soft)';
    box.style.borderColor = isError ? '' : 'transparent';
    box.classList.add('is-visible');
}

if (!token) {
    say('This reset link is incomplete. Request a new one.', true);
    form.querySelector('button[type="submit"]').disabled = true;
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    box.classList.remove('is-visible');
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;

    try {
        const res = await fetch('/api/auth/reset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, password: form.password.value })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            say(data.error || 'Something went wrong. Try again.', true);
            btn.disabled = false;
            return;
        }
        say(data.message, false);
        setTimeout(() => { window.location.href = 'login.html'; }, 1500);
    } catch {
        say('Could not reach the server. Try again.', true);
        btn.disabled = false;
    }
});
