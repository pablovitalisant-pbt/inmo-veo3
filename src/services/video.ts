const BASE = (import.meta as any).env?.VITE_API_BASE || (window as any).VITE_API_BASE || '';

export async function getSignedResultUrl(slug: string): Promise<string> {
  const r = await fetch(`${BASE.replace(/\/+$/,'')}/artifacts/${slug}/result_url`);
  if (!r.ok) throw new Error(`signed url error: ${r.status}`);
  const j = await r.json();
  return j.url as string;
}
