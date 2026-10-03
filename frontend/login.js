const form = document.getElementById('login-form');
const errorEl = document.getElementById('form-error');

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.classList.remove('is-visible');

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                email: form.email.value,
                password: form.password.value
            })
        });

        const data = await res.json();

        if (!res.ok) {
            errorEl.textContent = data.error || 'Something went wrong. Try again.';
            errorEl.classList.add('is-visible');
            submitBtn.disabled = false;
            return;
        }

        window.location.href = 'dashboard.html';
    } catch {
        errorEl.textContent = 'Could not reach the server. Try again.';
        errorEl.classList.add('is-visible');
        submitBtn.disabled = false;
    }
});
