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
      <button onclick="renombrarCanal('${canal}')">✏️</button>
      <button onclick="eliminarCanal('${canal}')">🗑</button>
      <button onclick="renumerar('${canal}')">🔢</button>
    `

    data[canal].fuentes.forEach((f, i) => {

      let fuente = document.createElement("div")
      fuente.className = "fuente"

      fuente.innerHTML = `
        ${f.nombre}
        <button onclick="subir('${canal}',${i})">⬆</button>
        <button onclick="bajar('${canal}',${i})">⬇</button>
        <button onclick="mover('${canal}',${i})">📦</button>
        <button onclick="eliminarFuente('${canal}',${i})">❌</button>
      `

      div.appendChild(fuente)
    })

    cont.appendChild(div)
  }
}

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
// EXPLORADOR IPTV (INTEGRADO REAL)
// ==========================

let dataExplorador = []
let indexExplorador = {}

let proveedorActual = null
let categoriaActual = null

function abrirExplorador(){

  let div = document.getElementById("explorador")
  div.style.display = "block"

  div.innerHTML = `
    <h2>Explorador</h2>
    <input type="file" id="fileExplorador">
    <div id="exploradorVista"></div>
  `

  document.getElementById("fileExplorador").addEventListener("change", cargarExplorador)
}

function cargarExplorador(e){
  const reader = new FileReader()

  reader.onload = ev => {
    dataExplorador = JSON.parse(ev.target.result)
    construirIndex()
    renderProveedores()
  }

  reader.readAsText(e.target.files[0])
}

// ==========================
// INDEXAR
// ==========================

function construirIndex(){
  indexExplorador = {}

  dataExplorador.forEach(c => {

    if(!indexExplorador[c.proveedor]){
      indexExplorador[c.proveedor] = {}
    }

    if(!indexExplorador[c.proveedor][c.group_title]){
      indexExplorador[c.proveedor][c.group_title] = []
    }

    indexExplorador[c.proveedor][c.group_title].push(c)
  })
}

// ==========================
// UI
// ==========================

function renderProveedores(){
  let div = document.getElementById("exploradorVista")
  div.innerHTML = "<h3>Proveedores</h3>"

  Object.keys(indexExplorador).forEach(p=>{
    div.innerHTML += `<div onclick="abrirCategorias('${p}')"> ${p}</div>`
  })
}

function abrirCategorias(p){
  proveedorActual = p

  let div = document.getElementById("exploradorVista")
  div.innerHTML = `<button onclick="renderProveedores()"> Volver</button>`
  div.innerHTML += `<h3>${p}</h3>`

  Object.keys(indexExplorador[p]).forEach(cat=>{
    let total = indexExplorador[p][cat].length

    div.innerHTML += `
      <div onclick="abrirCanales('${cat}')">
         ${cat} (${total})
      </div>
    `
  })
}

function abrirCanales(cat){
  categoriaActual = cat

  let div = document.getElementById("exploradorVista")
  let canales = indexExplorador[proveedorActual][cat]

  div.innerHTML = `
    <button onclick="abrirCategorias('${proveedorActual}')"> Volver</button>
    <h3>${cat}</h3>
    <button onclick="agregarCategoria()">Agregar toda la categor�a</button>
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
// CONVERSI�N A TU FORMATO
// ==========================

function parseXtream(url){

  try{
    let parts = url.split("/")

    return {
      host: parts[0] + "//" + parts[2],
      user: parts[4],
      pass: parts[5],
      stream_id: parts[6].replace(".ts","")
    }
  }catch(e){
    return null
  }
}

// ==========================
// AGREGAR AL PANEL REAL
// ==========================

function agregarSeleccionados(){

  let canales = indexExplorador[proveedorActual][categoriaActual]

  canales.forEach((c,i)=>{
    let chk = document.getElementById("chk_"+i)

    if(chk && chk.checked){
      insertarEnPanel(c)
    }
  })

  render()
}

function agregarCategoria(){
  let canales = indexExplorador[proveedorActual][categoriaActual]
  canales.forEach(c=>insertarEnPanel(c))
  render()
}

function insertarEnPanel(c){

  let base = c.name.trim()

  if(!data[base]){
    data[base] = { fuentes: [] }
  }

  let parsed = parseXtream(c.url)
  if(!parsed) return

  let nuevaFuente = {
    nombre: base.toUpperCase() + "_" + (data[base].fuentes.length+1),
    ...parsed
  }

  // evitar duplicados reales
  let existe = data[base].fuentes.some(f =>
    f.stream_id === nuevaFuente.stream_id &&
    f.host === nuevaFuente.host
  )

  if(existe) return

  data[base].fuentes.push(nuevaFuente)
}

// ==========================
// DETECTAR DUPLICADOS VISUAL
// ==========================

function existeEnPanel(c){

  let parsed = parseXtream(c.url)
  if(!parsed) return false

  for(let canal in data){
    let existe = data[canal].fuentes.some(f =>
      f.stream_id === parsed.stream_id &&
      f.host === parsed.host
    )
    if(existe) return true
  }

  return false
}