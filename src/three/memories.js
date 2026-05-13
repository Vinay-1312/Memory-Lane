import * as THREE from 'three'
import { ROAD_WIDTH } from './road.js'

const SHOW_DIST = 16
const GLOW_DIST = 26

// Billboard dimensions
const FW     = 11    // frame width
const FH     = 7.5   // frame height
const OFFSET = ROAD_WIDTH / 2 + 6

let frames    = []
let activeIdx = -1

const overlay = document.getElementById('memory-overlay')
const oDate   = document.getElementById('overlay-date')
const oDesc   = document.getElementById('overlay-desc')
const oMedia  = document.getElementById('overlay-media')

function formatDate(str) {
  return new Date(str + 'T00:00:00').toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  })
}

function makePlaceholder() {
  const w = 512, h = 384
  const c = document.createElement('canvas'); c.width = w; c.height = h
  const ctx = c.getContext('2d')
  const g = ctx.createLinearGradient(0, 0, w, h)
  g.addColorStop(0, '#fce8f4'); g.addColorStop(1, '#ead4e8')
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = 'rgba(212,160,184,0.4)'; ctx.lineWidth = 6
  ctx.strokeRect(18, 18, w-36, h-36)
  ctx.fillStyle = 'rgba(212,160,184,0.55)'
  ctx.font = 'bold 96px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText('♡', w/2, h/2)
  return new THREE.CanvasTexture(c)
}

function makeRawText(memory) {
  const w = 700, h = 560
  const c = document.createElement('canvas'); c.width = w; c.height = h
  const ctx = c.getContext('2d')
  ctx.clearRect(0, 0, w, h)

  // Semi-transparent pill behind date so it pops on any background
  ctx.fillStyle = 'rgba(253,240,248,0.72)'
  ctx.beginPath()
  ctx.roundRect(w/2 - 200, 14, 400, 58, 29)
  ctx.fill()

  // Date — large, dark, legible
  ctx.shadowColor = 'rgba(255,255,255,0.9)'; ctx.shadowBlur = 8
  ctx.fillStyle = '#7a3060'
  ctx.font = 'italic bold 34px Georgia, serif'
  ctx.textAlign = 'center'; ctx.textBaseline = 'top'
  ctx.fillText(formatDate(memory.date), w/2, 24)

  // Thin divider
  ctx.shadowBlur = 0
  ctx.strokeStyle = 'rgba(212,144,176,0.5)'; ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(80, 86); ctx.lineTo(w-80, 86); ctx.stroke()

  // Description — very big bold
  ctx.shadowColor = 'rgba(255,255,255,0.98)'; ctx.shadowBlur = 18
  ctx.fillStyle = '#2e1530'
  ctx.font = 'italic bold 62px Georgia, serif'
  ctx.textBaseline = 'top'
  const words = memory.description.split(' ')
  let line = '', y = 104, lineH = 82, maxW = w - 80
  for (const word of words) {
    const test = line + word + ' '
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line.trim(), w/2, y); line = word + ' '; y += lineH
    } else { line = test }
  }
  if (line.trim()) ctx.fillText(line.trim(), w/2, y)

  return new THREE.CanvasTexture(c)
}

function buildBillboard(scene, tangent, worldPos, height, mat, hasWhiteBorder) {
  const group = new THREE.Group()
  group.position.copy(worldPos)
  group.position.y = height / 2 + 0.3

  // Face inward toward road
  const inward = new THREE.Vector3(-tangent.z, 0, tangent.x)
  group.rotation.y = Math.atan2(inward.x, inward.z)

  if (hasWhiteBorder) {
    group.add(new THREE.Mesh(
      new THREE.PlaneGeometry(FW + 0.5, FH + 0.5),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    ))
  }

  const plane = new THREE.Mesh(new THREE.PlaneGeometry(FW, FH), mat)
  plane.position.z = 0.06
  group.add(plane)

  // Support pole
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.1, height / 2 + 1.5, 7),
    new THREE.MeshLambertMaterial({ color: 0xb890a8 })
  )
  pole.position.y = -(height / 4 + 0.5)
  group.add(pole)

  scene.add(group)
}

export function createMemories(scene, memories, curve) {
  frames = []
  if (!memories || memories.length === 0) return

  memories.forEach((memory, i) => {
    const t       = 0.05 + (i / Math.max(memories.length - 1, 1)) * 0.86
    const safeT   = Math.min(t, 0.9999)
    const point   = curve.getPoint(safeT)
    const tangent = curve.getTangent(safeT)
    const perp    = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize()
    const imgSide = i % 2 === 0 ? 1 : -1
    const txtSide = -imgSide

    // ── Image billboard ──
    const imgPos  = point.clone().addScaledVector(perp, imgSide * OFFSET)
    imgPos.y = 0
    const mediaMat = new THREE.MeshBasicMaterial({ map: makePlaceholder(), side: THREE.DoubleSide })
    buildBillboard(scene, tangent, imgPos, FH, mediaMat, true)

    if (memory.media_type === 'photo') {
      new THREE.TextureLoader().load(memory.media_url,
        tex => { mediaMat.map = tex; mediaMat.needsUpdate = true },
        undefined, () => {}
      )
    }

    // ── Raw text billboard (opposite side, no border) ──
    const txtPos = point.clone().addScaledVector(perp, txtSide * OFFSET)
    txtPos.y = 0
    const textMat = new THREE.MeshBasicMaterial({
      map: makeRawText(memory),
      transparent: true,
      side: THREE.DoubleSide
    })
    buildBillboard(scene, tangent, txtPos, FH, textMat, false)

    // Glow
    const glow = new THREE.PointLight(0xffc4dc, 0, 20)
    glow.position.set(imgPos.x, FH / 2 + 1, imgPos.z)
    scene.add(glow)

    frames.push({ position: new THREE.Vector3(imgPos.x, 0, imgPos.z), glow, memory })
  })
}

export function getFramePositions() { return frames.map(f => f.position) }

export function updateMemories(carPos) {
  let bestIdx = -1, bestDist = Infinity
  frames.forEach((f, i) => {
    const dist = carPos.distanceTo(f.position)
    f.glow.intensity = dist < GLOW_DIST ? (1 - dist / GLOW_DIST) * 3.5 : 0
    if (dist < SHOW_DIST && dist < bestDist) { bestDist = dist; bestIdx = i }
  })
  if (bestIdx !== -1 && bestIdx !== activeIdx) {
    activeIdx = bestIdx; showOverlay(frames[bestIdx].memory)
  } else if (bestIdx === -1 && activeIdx !== -1) {
    activeIdx = -1; hideOverlay()
  }
}

function showOverlay(memory) {
  oDate.textContent = formatDate(memory.date)
  oDesc.textContent = memory.description
  oMedia.innerHTML  = ''
  if (memory.media_type === 'video') {
    const v = document.createElement('video')
    v.src = memory.media_url; v.controls = true
    v.autoplay = true; v.muted = true; v.loop = true; v.playsInline = true
    oMedia.appendChild(v)
  } else {
    const img = document.createElement('img')
    img.src = memory.media_url; img.alt = memory.description
    oMedia.appendChild(img)
  }
  overlay.classList.add('visible')
}

function hideOverlay() {
  overlay.classList.remove('visible')
  setTimeout(() => { oMedia.innerHTML = '' }, 450)
}
