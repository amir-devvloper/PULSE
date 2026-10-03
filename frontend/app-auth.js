if (localStorage.getItem('pulse.compact') === '1') document.body.classList.add('compact');

document.getElementById('logout-btn')?.addEventListener('click', async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = 'index.html';
});
