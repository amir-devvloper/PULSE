async function load() {
    const [activeList, resolvedList] = document.querySelectorAll('.incident-list');
    try {
        const { incidents } = await api('/incidents');
        const fill = (box, items, empty) => {
            box.replaceChildren();
            if (!items.length) box.append(el('p', '', empty));
            items.forEach(i => box.append(incidentCard(i)));
        };
        fill(activeList, incidents.filter(i => i.status === 'ongoing'), 'No active incidents.');
        fill(resolvedList, incidents.filter(i => i.status !== 'ongoing'), 'No resolved incidents yet.');
    } catch (e) {
        if (e.message === 'Unauthorized') return;
        showError(activeList, 'Could not load incidents.');
        resolvedList.replaceChildren();
    }
}
load();
setInterval(load, 30000);
