// ==========================
// PANEL ORIGINAL (NO TOCADO)
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
    div.innerHTML = `<h3>${canal}</h3>`

    data[canal].fuentes.forEach((f,i)=>{
      let d = document.createElement("div")
      d.innerHTML = `${f.nombre}`
      div.appendChild(d)
    })

    cont.appendChild(div)
  }
}

// ==========================
// DESCARGA (ANDROID)
// ==========================

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
//  EXPLORADOR PROVEEDORES PRO
// ==========================

let proveedores = []
let proveedoresValidos = []
let index = {}

let proveedorActual = null
let categoriaActual = null

// ==========================
// ABRIR EXPLORADOR
// ==========================

function abrirExplorador(){

  let div = document.getElementById("explorador")

  if(div.style.display === "block"){
    div.style.display = "none"
    return
  }

  div.style.display = "block"

  div.innerHTML = `
    <h2>Explorador PRO</h2>
    <input type="file" id="fileExplorador"><br><br>

    <button onclick="probarTodos()"> Detectar válidos + ranking</button>
    <button onclick="cargarCache()"> Usar cache</button>

    <div id="progreso"></div>
    <hr>

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
    proveedores = ev.target.result
      .split("\n")
      .filter(l=>l.trim())
      .map(url=>({
        nombre: limpiarNombre(url),
        url: url.trim()
      }))

    renderProveedores()
  }

  reader.readAsText(e.target.files[0])
}

function limpiarNombre(url){
  try{
    return url.split("@")[1]?.split("/")[0] || url.split("/")[2]
  }catch{
    return url
  }
}

// ==========================
// MOSTRAR PROVEEDORES
// ==========================

function renderProveedores(){

  let div = document.getElementById("exploradorVista")
  div.innerHTML = "<h3>Proveedores</h3>"

  proveedores.forEach((p,i)=>{
    div.innerHTML += `
      <div onclick="cargarProveedor(${i})">
        <b>${i+1}.</b> ${p.nombre}
      </div>
    `
  })
}

// ==========================
//  TEST MASIVO
// ==========================

async function probarTodos(){

  proveedoresValidos = []
  let progreso = document.getElementById("progreso")

  for(let i=0;i<proveedores.length;i++){

    let p = proveedores[i]

    progreso.innerHTML = `Probando ${i+1}/${proveedores.length}...`

    let inicio = performance.now()

    try{
      let res = await fetch(p.url)

      if(!res.ok) throw new Error()

      let texto = await res.text()

      if(!texto.includes("#EXTM3U")) throw new Error()

      let tiempo = Math.round(performance.now() - inicio)

      proveedoresValidos.push({
        ...p,
        tiempo
      })

    }catch{}
  }

  // ordenar por velocidad
  proveedoresValidos.sort((a,b)=>a.tiempo - b.tiempo)

  // guardar cache
  localStorage.setItem("proveedores_cache", JSON.stringify(proveedoresValidos))

  progreso.innerHTML = ` ${proveedoresValidos.length} proveedores válidos encontrados`

  renderValidos()
}

// ==========================
// MOSTRAR VALIDOS
// ==========================

function renderValidos(){

  let div = document.getElementById("exploradorVista")
  div.innerHTML = "<h3>Ranking (más rápidos primero)</h3>"

  proveedoresValidos.forEach((p,i)=>{
    div.innerHTML += `
      <div onclick="cargarProveedorValido(${i})">
        <b>${i+1}.</b> ${p.nombre} (${p.tiempo} ms)
      </div>
    `
  })
}

// ==========================
// CACHE
// ==========================

function cargarCache(){
  let cache = localStorage.getItem("proveedores_cache")

  if(!cache){
    alert("No hay cache guardado")
    return
  }

  proveedoresValidos = JSON.parse(cache)
  renderValidos()
}

// ==========================
// CARGAR PROVEEDOR
// ==========================

async function cargarProveedor(i){
  cargarProveedorReal(proveedores[i])
}

async function cargarProveedorValido(i){
  cargarProveedorReal(proveedoresValidos[i])
}

async function cargarProveedorReal(prov){

  let div = document.getElementById("exploradorVista")
  div.innerHTML = " Cargando canales..."

  try{
    let res = await fetch(prov.url)
    let texto = await res.text()

    let canales = parseM3U(texto)

    index = {}

    canales.forEach(c=>{
      let g = c.group_title || "Sin categoría"
      if(!index[g]) index[g] = []
      index[g].push(c)
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
    <button onclick="renderValidos()"> Volver</button>
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
// INSERTAR EN TU PANEL
// ==========================

function agregarSeleccionados(){
  index[categoriaActual].forEach((c,i)=>{
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

function parseXtream(url){
  try{
    let p = url.split("/")
    return {
      host: p[0]+"//"+p[2],
      user: p[4],
      pass: p[5],
      stream_id: p[6].replace(".ts","")
    }
  }catch{return null}
}

function insertar(c){

  let nombre = c.name.trim()

  if(!data[nombre]){
    data[nombre] = { fuentes: [] }
  }

  let parsed = parseXtream(c.url)
  if(!parsed) return

  let nueva = {
    nombre: nombre.toUpperCase()+"_"+(data[nombre].fuentes.length+1),
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

function existeEnPanel(c){

  let parsed = parseXtream(c.url)
  if(!parsed) return false

  for(let canal in data){
    if(data[canal].fuentes.some(f =>
      f.stream_id === parsed.stream_id &&
      f.host === parsed.host
    )) return true
  }

  return false
}