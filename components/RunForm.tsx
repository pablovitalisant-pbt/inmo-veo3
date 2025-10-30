import React, { useState } from "react";
import { API_BASE, runUrlencoded, runMultipart, getArtifacts } from "../services/backend";

export default function RunForm() {
  const [slug, setSlug] = useState("job-001");
  const [file, setFile] = useState<File | undefined>();
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setOut("Ejecutando /run…");
    try {
      const ran = file
        ? await runMultipart(slug, file)
        : await runUrlencoded(slug, "urlencoded");

      // Poll a /artifacts/<slug> hasta 45s
      const deadline = Date.now() + 45_000;
      let lastErr: any = null;
      while (Date.now() < deadline) {
        try {
          const data = await getArtifacts(slug);
          setOut(JSON.stringify({ ran, artifacts: data }, null, 2));
          setBusy(false);
          return;
        } catch (e: any) {
          lastErr = e;
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
      throw new Error(`Timeout esperando artifacts: ${lastErr?.message || lastErr}`);
    } catch (e: any) {
      setOut(`ERROR: ${e?.message || e}`);
      setBusy(false);
    }
  }

  return (
    <div style={{ padding: "1rem", border: "1px solid #334155", borderRadius: 12, marginTop: 16 }}>
      <h2 style={{ marginTop: 0 }}>RunForm (producción)</h2>
      <p style={{ margin: "4px 0 12px 0", color: "#9ca3af" }}>API_BASE: {API_BASE}</p>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 8, maxWidth: 520 }}>
        <label>
          <div>slug</div>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            style={{ width: "100%" }}
            disabled={busy}
          />
        </label>

        <label>
          <div>Archivo (opcional)</div>
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0])}
            disabled={busy}
          />
        </label>

        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit" disabled={busy}>
            {busy ? "Procesando…" : "Run + Fetch"}
          </button>
          <button type="button" onClick={() => setOut("")} disabled={busy}>
            Limpiar
          </button>
        </div>
      </form>

      <pre style={{ background: "#0b1220", color: "#e2e8f0", padding: 12, marginTop: 12, whiteSpace: "pre-wrap" }}>
{out}
      </pre>
    </div>
  );
}
