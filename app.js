let video = document.getElementById("video");
let sidebar = document.getElementById("sidebar");
let info = document.getElementById("info");

let providers = {};
let canales = [];
let hls;

// 🔄 Cargar datos
async function init() {
  providers = await fetch("providers.json").then(r => r.json());
  canales = await fetch("canales.json").then(r => r.json());

  renderCanales();
}

function renderCanales() {
  canales.forEach(canal => {
    let div = document.createElement("div");
    div.className = "channel";
    div.innerText = canal.name;

    div.onclick = () => reproducir(canal);

    sidebar.appendChild(div);
  });
}

// 🎬 Reproductor con fallback
async function reproducir(canal) {

  info.innerText = "Cargando: " + canal.name;

  if (hls) hls.destroy();

  for (let source of canal.sources) {

    let url = generarURL(source);

    if (!url) continue;

    let ok = await probarStream(url);

    if (ok) {

      registrarExito(source, canal);

      cargarVideo(url);
      return;
    } else {
      registrarFallo(source);
    }
  }

  info.innerText = "Canal no disponible";
}

// 🔗 Generar URL
function generarURL(source) {

  if (source.type === "hls") return source.url;

  if (source.type === "youtube") {
    video.style.display = "none";
    document.getElementById("player-container").innerHTML = `
      <iframe width="100%" height="100%" 
      src="https://www.youtube.com/embed/${source.videoId}" 
      frameborder="0" allowfullscreen></iframe>`;
    return null;
  }

  if (source.type === "iptv") {
    let p = providers[source.provider];
    if (!p || !p.active) return null;

    return `${p.base}/live/${p.user}/${p.pass}/${source.stream_id}.m3u8`;
  }
}

// 🧪 Verificar stream
async function probarStream(url) {
  try {
    let res = await fetch(url, { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
}

// 🎥 Cargar video
function cargarVideo(url) {
  video.style.display = "block";

  if (Hls.isSupported()) {
    hls = new Hls();
    hls.loadSource(url);
    hls.attachMedia(video);
  } else {
    video.src = url;
  }

  info.innerText = "Reproduciendo";
}

// ✅ Registrar éxito
function registrarExito(source, canal) {
  if (source.provider) {
    let p = providers[source.provider];
    p.failures = 0;

    if (!p.channels_ok.includes(canal.name)) {
      p.channels_ok.push(canal.name);
    }

    console.log("Proveedor OK:", source.provider, p.channels_ok.length);
  }
}

// ❌ Registrar fallo
function registrarFallo(source) {
  if (source.provider) {
    let p = providers[source.provider];
    p.failures++;

    if (p.failures > 5) {
      p.active = false;
      console.log("Proveedor desactivado:", source.provider);
    }
  }
}

init();