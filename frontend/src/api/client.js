const BASE = '/api';

/** API call */
async function request(method, path, body, signal) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    signal,
    headers: body != null ? { 'Content-Type': 'application/json' } : undefined,
    body:    body != null ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = Object.assign(new Error(data.error ?? res.statusText), {
      status: res.status,
      data,
    });
    throw err;
  }
  return data;
}

export const api = {
  getBuild:        (buildNumber, signal)           => request('GET',   `/builds/${buildNumber}`, null, signal),
  createSession:   (body, signal)                  => request('POST',  '/sessions', body, signal),
  getActiveSession:(loginId, signal)               => request('GET',   `/sessions/active/${encodeURIComponent(loginId)}`, null, signal),
  pause:           (sessionId)                     => request('PATCH', `/sessions/${sessionId}/pause`),
  resume:          (sessionId)                     => request('PATCH', `/sessions/${sessionId}/resume`),
  updateDefects:   (sessionId, defects)            => request('PATCH', `/sessions/${sessionId}/defects`, { defects }),
  logPopup:        (sessionId, action)             => request('POST',  `/sessions/${sessionId}/popup`,  { action }),
  submit:          (sessionId, body)               => request('POST',  `/sessions/${sessionId}/submit`, body),
};
