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
  let blob = new Blob([contenido])
  let a = document.createElement("a")
  a.href = URL.createObjectURL(blob)
  a.download = nombre
  a.click()
}