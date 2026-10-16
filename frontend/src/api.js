const base = '/api';

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(base + path, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
  } catch {
    // fetch() selbst wirft nur bei Netzwerkausfall (Pi nicht erreichbar, offline) —
    // die native TypeError-Meldung ist Englisch und würde die sonst komplett
    // deutsche UI durchbrechen.
    throw new Error('Server nicht erreichbar. Bist du mit dem Pi verbunden?');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Anfrage fehlgeschlagen (${res.status})`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  getProjects: () => request('/projects'),
  createProject: (name) => request('/projects', { method: 'POST', body: JSON.stringify({ name }) }),
  setProjectStatus: (id, status) =>
    request(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  setProjectArchived: (id, archived) =>
    request(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify({ archived }) }),
  deleteProject: (id) => request(`/projects/${id}`, { method: 'DELETE' }),
  getProject: (id) => request(`/projects/${id}`),
  getStats: (period, offset = 0) => request(`/stats?period=${period}&offset=${offset}`),
  setDayPlan: (projectId, data) =>
    request(`/projects/${projectId}/day-plan`, { method: 'POST', body: JSON.stringify(data) }),
  setDayPlanCompleted: (projectId, completed) =>
    request(`/projects/${projectId}/day-plan`, { method: 'PATCH', body: JSON.stringify({ completed }) }),
  startSession: (data) => request('/sessions', { method: 'POST', body: JSON.stringify(data) }),
  finishSession: (id, data) =>
    request(`/sessions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteSession: (id) => request(`/sessions/${id}`, { method: 'DELETE' })
};
