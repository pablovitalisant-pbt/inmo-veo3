import RunForm from "./components/RunForm";
import React from "react";
import BackendDemo from "./components/BackendDemo";
import { API_BASE } from "./services/backend";

export default function App() {
  return (
    <>
      <h1>inmo-veo3</h1>
      <p style={{ margin:"4px 0 12px 0", color:"#9ca3af" }}>API_BASE: {API_BASE}</p>
      <p style={{ margin:"4px 0 12px 0", color:"#9ca3af" }}>API_BASE: {API_BASE}</p>
      {/* Demo temporal para probar backend */}
      <BackendDemo />
      <RunForm />
    </>
  );
}
