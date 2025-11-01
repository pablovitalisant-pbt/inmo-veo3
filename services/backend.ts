export const API_BASE =
  (import.meta as any)?.env?.VITE_API_BASE ??
  (typeof process !== 'undefined' ? (process as any).env?.VITE_API_BASE : undefined) ??
  'https://inmo-veo3-y25yqmaa3a-uc.a.run.app';

const toUrl = (path: string) => {
  const base = API_BASE.replace(/\/+$/, '');
  const p = path.startsWith('/') ? path : '/' + path;
  return `${base}${p}`;
};

export async function health() {
  const res = await fetch(toUrl('/health'));
  return res.json();
}

export async function runUrlencoded(notes?: string) {
  const params = new URLSearchParams();
  if (notes) params.set('notes', notes);
  const res = await fetch(toUrl('/run'), {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  if (!res.ok) throw new Error(`runUrlencoded failed: ${res.status}`);
  return res.json();
}

/** Envia job con payload JSON (se guarda en manifest.notes del backend) */
export async function submitJob(payload: unknown) {
  const notes = JSON.stringify(payload);
  return runUrlencoded(notes);
}

export async function getArtifacts(slug?: string) {
  const url = slug ? toUrl(`/artifacts/${encodeURIComponent(slug)}`) : toUrl('/artifacts');
  const res = await fetch(url);
  if (!res.ok) throw new Error(`getArtifacts failed: ${res.status}`);
  return res.json();
}

