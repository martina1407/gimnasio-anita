import { useState, useEffect, useMemo } from "react";

const DIAS_GRACIA = 10;

const alumnasSeed = [
  { id: 1, nombre: "Martina Araudo", dni: "41899257", horario: "Lun/Mié/Vie 06:00", pagos: [{ fecha: "2026-05-05", monto: 0, tipo: "transferencia" }] },
  { id: 2, nombre: "Claudia Pombo", dni: "18622108", horario: "Lun/Mié/Vie 06:00", pagos: [{ fecha: "2026-05-05", monto: 0, tipo: "transferencia" }] },
];

function calcularEstado(alumna, hoy) {
  if (!alumna.pagos || alumna.pagos.length === 0) return "deuda";
  const ultimo = alumna.pagos.slice().sort((a, b) => new Date(b.fecha) - new Date(a.fecha))[0];
  const fechaPago = new Date(ultimo.fecha);
  const mesHoy = hoy.getMonth();
  const anioHoy = hoy.getFullYear();
  if (fechaPago.getMonth() === mesHoy && fechaPago.getFullYear() === anioHoy) return "pagado";
  const mesAnterior = new Date(anioHoy, mesHoy - 1, 1);
  if (fechaPago.getMonth() === mesAnterior.getMonth() && fechaPago.getFullYear() === mesAnterior.getFullYear()) {
    const diasTranscurridos = Math.floor((hoy - new Date(anioHoy, mesHoy, 1)) / 86400000);
    if (diasTranscurridos <= DIAS_GRACIA) return "gracia";
    return "deuda";
  }
  return "deuda";
}

const ESTADO_CONFIG = {
  pagado: { label: "Al día", color: "#22c55e", bg: "#052e16", icon: "✓" },
  gracia: { label: "Período de gracia", color: "#f59e0b", bg: "#1c1003", icon: "⏳" },
  deuda: { label: "Adeuda", color: "#ef4444", bg: "#2d0808", icon: "✗" },
};

export default function App() {
  const [alumnas, setAlumnas] = useState(() => {
    try {
      const saved = localStorage.getItem("gimnasio-alumnas");
      return saved ? JSON.parse(saved) : alumnasSeed;
    } catch { return alumnasSeed; }
  });
  const [vista, setVista] = useState("inicio"); // inicio | lista | acceso | pago | nueva | detalle
  const [busqueda, setBusqueda] = useState("");
  const [alumnaSeleccionada, setAlumnaSeleccionada] = useState(null);
  const [modalPago, setModalPago] = useState(false);
  const [modalNueva, setModalNueva] = useState(false);
  const [accesoBusqueda, setAccesoBusqueda] = useState("");
  const [accesoResultado, setAccesoResultado] = useState(null);
  const [formPago, setFormPago] = useState({ monto: "", tipo: "transferencia", recargo: false, fecha: new Date().toISOString().split("T")[0] });
  const [formNueva, setFormNueva] = useState({ nombre: "", dni: "", horario: "" });
  const [toast, setToast] = useState(null);

  const hoy = new Date();

  useEffect(() => {
    try { localStorage.setItem("gimnasio-alumnas", JSON.stringify(alumnas)); } catch {}
  }, [alumnas]);

  const alumnasFiltradas = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    if (!q) return alumnas;
    return alumnas.filter(a =>
      a.nombre.toLowerCase().includes(q) || a.dni.includes(q)
    );
  }, [alumnas, busqueda]);

  const estadisticas = useMemo(() => {
    const total = alumnas.length;
    const pagadas = alumnas.filter(a => calcularEstado(a, hoy) === "pagado").length;
    const gracia = alumnas.filter(a => calcularEstado(a, hoy) === "gracia").length;
    const deben = alumnas.filter(a => calcularEstado(a, hoy) === "deuda").length;
    return { total, pagadas, gracia, deben };
  }, [alumnas]);

  function mostrarToast(msg, tipo = "ok") {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 3000);
  }

  function registrarPago(alumnaId) {
    const hoyStr = formPago.fecha;
    const dia = parseInt(hoyStr.split("-")[2]);
    const conRecargo = dia > DIAS_GRACIA;
    setAlumnas(prev => prev.map(a => {
      if (a.id !== alumnaId) return a;
      return {
        ...a,
        pagos: [...(a.pagos || []), {
          fecha: hoyStr,
          monto: parseFloat(formPago.monto),
          tipo: formPago.tipo,
          recargo: conRecargo,
        }]
      };
    }));
    setModalPago(false);
    setFormPago({ monto: "", tipo: "transferencia", recargo: false, fecha: new Date().toISOString().split("T")[0] });
    mostrarToast("Pago registrado correctamente ✓");
    if (alumnaSeleccionada) {
      setAlumnaSeleccionada(prev => ({
        ...prev,
        pagos: [...(prev.pagos || []), { fecha: hoyStr, monto: parseFloat(formPago.monto), tipo: formPago.tipo, recargo: conRecargo }]
      }));
    }
  }

  function agregarAlumna() {
    if (!formNueva.nombre.trim() || !formNueva.dni.trim()) return;
    const nueva = {
      id: Date.now(),
      nombre: formNueva.nombre.trim(),
      dni: formNueva.dni.trim(),
      horario: formNueva.horario.trim(),
      pagos: [],
    };
    setAlumnas(prev => [...prev, nueva]);
    setModalNueva(false);
    setFormNueva({ nombre: "", dni: "", horario: "" });
    mostrarToast("Alumna agregada ✓");
  }

  function buscarAcceso() {
    const q = accesoBusqueda.trim().toLowerCase();
    if (!q) return;
    const encontrada = alumnas.find(a =>
      a.dni === q || a.nombre.toLowerCase().includes(q)
    );
    if (encontrada) {
      const estado = calcularEstado(encontrada, hoy);
      setAccesoResultado({ alumna: encontrada, estado });
    } else {
      setAccesoResultado({ alumna: null });
    }
  }

  function resetAcceso() {
    setAccesoBusqueda("");
    setAccesoResultado(null);
  }

  const mesNombre = hoy.toLocaleDateString("es-AR", { month: "long", year: "numeric" });

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0f",
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      color: "#e8e8f0",
      maxWidth: 480,
      margin: "0 auto",
      position: "relative",
      paddingBottom: 80,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Space+Grotesk:wght@600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input, select, button { font-family: inherit; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }
        .tap { cursor: pointer; transition: opacity 0.15s, transform 0.1s; -webkit-tap-highlight-color: transparent; }
        .tap:active { opacity: 0.7; transform: scale(0.97); }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pulseGreen { 0%,100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.4); } 50% { box-shadow: 0 0 0 12px rgba(34,197,94,0); } }
        @keyframes pulseRed { 0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); } 50% { box-shadow: 0 0 0 12px rgba(239,68,68,0); } }
        .slide-up { animation: slideUp 0.3s ease; }
        .fade-in { animation: fadeIn 0.2s ease; }
      `}</style>

      {/* TOAST */}
      {toast && (
        <div style={{
          position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)",
          background: toast.tipo === "ok" ? "#14532d" : "#7f1d1d",
          color: "#fff", padding: "10px 20px", borderRadius: 12,
          fontSize: 14, zIndex: 1000, animation: "slideUp 0.3s ease",
          boxShadow: "0 4px 20px rgba(0,0,0,0.5)", whiteSpace: "nowrap",
        }}>{toast.msg}</div>
      )}

      {/* MODAL PAGO */}
      {modalPago && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
          display: "flex", alignItems: "flex-end", zIndex: 900,
        }} onClick={() => setModalPago(false)}>
          <div style={{
            background: "#16161f", width: "100%", maxWidth: 480, margin: "0 auto",
            borderRadius: "20px 20px 0 0", padding: "28px 24px 40px",
            animation: "slideUp 0.3s ease",
          }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 36, height: 4, background: "#333", borderRadius: 2, margin: "0 auto 24px" }} />
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, fontFamily: "'Space Grotesk'" }}>
              Registrar pago
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Monto ($)</div>
              <input
                type="number"
                placeholder="18000"
                value={formPago.monto}
                onChange={e => setFormPago(p => ({ ...p, monto: e.target.value }))}
                style={{
                  width: "100%", background: "#1e1e2a", border: "1px solid #2a2a3a",
                  borderRadius: 10, padding: "12px 14px", color: "#fff", fontSize: 16,
                }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Fecha</div>
              <input
                type="date"
                value={formPago.fecha}
                onChange={e => setFormPago(p => ({ ...p, fecha: e.target.value }))}
                style={{
                  width: "100%", background: "#1e1e2a", border: "1px solid #2a2a3a",
                  borderRadius: 10, padding: "12px 14px", color: "#fff", fontSize: 16,
                }}
              />
              {parseInt(formPago.fecha.split("-")[2]) > DIAS_GRACIA && (
                <div style={{ marginTop: 6, fontSize: 12, color: "#f59e0b" }}>
                  ⚠️ Pago después del día 10 — se aplica recargo
                </div>
              )}
            </div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Forma de pago</div>
              <div style={{ display: "flex", gap: 8 }}>
                {["transferencia", "efectivo"].map(t => (
                  <button key={t} onClick={() => setFormPago(p => ({ ...p, tipo: t }))}
                    style={{
                      flex: 1, padding: "10px", borderRadius: 10, border: "1px solid",
                      borderColor: formPago.tipo === t ? "#818cf8" : "#2a2a3a",
                      background: formPago.tipo === t ? "#1e1b4b" : "#1e1e2a",
                      color: formPago.tipo === t ? "#818cf8" : "#888",
                      fontSize: 14, fontWeight: 500, cursor: "pointer",
                    }}>{t === "transferencia" ? "💳 Transferencia" : "💵 Efectivo"}</button>
                ))}
              </div>
            </div>
            <button
              onClick={() => alumnaSeleccionada && registrarPago(alumnaSeleccionada.id)}
              disabled={!formPago.monto}
              className="tap"
              style={{
                width: "100%", padding: "14px", borderRadius: 12, border: "none",
                background: formPago.monto ? "#4f46e5" : "#2a2a3a",
                color: formPago.monto ? "#fff" : "#555", fontSize: 16, fontWeight: 600,
                cursor: formPago.monto ? "pointer" : "default",
              }}
            >Confirmar pago</button>
          </div>
        </div>
      )}

      {/* MODAL NUEVA ALUMNA */}
      {modalNueva && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
          display: "flex", alignItems: "flex-end", zIndex: 900,
        }} onClick={() => setModalNueva(false)}>
          <div style={{
            background: "#16161f", width: "100%", maxWidth: 480, margin: "0 auto",
            borderRadius: "20px 20px 0 0", padding: "28px 24px 40px",
            animation: "slideUp 0.3s ease",
          }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 36, height: 4, background: "#333", borderRadius: 2, margin: "0 auto 24px" }} />
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, fontFamily: "'Space Grotesk'" }}>
              Nueva alumna
            </div>
            {[
              { label: "Nombre completo", key: "nombre", placeholder: "Ej: Valentina Romero", type: "text" },
              { label: "DNI", key: "dni", placeholder: "Ej: 38201456", type: "number" },
              { label: "Horario asignado", key: "horario", placeholder: "Ej: Lun/Mié/Vie 8:00", type: "text" },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: "#888", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>{f.label}</div>
                <input
                  type={f.type}
                  placeholder={f.placeholder}
                  value={formNueva[f.key]}
                  onChange={e => setFormNueva(p => ({ ...p, [f.key]: e.target.value }))}
                  style={{
                    width: "100%", background: "#1e1e2a", border: "1px solid #2a2a3a",
                    borderRadius: 10, padding: "12px 14px", color: "#fff", fontSize: 15,
                  }}
                />
              </div>
            ))}
            <button
              onClick={agregarAlumna}
              disabled={!formNueva.nombre || !formNueva.dni}
              className="tap"
              style={{
                width: "100%", padding: "14px", borderRadius: 12, border: "none",
                background: formNueva.nombre && formNueva.dni ? "#4f46e5" : "#2a2a3a",
                color: formNueva.nombre && formNueva.dni ? "#fff" : "#555",
                fontSize: 16, fontWeight: 600, marginTop: 8, cursor: "pointer",
              }}
            >Agregar alumna</button>
          </div>
        </div>
      )}

      {/* ===== VISTA: INICIO ===== */}
      {vista === "inicio" && (
        <div className="slide-up" style={{ padding: "24px 20px" }}>
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 12, color: "#666", textTransform: "uppercase", letterSpacing: 2, marginBottom: 4 }}>
              {mesNombre}
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, fontFamily: "'Space Grotesk'", lineHeight: 1.2 }}>
              Hola, Anita 👋
            </div>
          </div>

          {/* Cards estadísticas */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
            <div style={{ background: "#14532d22", border: "1px solid #14532d", borderRadius: 14, padding: "16px 14px" }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: "#22c55e", fontFamily: "'Space Grotesk'" }}>{estadisticas.pagadas}</div>
              <div style={{ fontSize: 13, color: "#4ade80", marginTop: 2 }}>Al día</div>
            </div>
            <div style={{ background: "#7f1d1d22", border: "1px solid #7f1d1d", borderRadius: 14, padding: "16px 14px" }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: "#ef4444", fontFamily: "'Space Grotesk'" }}>{estadisticas.deben}</div>
              <div style={{ fontSize: 13, color: "#f87171", marginTop: 2 }}>Adeudan</div>
            </div>
            <div style={{ background: "#78350f22", border: "1px solid #78350f", borderRadius: 14, padding: "16px 14px" }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: "#f59e0b", fontFamily: "'Space Grotesk'" }}>{estadisticas.gracia}</div>
              <div style={{ fontSize: 13, color: "#fbbf24", marginTop: 2 }}>En gracia</div>
            </div>
            <div style={{ background: "#1e1e2a", border: "1px solid #2a2a3a", borderRadius: 14, padding: "16px 14px" }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: "#e8e8f0", fontFamily: "'Space Grotesk'" }}>{estadisticas.total}</div>
              <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>Total alumnas</div>
            </div>
          </div>

          {/* Acciones rápidas */}
          <div style={{ fontSize: 12, color: "#555", textTransform: "uppercase", letterSpacing: 2, marginBottom: 12 }}>Acciones</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button className="tap" onClick={() => setVista("acceso")}
              style={{
                background: "linear-gradient(135deg, #1e1b4b, #2e1b5b)",
                border: "1px solid #4f46e5", borderRadius: 14, padding: "18px 20px",
                color: "#fff", textAlign: "left", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 14,
              }}>
              <div style={{ fontSize: 28 }}>🚪</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>Control de acceso</div>
                <div style={{ fontSize: 13, color: "#818cf8", marginTop: 2 }}>Buscá una alumna al entrar al gimnasio</div>
              </div>
            </button>
            <button className="tap" onClick={() => setVista("lista")}
              style={{
                background: "#16161f", border: "1px solid #2a2a3a",
                borderRadius: 14, padding: "18px 20px", color: "#fff",
                textAlign: "left", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 14,
              }}>
              <div style={{ fontSize: 28 }}>📋</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>Lista completa</div>
                <div style={{ fontSize: 13, color: "#666", marginTop: 2 }}>Ver y gestionar todas las alumnas</div>
              </div>
            </button>
          </div>

          {/* Alumnas que deben — alert */}
          {estadisticas.deben > 0 && (
            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: 12, color: "#555", textTransform: "uppercase", letterSpacing: 2, marginBottom: 12 }}>Adeudando este mes</div>
              {alumnas.filter(a => calcularEstado(a, hoy) === "deuda").map(a => (
                <div key={a.id} className="tap" onClick={() => { setAlumnaSeleccionada(a); setVista("detalle"); }}
                  style={{
                    background: "#2d080822", border: "1px solid #7f1d1d55",
                    borderRadius: 12, padding: "12px 14px", marginBottom: 8,
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    cursor: "pointer",
                  }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{a.nombre}</div>
                    <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>{a.horario}</div>
                  </div>
                  <div style={{ color: "#ef4444", fontSize: 13, fontWeight: 600 }}>Ver →</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== VISTA: ACCESO ===== */}
      {vista === "acceso" && (
        <div className="slide-up" style={{ padding: "24px 20px" }}>
          <button className="tap" onClick={() => { setVista("inicio"); resetAcceso(); }}
            style={{ background: "none", border: "none", color: "#818cf8", fontSize: 15, cursor: "pointer", marginBottom: 20, padding: 0 }}>
            ← Volver
          </button>
          <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "'Space Grotesk'", marginBottom: 6 }}>
            Control de acceso 🚪
          </div>
          <div style={{ fontSize: 14, color: "#666", marginBottom: 24 }}>
            Ingresá el DNI o nombre de la alumna
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
            <input
              type="text"
              placeholder="DNI o nombre..."
              value={accesoBusqueda}
              onChange={e => setAccesoBusqueda(e.target.value)}
              onKeyDown={e => e.key === "Enter" && buscarAcceso()}
              autoFocus
              style={{
                flex: 1, background: "#1e1e2a", border: "1px solid #2a2a3a",
                borderRadius: 12, padding: "14px 16px", color: "#fff",
                fontSize: 16, outline: "none",
              }}
            />
            <button className="tap" onClick={buscarAcceso}
              style={{
                background: "#4f46e5", border: "none", borderRadius: 12,
                padding: "14px 20px", color: "#fff", fontSize: 15, fontWeight: 600,
                cursor: "pointer",
              }}>Buscar</button>
          </div>

          {accesoResultado && (
            <div className="fade-in">
              {!accesoResultado.alumna ? (
                <div style={{
                  background: "#1e1e2a", border: "1px solid #2a2a3a",
                  borderRadius: 16, padding: "24px", textAlign: "center",
                }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🤷</div>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>Alumna no encontrada</div>
                  <div style={{ fontSize: 13, color: "#666", marginTop: 6 }}>Verificá el DNI o nombre ingresado</div>
                </div>
              ) : (
                <div style={{
                  background: ESTADO_CONFIG[accesoResultado.estado].bg,
                  border: `2px solid ${ESTADO_CONFIG[accesoResultado.estado].color}`,
                  borderRadius: 20, padding: "28px 24px", textAlign: "center",
                  animation: accesoResultado.estado === "pagado" ? "pulseGreen 2s ease infinite" : accesoResultado.estado === "deuda" ? "pulseRed 2s ease infinite" : "none",
                }}>
                  <div style={{ fontSize: 56, marginBottom: 8 }}>
                    {accesoResultado.estado === "pagado" ? "✅" : accesoResultado.estado === "gracia" ? "⏳" : "🚫"}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Space Grotesk'", color: ESTADO_CONFIG[accesoResultado.estado].color, marginBottom: 6 }}>
                    {ESTADO_CONFIG[accesoResultado.estado].label.toUpperCase()}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>
                    {accesoResultado.alumna.nombre}
                  </div>
                  <div style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>
                    DNI {accesoResultado.alumna.dni} · {accesoResultado.alumna.horario}
                  </div>
                  {accesoResultado.estado === "deuda" && (
                    <button className="tap" onClick={() => {
                      setAlumnaSeleccionada(accesoResultado.alumna);
                      setModalPago(true);
                    }}
                      style={{
                        background: "#4f46e5", border: "none", borderRadius: 12,
                        padding: "12px 24px", color: "#fff", fontWeight: 600, fontSize: 15,
                        cursor: "pointer", marginBottom: 10, width: "100%",
                      }}>💳 Registrar pago ahora</button>
                  )}
                  <button className="tap" onClick={resetAcceso}
                    style={{
                      background: "transparent", border: "1px solid #2a2a3a",
                      borderRadius: 12, padding: "10px 24px", color: "#888",
                      fontSize: 14, cursor: "pointer", width: "100%",
                    }}>Buscar otra alumna</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ===== VISTA: LISTA ===== */}
      {vista === "lista" && (
        <div className="slide-up" style={{ padding: "24px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <button className="tap" onClick={() => setVista("inicio")}
                style={{ background: "none", border: "none", color: "#818cf8", fontSize: 15, cursor: "pointer", padding: 0, marginBottom: 8, display: "block" }}>
                ← Volver
              </button>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Space Grotesk'" }}>Alumnas</div>
            </div>
            <button className="tap" onClick={() => setModalNueva(true)}
              style={{
                background: "#4f46e5", border: "none", borderRadius: 10,
                padding: "8px 14px", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
              }}>+ Nueva</button>
          </div>

          <input
            type="text"
            placeholder="Buscar por nombre o DNI..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            style={{
              width: "100%", background: "#1e1e2a", border: "1px solid #2a2a3a",
              borderRadius: 12, padding: "12px 16px", color: "#fff",
              fontSize: 15, marginBottom: 16, outline: "none",
            }}
          />

          {/* Filtros rápidos */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
            {[
              { label: "Todas", filter: null },
              { label: "✓ Al día", filter: "pagado" },
              { label: "✗ Adeudan", filter: "deuda" },
              { label: "⏳ Gracia", filter: "gracia" },
            ].map(f => (
              <button key={f.label} className="tap"
                onClick={() => setBusqueda(f.filter ? "" : "")}
                style={{
                  whiteSpace: "nowrap", padding: "6px 14px",
                  borderRadius: 8, border: "1px solid #2a2a3a",
                  background: "#1e1e2a", color: "#888", fontSize: 13, cursor: "pointer",
                }}>{f.label}</button>
            ))}
          </div>

          <div>
            {alumnasFiltradas.map(a => {
              const estado = calcularEstado(a, hoy);
              const cfg = ESTADO_CONFIG[estado];
              return (
                <div key={a.id} className="tap"
                  onClick={() => { setAlumnaSeleccionada(a); setVista("detalle"); }}
                  style={{
                    background: "#16161f", border: "1px solid #1e1e2a",
                    borderLeft: `3px solid ${cfg.color}`,
                    borderRadius: 12, padding: "14px 16px", marginBottom: 8,
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    cursor: "pointer",
                  }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{a.nombre}</div>
                    <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>DNI {a.dni} · {a.horario}</div>
                  </div>
                  <div style={{
                    background: cfg.bg, color: cfg.color,
                    border: `1px solid ${cfg.color}44`,
                    borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 600,
                    whiteSpace: "nowrap", marginLeft: 10,
                  }}>{cfg.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== VISTA: DETALLE ALUMNA ===== */}
      {vista === "detalle" && alumnaSeleccionada && (() => {
        const a = alumnas.find(x => x.id === alumnaSeleccionada.id) || alumnaSeleccionada;
        const estado = calcularEstado(a, hoy);
        const cfg = ESTADO_CONFIG[estado];
        return (
          <div className="slide-up" style={{ padding: "24px 20px" }}>
            <button className="tap" onClick={() => setVista("lista")}
              style={{ background: "none", border: "none", color: "#818cf8", fontSize: 15, cursor: "pointer", marginBottom: 20, padding: 0 }}>
              ← Volver
            </button>

            <div style={{
              background: cfg.bg, border: `1px solid ${cfg.color}55`,
              borderRadius: 16, padding: "20px", marginBottom: 20,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Space Grotesk'" }}>{a.nombre}</div>
                  <div style={{ fontSize: 13, color: "#888", marginTop: 4 }}>DNI {a.dni}</div>
                  <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>🕐 {a.horario}</div>
                </div>
                <div style={{
                  background: cfg.color + "22", color: cfg.color,
                  border: `1px solid ${cfg.color}55`,
                  borderRadius: 10, padding: "6px 12px", fontSize: 13, fontWeight: 700,
                }}>{cfg.icon} {cfg.label}</div>
              </div>
            </div>

            <button className="tap"
              onClick={() => { setAlumnaSeleccionada(a); setModalPago(true); }}
              style={{
                width: "100%", background: "#4f46e5", border: "none",
                borderRadius: 12, padding: "14px", color: "#fff",
                fontSize: 16, fontWeight: 600, marginBottom: 20, cursor: "pointer",
              }}>💳 Registrar nuevo pago</button>

            <div style={{ fontSize: 12, color: "#555", textTransform: "uppercase", letterSpacing: 2, marginBottom: 12 }}>
              Historial de pagos
            </div>
            {(!a.pagos || a.pagos.length === 0) ? (
              <div style={{
                background: "#16161f", border: "1px solid #2a2a3a",
                borderRadius: 12, padding: "20px", textAlign: "center", color: "#555", fontSize: 14,
              }}>Sin pagos registrados</div>
            ) : (
              [...a.pagos].reverse().map((p, i) => (
                <div key={i} style={{
                  background: "#16161f", border: "1px solid #1e1e2a",
                  borderRadius: 12, padding: "14px 16px", marginBottom: 8,
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>
                      ${p.monto?.toLocaleString("es-AR")}
                    </div>
                    <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>
                      {new Date(p.fecha + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}
                      {" · "}{p.tipo === "transferencia" ? "💳" : "💵"} {p.tipo}
                    </div>
                  </div>
                  {p.recargo && (
                    <div style={{
                      background: "#78350f22", color: "#f59e0b",
                      border: "1px solid #78350f55", borderRadius: 8,
                      padding: "4px 8px", fontSize: 11, fontWeight: 600,
                    }}>+ recargo</div>
                  )}
                </div>
              ))
            )}
          </div>
        );
      })()}

      {/* NAV BAR */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 480,
        background: "#16161f", borderTop: "1px solid #1e1e2a",
        display: "flex", padding: "8px 0 16px",
      }}>
        {[
          { icon: "🏠", label: "Inicio", id: "inicio" },
          { icon: "🚪", label: "Acceso", id: "acceso" },
          { icon: "📋", label: "Alumnas", id: "lista" },
        ].map(tab => (
          <button key={tab.id} className="tap"
            onClick={() => setVista(tab.id)}
            style={{
              flex: 1, background: "none", border: "none",
              color: vista === tab.id ? "#818cf8" : "#555",
              cursor: "pointer", padding: "6px 0",
            }}>
            <div style={{ fontSize: 22 }}>{tab.icon}</div>
            <div style={{ fontSize: 11, marginTop: 2, fontWeight: vista === tab.id ? 600 : 400 }}>{tab.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
