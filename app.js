let data = {}

document.getElementById("fileInput").addEventListener("change", function(e) {
  const file = e.target.files[0]
  const reader = new FileReader()

  reader.onload = function(event) {
    data = JSON.parse(event.target.result)
    render()
  }

  reader.readAsText(file)
})

function render() {
  const cont = document.getElementById("canales")
  cont.innerHTML = ""

  for (let canal in data) {

    let div = document.createElement("div")
    div.className = "canal"

    div.innerHTML = `<h3>${canal}</h3>`

    data[canal].fuentes.forEach((f, i) => {

      let fuente = document.createElement("div")
      fuente.className = "fuente"

      fuente.innerHTML = `
        ${f.nombre} 
        <button onclick="eliminarFuente('${canal}', ${i})">❌</button>
      `

      div.appendChild(fuente)
    })

    cont.appendChild(div)
  }
}

function eliminarFuente(canal, idx) {
  data[canal].fuentes.splice(idx, 1)
  render()
}

function generarM3U() {

  let m3u = "#EXTM3U\n\n"

  for (let canal in data) {

    let fuentes = data[canal].fuentes.slice(0, 3)

    fuentes.forEach(f => {
      let url = `${f.host}/live/${f.user}/${f.pass}/${f.stream_id}.ts`

      m3u += `#EXTINF:-1,${f.nombre}\n${url}\n\n`
    })
  }

  descargarArchivo("final.m3u", m3u)
}

function descargarJSON() {
  descargarArchivo("xtream_data.json", JSON.stringify(data, null, 2))
}

function descargarArchivo(nombre, contenido) {
  const blob = new Blob([contenido], { type: "text/plain" })
  const a = document.createElement("a")
  a.href = URL.createObjectURL(blob)
  a.download = nombre
  a.click()
}