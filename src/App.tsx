
// === Botón y modal de reproducción (pegar cerca del return principal donde tienes el status header) ===
// Usa donde quieras:
// <button onClick={onPlay} ...>Ver video</button>
async function onPlay() {
  if (!result?.slug) return;
  try {
    const url = await getSignedResultUrl(result.slug);
    setPlayerUrl(url);
    setShowPlayer(true);
  } catch (e:any) {
    console.error(e);
    alert("No se pudo obtener la URL del video");
  }
}

// Dentro del JSX principal (al final, antes de cerrar el contenedor):
// Modal simple
{/* Video Modal */}
{showPlayer && playerUrl && (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
    <div className="bg-gray-900 rounded-2xl w-[90vw] max-w-4xl overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <div className="text-sm text-gray-300">Preview de video</div>
        <button onClick={()=>setShowPlayer(false)} className="text-white/60 hover:text-white">✕</button>
      </div>
      <video src={playerUrl} controls autoPlay className="w-full h-[60vh] bg-black"></video>
      <div className="p-3 text-right">
        <a target="_blank" href={playerUrl} className="text-brand-primary text-sm underline">Abrir en nueva pestaña</a>
      </div>
    </div>
  </div>
)}
