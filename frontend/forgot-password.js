const form = document.getElementById('forgot-form');
const box = document.getElementById('form-error');

function say(text, isError) {
    box.textContent = text;
    box.style.color = isError ? '' : 'var(--success)';
    box.style.background = isError ? '' : 'var(--success-soft)';
    box.style.borderColor = isError ? '' : 'transparent';
    box.classList.add('is-visible');
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    box.classList.remove('is-visible');
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;

    try {
        const res = await fetch('/api/auth/forgot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: form.email.value })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            say(data.error || 'Something went wrong. Try again.', true);
            btn.disabled = false;
            return;
        }
        say(data.message, false);
    } catch {
        say('Could not reach the server. Try again.', true);
        btn.disabled = false;
    }
});
