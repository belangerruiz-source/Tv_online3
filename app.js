let video = document.getElementById("video");
let sidebar = document.getElementById("sidebar");
let info = document.getElementById("info");

let providers = {};
let canales = [];
let hls;

// INIT
async function init() {
  providers = await fetch("providers.json").then(r => r.json());
  canales = await fetch("canales.json").then(r => r.json());

  renderCanales();
}

// UI
function renderCanales() {
  canales.forEach(canal => {
    let div = document.createElement("div");
    div.className = "channel";
    div.innerText = canal.name;

    div.onclick = () => reproducir(canal);

    sidebar.appendChild(div);
  });
}

// 🎬 REPRODUCIR
async function reproducir(canal) {

  info.innerText = "Cargando: " + canal.name;

  if (hls) hls.destroy();

  // 🔴 YouTube Playlist
  let yt = canal.sources.find(s => s.type === "youtube");

  if (yt) {
    video.style.display = "none";

    document.getElementById("player-container").innerHTML = `
      <iframe width="100%" height="100%" 
     src="https://www.youtube.com/embed/videoseries?list=${yt.playlistId}&autoplay=1&mute=1&loop=1&playlist=${yt.playlistId}"
      frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
    `;

    return;
  }

  // 🟢 Probar fuentes
  for (let source of canal.sources) {

    let url = generarURL(source);
    if (!url) continue;

    let ok = await probarStream(url);

    if (ok) {
      cargarVideo(url);
      registrarExito(source, canal);
      return;
    } else {
      registrarFallo(source);
    }
  }

  info.innerText = "Canal no disponible";
}

// 🔗 GENERAR URL
function generarURL(source) {

  if (source.type === "hls") return source.url;

  if (source.type === "iptv") {
    let p = providers[source.provider];
    if (!p || !p.active) return null;

    return `${p.base}/live/${p.user}/${p.pass}/${source.stream_id}.m3u8`;
  }
}

// 🧪 PROBAR STREAM (MEJORADO)
async function probarStream(url) {
  try {
    let res = await fetch(url);
    return res.ok;
  } catch {
    return false;
  }
}

// 🎥 PLAYER
function cargarVideo(url) {

  video.style.display = "block";

  if (Hls.isSupported()) {

    hls = new Hls();

    hls.loadSource(url);
    hls.attachMedia(video);

    hls.on(Hls.Events.MANIFEST_PARSED, function () {
      video.muted = false;
      video.play().catch(() => {});
    });

  } else {
    video.src = url;
    video.muted = false;
    video.play().catch(() => {});
  }

  info.innerText = "Reproduciendo";
}

// ✔️ OK
function registrarExito(source, canal) {
  if (source.provider) {
    let p = providers[source.provider];
    p.failures = 0;

    if (!p.channels_ok.includes(canal.name)) {
      p.channels_ok.push(canal.name);
    }
  }
}

// ❌ FAIL
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