import React, { useState } from "react";
import { health, runUrlencoded, runMultipart, API_BASE, getArtifacts } from "../services/backend";

export default function BackendDemo() {
  async function testArtifacts(){
    setOut("Leyendo /artifacts/"+slug+" …");
    try {
      const data = await getArtifacts(slug);
      setOut(JSON.stringify(data, null, 2));
    } catch(e){
      // Mostrar texto del error y status si viene del fetch
      setOut("ERROR /artifacts: " + (e?.message ?? e));
    }
  }
  const [slug, setSlug] = useState("demo-slug");
  const [file, setFile] = useState<File | undefined>(undefined);
  const [out, setOut] = useState<string>("");

  async function testHealth() {
    setOut("Probando /health…");
    try {
      const data = await health();
      setOut(JSON.stringify(data, null, 2));
    } catch (e: any) {
      setOut(`ERROR /health: ${e?.message || e}`);
    }
  }

  async function testUrlencoded() {
    setOut("Probando /run (urlencoded) …");
    try {
      const data = await runUrlencoded(slug, "urlencoded");
      setOut(JSON.stringify(data, null, 2));
    } catch (e: any) {
      setOut(`ERROR /run urlencoded: ${e?.message || e}`);
    }
  }

  async function testMultipart() {
    setOut("Probando /run (multipart) …");
    try {
      const data = await runMultipart(slug, file);
      setOut(JSON.stringify(data, null, 2));
    } catch (e: any) {
      setOut(`ERROR /run multipart: ${e?.message || e}`);
    }
  }

  return (
    <div style={{padding:"1rem", border:"1px solid #ddd", borderRadius:12, margin:"1rem 0"}}>
      <h2 style={{marginTop:0}}>Backend Demo</h2>

      <div style={{display:"grid", gap:8, maxWidth:480}}>
        <label>
          <button onClick={testArtifacts}>GET /artifacts/&lt;slug&gt;</button>
          <div>slug</div>
          <input value={slug} onChange={e=>setSlug(e.target.value)} style={{width:"100%"}} />
        </label>

        <label>
          <div>Archivo (opcional)</div>
          <input type="file" onChange={e=>setFile(e.target.files?.[0])}/>
        </label>

        <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
          <button onClick={testHealth}>GET /health</button>
          <button onClick={testUrlencoded}>POST /run (urlencoded)</button>
          <button onClick={testMultipart}>POST /run (multipart)</button>
        </div>
      </div>

      <pre style={{background:"#f6f8fa", padding:12, marginTop:12, whiteSpace:"pre-wrap"}}>
{out}
      </pre>
    </div>
  );
}
