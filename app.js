// ==========================
// PANEL ORIGINAL
// ==========================

let data = {}

document.getElementById("fileInput").addEventListener("change", e => {
  const reader = new FileReader()
  reader.onload = ev => {
    data = JSON.parse(ev.target.result)
    render()
  }
  reader.readAsText(e.target.files[0])
})

function render() {
  const cont = document.getElementById("canales")
  cont.innerHTML = ""

  for (let canal in data) {

    let div = document.createElement("div")
    div.className = "canal"

    div.innerHTML = `
      <h3>${canal}</h3>
      <button onclick="renombrarCanal('${canal}')"></button>
      <button onclick="eliminarCanal('${canal}')"></button>
      <button onclick="renumerar('${canal}')"></button>
    `

    data[canal].fuentes.forEach((f, i) => {

      let fuente = document.createElement("div")
      fuente.className = "fuente"

      fuente.innerHTML = `
        ${f.nombre}
        <button onclick="subir('${canal}',${i})"></button>
        <button onclick="bajar('${canal}',${i})"></button>
        <button onclick="mover('${canal}',${i})"></button>
        <button onclick="eliminarFuente('${canal}',${i})"></button>
      `

      div.appendChild(fuente)
    })

    cont.appendChild(div)
  }
}

// ==========================
// FUNCIONES ORIGINALES
// ==========================

function agregarCanal() {
  let nombre = prompt("Nombre del canal:")
  if (!nombre) return
  data[nombre] = { fuentes: [] }
  render()
}

function renombrarCanal(canal) {
  let nuevo = prompt("Nuevo nombre:", canal)
  if (!nuevo) return

  data[nuevo] = data[canal]
  delete data[canal]
  render()
}

function eliminarCanal(canal) {
  delete data[canal]
  render()
}

function eliminarFuente(canal, i) {
  data[canal].fuentes.splice(i,1)
  render()
}

function subir(canal,i){
  if(i<=0) return
  let f=data[canal].fuentes
  ;[f[i],f[i-1]]=[f[i-1],f[i]]
  render()
}

function bajar(canal,i){
  let f=data[canal].fuentes
  if(i>=f.length-1) return
  ;[f[i],f[i+1]]=[f[i+1],f[i]]
  render()
}

function mover(canal,i){
  let destino = prompt("Mover a canal:")
  if(!data[destino]) return alert("No existe")

  let f = data[canal].fuentes.splice(i,1)[0]
  data[destino].fuentes.push(f)
  render()
}

function renumerar(canal){
  data[canal].fuentes.forEach((f,i)=>{
    f.nombre = canal.toUpperCase() + "_" + (i+1)
  })
  render()
}

// ==========================
// EXPORTACIÓN
// ==========================

function generarM3U(limit){

  let m3u = "#EXTM3U\n\n"

  for(let canal in data){

    let fuentes = data[canal].fuentes.slice(0,limit)

    fuentes.forEach(f=>{
      let url = `${f.host}/live/${f.user}/${f.pass}/${f.stream_id}.ts`
      m3u += `#EXTINF:-1,${f.nombre}\n${url}\n\n`
    })
  }

  descargar("final.m3u", m3u)
}

function descargarJSON(){
  descargar("xtream_data.json", JSON.stringify(data,null,2))
}

// descarga compatible Android
function descargar(nombre, contenido){
  const blob = new Blob([contenido], {type:"text/plain"})
  const url = URL.createObjectURL(blob)

  const a = document.createElement("a")
  a.href = url
  a.download = nombre

  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)

  URL.revokeObjectURL(url)
}

// ==========================
//  EXPLORADOR PROVEEDORES
// ==========================

let proveedores = []
let index = {}
let proveedorActual = null
let categoriaActual = null

function abrirExplorador(){

  let div = document.getElementById("explorador")

  if(div.style.display === "block"){
    div.style.display = "none"
    return
  }

  div.style.display = "block"

  div.innerHTML = `
    <h2>Explorador</h2>
    <input type="file" id="fileExplorador">
    <div id="exploradorVista"></div>
  `

  document.getElementById("fileExplorador").addEventListener("change", cargarExplorador)
}

// ==========================
// CARGAR TXT
// ==========================

function cargarExplorador(e){
  const reader = new FileReader()

  reader.onload = ev => {
    proveedores = parseProveedores(ev.target.result)
    renderProveedores()
  }

  reader.readAsText(e.target.files[0])
}

function parseProveedores(texto){
  return texto.split("\n")
    .filter(l=>l.trim())
    .map(url=>{

      let limpio = url.trim()
      let dominio = limpio.split("@")[1]?.split("/")[0] || limpio

      return { nombre: dominio, url: limpio }
    })
}

// ==========================
// UI PROVEEDORES
// ==========================

function renderProveedores(){

  let div = document.getElementById("exploradorVista")
  div.innerHTML = "<h3>Proveedores</h3>"

  proveedores.forEach((p,i)=>{
    div.innerHTML += `<div onclick="cargarProveedor(${i})"> ${p.nombre}</div>`
  })
}

// ==========================
// CARGAR PROVEEDOR (FETCH)
// ==========================

async function cargarProveedor(i){

  let prov = proveedores[i]
  let div = document.getElementById("exploradorVista")

  div.innerHTML = " Cargando..."

  try{
    let res = await fetch(prov.url)
    let texto = await res.text()

    let canales = parseM3U(texto)

    index = {}

    canales.forEach(c=>{
      let grupo = c.group_title || "Sin categoría"

      if(!index[grupo]) index[grupo] = []
      index[grupo].push(c)
    })

    proveedorActual = prov.nombre
    renderCategorias()

  }catch(e){
    div.innerHTML = " Error cargando proveedor"
  }
}

// ==========================
// CATEGORÍAS
// ==========================

function renderCategorias(){

  let div = document.getElementById("exploradorVista")

  div.innerHTML = `
    <button onclick="renderProveedores()"> Volver</button>
    <h3>${proveedorActual}</h3>
  `

  Object.keys(index).forEach(cat=>{
    div.innerHTML += `
      <div onclick="abrirCanales('${cat}')">
         ${cat} (${index[cat].length})
      </div>
    `
  })
}

// ==========================
// CANALES
// ==========================

function abrirCanales(cat){

  categoriaActual = cat
  let canales = index[cat]

  let div = document.getElementById("exploradorVista")

  div.innerHTML = `
    <button onclick="renderCategorias()"> Volver</button>
    <h3>${cat}</h3>
    <button onclick="agregarCategoria()">Agregar toda la categoría</button>
  `

  canales.forEach((c,i)=>{

    let existe = existeEnPanel(c)

    div.innerHTML += `
      <div style="${existe?'background:#552222':''}">
        <input type="checkbox" id="chk_${i}">
        ${c.name}
      </div>
    `
  })

  div.innerHTML += `<button onclick="agregarSeleccionados()">Agregar seleccionados</button>`
}

// ==========================
// PARSE M3U
// ==========================

function parseM3U(texto){

  let lineas = texto.split("\n")
  let res = []

  for(let i=0;i<lineas.length;i++){

    let l = lineas[i].trim()

    if(l.startsWith("#EXTINF")){

      let nombre = l.split(",")[1] || "Canal"

      let group = "Sin categoría"
      let m = l.match(/group-title="([^"]+)"/)
      if(m) group = m[1]

      let url = lineas[i+1]?.trim()

      if(url){
        res.push({ name:nombre, group_title:group, url })
      }
    }
  }

  return res
}

// ==========================
// AGREGAR A TU PANEL
// ==========================

function agregarSeleccionados(){
  let canales = index[categoriaActual]

  canales.forEach((c,i)=>{
    let chk = document.getElementById("chk_"+i)
    if(chk && chk.checked){
      insertar(c)
    }
  })

  render()
}

function agregarCategoria(){
  index[categoriaActual].forEach(c=>insertar(c))
  render()
}

// ==========================
// CONVERTIR A XTREAM
// ==========================

function parseXtream(url){

  try{
    let p = url.split("/")
    return {
      host: p[0]+"//"+p[2],
      user: p[4],
      pass: p[5],
      stream_id: p[6].replace(".ts","")
    }
  }catch{
    return null
  }
}

function insertar(c){

  let nombre = c.name.trim()

  if(!data[nombre]){
    data[nombre] = { fuentes: [] }
  }

  let parsed = parseXtream(c.url)
  if(!parsed) return

  let nueva = {
    nombre: nombre.toUpperCase() + "_" + (data[nombre].fuentes.length+1),
    ...parsed
  }

  let existe = data[nombre].fuentes.some(f =>
    f.stream_id === nueva.stream_id &&
    f.host === nueva.host
  )

  if(!existe){
    data[nombre].fuentes.push(nueva)
  }
}

// ==========================
// DUPLICADOS VISUALES
// ==========================

function existeEnPanel(c){

  let parsed = parseXtream(c.url)
  if(!parsed) return false

  for(let canal in data){
    let ok = data[canal].fuentes.some(f =>
      f.stream_id === parsed.stream_id &&
      f.host === parsed.host
    )
    if(ok) return true
  }

  return false
}