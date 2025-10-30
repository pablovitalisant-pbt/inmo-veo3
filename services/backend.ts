/**
 * Minimal Backend Client for inmo-veo3
 * Usage:
 *   import { health, runUrlencoded, runMultipart } from '@/services/backend';
 */

export const API_BASE =
  (import.meta as any)?.env?.VITE_API_BASE ||
  (typeof process !== 'undefined' ? process.env.VITE_API_BASE : undefined) ||
  'https://inmo-veo3-859994227667.us-central1.run.app';

function url(path: string) {
  return `${API_BASE.replace(/\/+$/,'')}${path.startsWith('/') ? '' : '/'}${path}`;
}

export async function health() {
  const r = await fetch(url('/health'));
  if (!r.ok) throw new Error(`Health failed: ${r.status}`);
  return r.json();
}

export async function runUrlencoded(slug: string, mode: 'urlencoded'|'multipart'='urlencoded') {
  const body = new URLSearchParams({ slug, mode });
  const r = await fetch(url('/run'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  if (!r.ok) throw new Error(`runUrlencoded failed: ${r.status}`);
  return r.json();
}

export async function runMultipart(slug: string, file?: File) {
  const fd = new FormData();
  fd.append('slug', slug);
  fd.append('mode', 'multipart');
  if (file) fd.append('file', file, file.name);
  const r = await fetch(url('/run'), {
    method: 'POST',
    body: fd
  });
  if (!r.ok) throw new Error(`runMultipart failed: ${r.status}`);
  return r.json();
}
export async function getArtifacts(slug: string) {
  const r = await fetch(url(`/artifacts/${encodeURIComponent(slug)}`));
  if (!r.ok) throw new Error(`getArtifacts failed: ${r.status}`);
  return r.json();
}
