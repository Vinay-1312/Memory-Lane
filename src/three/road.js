import * as THREE from 'three'

export const ROAD_WIDTH   = 9
export const sheepData    = []   // { mesh, pos } filled by scatterNature
export const windmillBlades = [] // blade groups, animated in scene.js

// ── River curve — starts far before road, ends far after so fog hides both ends ──
const riverPoints = [
  new THREE.Vector3(-24, 0,  120),  // well before the start arch
  new THREE.Vector3(-22, 0,   60),
  new THREE.Vector3(-26, 0,   10),
  new THREE.Vector3(-28, 0,  -25),
  new THREE.Vector3(-20, 0,  -62),
  new THREE.Vector3(-36, 0,  -98),
  new THREE.Vector3(-24, 0, -134),
  new THREE.Vector3(-32, 0, -168),
  new THREE.Vector3(-20, 0, -205),
  new THREE.Vector3(-34, 0, -242),
  new THREE.Vector3(-22, 0, -278),
  new THREE.Vector3(-30, 0, -315),
  new THREE.Vector3(-20, 0, -352),
  new THREE.Vector3(-26, 0, -400),
  new THREE.Vector3(-24, 0, -460),
  new THREE.Vector3(-28, 0, -520),
  new THREE.Vector3(-22, 0, -580),  // disappears into fog
]
export const riverCurveExport = new THREE.CatmullRomCurve3(riverPoints)

function makeRiverTexture() {
  const w = 128, h = 512
  const c = document.createElement('canvas'); c.width = w; c.height = h
  const ctx = c.getContext('2d')

  // Deep blue base
  const bg = ctx.createLinearGradient(0, 0, w, 0)
  bg.addColorStop(0,    '#04122e')
  bg.addColorStop(0.25, '#0a3080')
  bg.addColorStop(0.5,  '#1868d8')
  bg.addColorStop(0.75, '#0a3080')
  bg.addColorStop(1,    '#04122e')
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h)

  // Sine-wave ripple lines (the key to "flowing" look)
  for (let r = 0; r < 45; r++) {
    const baseY = (r / 45) * h
    const amplitude = 3 + Math.random() * 5
    const freq      = 0.12 + Math.random() * 0.2
    const phase     = Math.random() * Math.PI * 2
    const alpha     = 0.25 + Math.random() * 0.45
    ctx.beginPath()
    ctx.strokeStyle = `rgba(100,200,255,${alpha})`
    ctx.lineWidth = 1.5 + Math.random() * 2.5
    for (let x = 0; x <= w; x += 2) {
      const y = baseY + Math.sin(x * freq + phase) * amplitude
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
    ctx.stroke()
  }

  // Bright centre sun reflection streak
  const refGrad = ctx.createLinearGradient(w*0.35, 0, w*0.65, 0)
  refGrad.addColorStop(0,   'rgba(255,255,255,0)')
  refGrad.addColorStop(0.5, 'rgba(255,255,255,0.55)')
  refGrad.addColorStop(1,   'rgba(255,255,255,0)')
  ctx.fillStyle = refGrad; ctx.fillRect(0, 0, w, h)

  // Edge foam
  for (let s = 0; s < 16; s++) {
    const x = Math.random() > 0.5 ? Math.random()*20 : w-Math.random()*20
    const y = Math.random() * h
    const foam = new Path2D()
    foam.arc(x, y, 2+Math.random()*4, 0, Math.PI*2)
    ctx.fillStyle = `rgba(200,240,255,${0.3+Math.random()*0.4})`
    ctx.fill(foam)
  }

  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(1, 10)
  return tex
}

export function createRiver(scene) {
  const curve    = riverCurveExport
  const pts      = curve.getPoints(600)   // more segments for longer river
  const RWIDTH   = 12

  // ── Water ribbon ──
  const wPos = [], wUVs = [], wIdx = []
  for (let i = 0; i < pts.length; i++) {
    const t   = Math.min(i / (pts.length-1), 0.9999)
    const tan = curve.getTangent(t)
    const R   = new THREE.Vector3(-tan.z, 0, tan.x).normalize()
    const L   = pts[i].clone().addScaledVector(R, -RWIDTH/2)
    const r   = pts[i].clone().addScaledVector(R,  RWIDTH/2)
    L.y = r.y = 0.06
    wPos.push(L.x, L.y, L.z, r.x, r.y, r.z)
    wUVs.push(0, t*18, 1, t*18)
    if (i < pts.length-1) { const b=i*2; wIdx.push(b,b+1,b+2,b+1,b+3,b+2) }
  }
  const waterGeo = new THREE.BufferGeometry()
  waterGeo.setAttribute('position', new THREE.Float32BufferAttribute(wPos, 3))
  waterGeo.setAttribute('uv',       new THREE.Float32BufferAttribute(wUVs, 2))
  waterGeo.setIndex(wIdx); waterGeo.computeVertexNormals()

  const waterTex = makeRiverTexture()
  const waterMat = new THREE.MeshBasicMaterial({
    map: waterTex, transparent: true, opacity: 0.92, side: THREE.DoubleSide
  })
  scene.add(new THREE.Mesh(waterGeo, waterMat))

  // Additive shimmer layer
  const shimmerTex = makeRiverTexture()
  shimmerTex.repeat.set(1, 8)
  const shimmerMat = new THREE.MeshBasicMaterial({
    map: shimmerTex, transparent: true, opacity: 0.35,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
  })
  const shimmerMesh = new THREE.Mesh(waterGeo, shimmerMat)
  shimmerMesh.position.y = 0.04; scene.add(shimmerMesh)

  // ── River banks (sandy/dark strips) ──
  const bankMat = new THREE.MeshLambertMaterial({ color: 0x8a7060 })
  for (const bankSide of [-1, 1]) {
    const bPos = [], bUVs = [], bIdx = []
    for (let i = 0; i < pts.length; i++) {
      const t   = Math.min(i / (pts.length-1), 0.9999)
      const tan = curve.getTangent(t)
      const R   = new THREE.Vector3(-tan.z, 0, tan.x).normalize()
      const inner = pts[i].clone().addScaledVector(R, bankSide * (RWIDTH/2))
      const outer = pts[i].clone().addScaledVector(R, bankSide * (RWIDTH/2 + 3.5))
      inner.y = outer.y = 0.02
      bPos.push(inner.x, inner.y, inner.z, outer.x, outer.y, outer.z)
      bUVs.push(0, t*10, 1, t*10)
      if (i < pts.length-1) { const b=i*2; bIdx.push(b,b+1,b+2,b+1,b+3,b+2) }
    }
    const bGeo = new THREE.BufferGeometry()
    bGeo.setAttribute('position', new THREE.Float32BufferAttribute(bPos, 3))
    bGeo.setAttribute('uv',       new THREE.Float32BufferAttribute(bUVs, 2))
    bGeo.setIndex(bIdx); bGeo.computeVertexNormals()
    scene.add(new THREE.Mesh(bGeo, bankMat))
  }

  // ── Mountain walls — outer side of river only (away from road) ──
  const rockColors = [0x786880, 0x907888, 0x8a7090, 0x7a6878]
  const mPts = curve.getPoints(22)
  mPts.forEach((pt, i) => {
    if (i % 2 !== 0) return           // every other point only
    const t   = Math.min(i / 16, 0.9999)
    const tan = curve.getTangent(t)
    const R   = new THREE.Vector3(-tan.z, 0, tan.x).normalize()

    // side = -1 only: push away from road (river is on the left, outer = further left)
    const dist = RWIDTH/2 + 14 + Math.random()*14
    const mp   = pt.clone().addScaledVector(R, -1 * dist)
    const r    = 16 + Math.random()*16
    const col  = rockColors[Math.floor(Math.random()*rockColors.length)]
    const hill = new THREE.Mesh(
      new THREE.SphereGeometry(r, 10, 8),
      new THREE.MeshLambertMaterial({ color: col })
    )
    hill.position.set(mp.x, -r * 0.65, mp.z)
    hill.castShadow = true; scene.add(hill)
  })

  // ── Riverside rocks ──
  const rockMat = new THREE.MeshLambertMaterial({ color: 0x706070 })
  mPts.forEach((pt, i) => {
    if (Math.random() > 0.45) return
    const t   = Math.min(i / 30, 0.9999)
    const tan = curve.getTangent(t)
    const R   = new THREE.Vector3(-tan.z, 0, tan.x).normalize()
    const side = Math.random() > 0.5 ? 1 : -1
    const dist = RWIDTH/2 + Math.random() * 3
    const rp   = pt.clone().addScaledVector(R, side * dist)
    const rock = new THREE.Mesh(
      new THREE.SphereGeometry(0.6 + Math.random()*1.4, 7, 6),
      rockMat
    )
    rock.position.set(rp.x, 0.3, rp.z)
    rock.scale.y = 0.55 + Math.random()*0.3
    rock.rotation.y = Math.random()*Math.PI
    scene.add(rock)
  })

  // ── Blue point lights along river for atmosphere ──
  ;[0.2, 0.45, 0.65, 0.85].forEach(t => {
    const pt    = curve.getPoint(t)
    const light = new THREE.PointLight(0x4488ff, 1.8, 28)
    light.position.set(pt.x, 3, pt.z); scene.add(light)
  })

  return { waterTex, shimmerTex }
}

const controlPoints = [
  new THREE.Vector3(  0, 0,  12),
  new THREE.Vector3(  0, 0,   0),
  new THREE.Vector3( 18, 0, -38),
  new THREE.Vector3(  2, 0, -76),
  new THREE.Vector3(-20, 0,-112),
  new THREE.Vector3(  4, 0,-148),
  new THREE.Vector3( 24, 0,-184),
  new THREE.Vector3(  6, 0,-220),
  new THREE.Vector3(-18, 0,-256),
  new THREE.Vector3(  0, 0,-292),
  new THREE.Vector3( 18, 0,-328),
  new THREE.Vector3(  0, 0,-364),
]
export const roadCurve = new THREE.CatmullRomCurve3(controlPoints)

// ── Road ribbon helper ──
function buildRibbon(curve, width, segments, y, color) {
  const pts = curve.getPoints(segments)
  const pos = [], uvs = [], idx = []
  for (let i = 0; i < pts.length; i++) {
    const t   = Math.min(i / (pts.length - 1), 0.9999)
    const tan = curve.getTangent(t)
    const R   = new THREE.Vector3(-tan.z, 0, tan.x).normalize()
    const L   = pts[i].clone().addScaledVector(R, -width / 2)
    const r   = pts[i].clone().addScaledVector(R,  width / 2)
    L.y = r.y = y
    pos.push(L.x, L.y, L.z, r.x, r.y, r.z)
    uvs.push(0, t * 60, 1, t * 60)
    if (i < pts.length - 1) { const b = i * 2; idx.push(b, b+1, b+2, b+1, b+3, b+2) }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setAttribute('uv',       new THREE.Float32BufferAttribute(uvs, 2))
  geo.setIndex(idx); geo.computeVertexNormals()
  return new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color }))
}

// ── Trees ──
const TREE_COLORS = [0x7ab868, 0x8aca78, 0x68a858, 0x9ad080, 0x60985a]
function makeTree(x, z, scale) {
  const g    = new THREE.Group()
  const tMat = new THREE.MeshLambertMaterial({ color: 0x8a6040 })
  const fMat = new THREE.MeshLambertMaterial({ color: TREE_COLORS[Math.floor(Math.random() * TREE_COLORS.length)] })
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 1.8, 6), tMat)
  trunk.position.y = 0.9; trunk.castShadow = true; g.add(trunk)
  const layers = [[1.9, 3.2, 2.5], [1.35, 2.6, 3.8], [0.8, 1.8, 5.0]]
  layers.forEach(([r, h, y]) => {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), fMat)
    cone.position.y = y; cone.castShadow = true; g.add(cone)
  })
  g.position.set(x, 0, z); g.rotation.y = Math.random() * Math.PI * 2
  g.scale.setScalar(scale); return g
}

// ── Bushes / hedgerow ──
function makeBush(x, z, scale) {
  const g   = new THREE.Group()
  const mat = new THREE.MeshLambertMaterial({ color: 0x5a9848 })
  const n   = 3 + Math.floor(Math.random() * 3)
  for (let i = 0; i < n; i++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.55 + Math.random() * 0.4, 7, 6), mat)
    s.position.set((Math.random() - 0.5) * 1.2, 0.4, (Math.random() - 0.5) * 0.8)
    s.castShadow = true; g.add(s)
  }
  g.position.set(x, 0, z); g.scale.setScalar(scale); return g
}

// ── Hay bale ──
function makeHayBale(x, z) {
  const mat  = new THREE.MeshLambertMaterial({ color: 0xd4a840 })
  const bale = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 1.4, 12), mat)
  bale.rotation.z  = Math.PI / 2
  bale.position.set(x, 1.0, z)
  bale.castShadow  = true
  return bale
}

// ── Fence posts along road edge ──
function createFences(scene, curve) {
  const postMat = new THREE.MeshLambertMaterial({ color: 0xb8946a })
  const railMat = new THREE.MeshLambertMaterial({ color: 0xa07e55 })
  const pts     = curve.getPoints(240)

  for (let i = 0; i < pts.length; i += 7) {
    const t   = Math.min(i / pts.length, 0.9999)
    const tan = curve.getTangent(t)
    const R   = new THREE.Vector3(-tan.z, 0, tan.x).normalize()

    for (const side of [-1, 1]) {
      const base = pts[i].clone().addScaledVector(R, side * (ROAD_WIDTH / 2 + 1.4))

      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.3, 5), postMat)
      post.position.set(base.x, 0.65, base.z)
      post.castShadow = true
      scene.add(post)

      // Horizontal rail toward next post
      if (i + 7 < pts.length) {
        const next = pts[i + 7].clone().addScaledVector(R, side * (ROAD_WIDTH / 2 + 1.4))
        const mid  = base.clone().add(next).multiplyScalar(0.5)
        const len  = base.distanceTo(next)
        const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, len, 4), railMat)
        rail.position.set(mid.x, 0.85, mid.z)
        const dir = next.clone().sub(base).normalize()
        rail.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)
        scene.add(rail)
      }
    }
  }
}

// ── Wildflower clusters ──
function scatterFlowers(scene, curve) {
  const colors = [0xff1177, 0xff66bb, 0xdd00ff, 0xff4499, 0xffee00, 0xffffff, 0x00ddff, 0xff8800]
  const pts    = curve.getPoints(120)

  pts.forEach((pt, i) => {
    if (Math.random() > 0.4) return
    const t   = Math.min(i / 120, 0.9999)
    const tan = curve.getTangent(t)
    const R   = new THREE.Vector3(-tan.z, 0, tan.x).normalize()

    for (let f = 0; f < 6; f++) {
      const side = Math.random() > 0.5 ? 1 : -1
      const dist = ROAD_WIDTH / 2 + 2 + Math.random() * 14
      const fp   = pt.clone()
        .addScaledVector(R, side * dist)
        .add(new THREE.Vector3((Math.random()-0.5)*2, 0, (Math.random()-0.5)*2))
      const flower = new THREE.Mesh(
        new THREE.SphereGeometry(0.28 + Math.random() * 0.22, 6, 5),
        new THREE.MeshLambertMaterial({ color: colors[Math.floor(Math.random() * colors.length)] })
      )
      flower.position.set(fp.x, 0.16, fp.z); scene.add(flower)

      // Stem
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 0.3, 3),
        new THREE.MeshLambertMaterial({ color: 0x60a040 })
      )
      stem.position.set(fp.x, 0.02, fp.z); scene.add(stem)
    }
  })
}

// ── Grass patches ──
function createGrassPatches(scene, curve) {
  const colors = [0x55cc44, 0x88ee55, 0x44bb33, 0x66dd44]
  const pts    = curve.getPoints(80)
  pts.forEach((pt, i) => {
    if (Math.random() > 0.45) return
    const t   = Math.min(i / 80, 0.9999)
    const tan = curve.getTangent(t)
    const R   = new THREE.Vector3(-tan.z, 0, tan.x).normalize()
    const side = Math.random() > 0.5 ? 1 : -1
    const dist  = ROAD_WIDTH / 2 + 2 + Math.random() * 16
    const fp    = pt.clone().addScaledVector(R, side * dist)
    const patch = new THREE.Mesh(
      new THREE.CircleGeometry(3 + Math.random() * 5, 8),
      new THREE.MeshLambertMaterial({ color: colors[Math.floor(Math.random() * colors.length)], transparent: true, opacity: 0.6 })
    )
    patch.rotation.x = -Math.PI / 2
    patch.position.set(fp.x, 0.015, fp.z)
    scene.add(patch)
  })
}

// ── Hills (rolling countryside) ──
function createHills(scene) {
  const colors = [0x88bb66, 0x99aa77, 0x77cc55, 0xaabb88]
  const data   = [
    [-85,-36,-80,38],[ 98,-40,-130,44],
    [ 88,-42,-250,46],[-95,-38,-320,40],
  ]
  data.forEach(([x,y,z,r],i) => {
    const hill = new THREE.Mesh(
      new THREE.SphereGeometry(r, 14, 9),
      new THREE.MeshLambertMaterial({ color: colors[i % colors.length] })
    )
    hill.position.set(x, y, z); scene.add(hill)
  })
}

// ── Clouds ──
function createClouds(scene) {
  const mat = new THREE.MeshLambertMaterial({ color: 0xfce8f4, transparent: true, opacity: 0.8 })
  for (let c = 0; c < 18; c++) {
    const g = new THREE.Group()
    const n = 4 + Math.floor(Math.random() * 5)
    for (let s = 0; s < n; s++) {
      const r    = 3 + Math.random() * 5
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), mat)
      mesh.position.set((s - n/2)*5 + (Math.random()-0.5)*3, (Math.random()-0.5)*2.5, (Math.random()-0.5)*3)
      g.add(mesh)
    }
    g.position.set((Math.random()-0.5)*200, 28 + Math.random()*20, -Math.random()*380)
    g.scale.setScalar(0.7 + Math.random()*0.7); scene.add(g)
  }
}

// ── Birds (V-shapes in sky) ──
function createBirds(scene) {
  const mat = new THREE.MeshBasicMaterial({ color: 0x5a3858 })
  const geo = new THREE.BoxGeometry(0.9, 0.07, 0.18)
  for (let i = 0; i < 24; i++) {
    const bird = new THREE.Group()
    const wL   = new THREE.Mesh(geo, mat); wL.rotation.z =  0.28; wL.position.x = -0.44
    const wR   = new THREE.Mesh(geo, mat); wR.rotation.z = -0.28; wR.position.x =  0.44
    bird.add(wL, wR)
    bird.position.set((Math.random()-0.5)*140, 18 + Math.random()*18, -Math.random()*380)
    bird.scale.setScalar(0.5 + Math.random()*0.9)
    scene.add(bird)
  }
}

// ── Sunflowers ──
function makeSunflower(x, z) {
  const g    = new THREE.Group()
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.8, 5),
    new THREE.MeshLambertMaterial({ color: 0x5a9838 }))
  stem.position.y = 0.9; g.add(stem)
  const centre = new THREE.Mesh(new THREE.CircleGeometry(0.28, 12),
    new THREE.MeshLambertMaterial({ color: 0x5a3010 }))
  centre.position.y = 1.82; centre.rotation.x = -Math.PI / 2; g.add(centre)
  const petalMat = new THREE.MeshLambertMaterial({ color: 0xffc820 })
  for (let p = 0; p < 10; p++) {
    const petal = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.6), petalMat)
    const a = (p / 10) * Math.PI * 2
    petal.position.set(Math.cos(a) * 0.46, 1.82, Math.sin(a) * 0.46)
    petal.rotation.y = -a; petal.rotation.x = -Math.PI / 2
    g.add(petal)
  }
  g.position.set(x, 0, z)
  g.rotation.y = Math.random() * Math.PI * 2
  g.scale.setScalar(0.7 + Math.random() * 0.7)
  return g
}

// ── Wheat / tall grass patch ──
function makeWheatPatch(cx, cz) {
  const g   = new THREE.Group()
  const mat = new THREE.MeshLambertMaterial({ color: 0xd4b848 })
  for (let i = 0; i < 18; i++) {
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.2 + Math.random()*0.6, 4), mat)
    stalk.position.set((Math.random()-0.5)*3, 0.7, (Math.random()-0.5)*3)
    g.add(stalk)
  }
  g.position.set(cx, 0, cz); return g
}

// ── Simple sheep ──
function makeSheep(x, z) {
  const g    = new THREE.Group()
  const wool = new THREE.MeshLambertMaterial({ color: 0xf8f4f0 })
  const skin = new THREE.MeshLambertMaterial({ color: 0x6a5a50 })
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 6), wool)
  body.position.y = 0.9; body.scale.set(1.3, 1, 1.6); g.add(body)
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 7, 6), skin)
  head.position.set(0, 1.22, 0.88); g.add(head)
  // legs
  ;[[-0.32, 0, 0.3],[0.32, 0, 0.3],[-0.32, 0,-0.3],[0.32, 0,-0.3]].forEach(([lx,ly,lz]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,0.65,5), skin)
    leg.position.set(lx, 0.32, lz); g.add(leg)
  })
  g.position.set(x, 0, z)
  g.rotation.y = Math.random() * Math.PI * 2
  g.scale.setScalar(0.7 + Math.random() * 0.4)
  return g
}

// ── Scatter trees + hay bales + bushes + sunflowers + wheat + sheep ──
function scatterNature(scene, curve) {
  const pts = curve.getPoints(160)
  pts.forEach((pt, i) => {
    const t   = Math.min(i / 160, 0.9999)
    const tan = curve.getTangent(t)
    const R   = new THREE.Vector3(-tan.z, 0, tan.x).normalize()

    // Trees — far from road
    if (Math.random() < 0.45) {
      const side = Math.random() > 0.5 ? 1 : -1
      const dist = ROAD_WIDTH / 2 + 22 + Math.random() * 28
      const pos  = pt.clone().addScaledVector(R, side * dist)
      scene.add(makeTree(pos.x, pos.z, 0.8 + Math.random() * 1.1))
    }

    // Bushes — near road shoulder
    if (Math.random() < 0.28) {
      const side = Math.random() > 0.5 ? 1 : -1
      const dist = ROAD_WIDTH / 2 + 2 + Math.random() * 7
      const pos  = pt.clone().addScaledVector(R, side * dist)
      scene.add(makeBush(pos.x, pos.z, 0.7 + Math.random() * 0.7))
    }

    // Hay bales
    if (Math.random() < 0.055) {
      const side = Math.random() > 0.5 ? 1 : -1
      const dist = ROAD_WIDTH / 2 + 18 + Math.random() * 14
      const pos  = pt.clone().addScaledVector(R, side * dist)
      scene.add(makeHayBale(pos.x, pos.z))
    }

    // Sunflowers — small clusters
    if (Math.random() < 0.1) {
      const side = Math.random() > 0.5 ? 1 : -1
      const dist = ROAD_WIDTH / 2 + 4 + Math.random() * 10
      const pos  = pt.clone().addScaledVector(R, side * dist)
      for (let sf = 0; sf < 4; sf++)
        scene.add(makeSunflower(pos.x+(Math.random()-0.5)*4, pos.z+(Math.random()-0.5)*4))
    }

    // Wheat / grass patches — mid-field
    if (Math.random() < 0.08) {
      const side = Math.random() > 0.5 ? 1 : -1
      const dist = ROAD_WIDTH / 2 + 14 + Math.random() * 16
      const pos  = pt.clone().addScaledVector(R, side * dist)
      scene.add(makeWheatPatch(pos.x, pos.z))
    }

    // Sheep — far fields (track positions for collision)
    if (Math.random() < 0.04) {
      const side = Math.random() > 0.5 ? 1 : -1
      const dist = ROAD_WIDTH / 2 + 26 + Math.random() * 20
      const pos  = pt.clone().addScaledVector(R, side * dist)
      for (let sh = 0; sh < 3; sh++) {
        const sx = pos.x+(Math.random()-0.5)*5, sz = pos.z+(Math.random()-0.5)*5
        const mesh = makeSheep(sx, sz)
        scene.add(mesh)
        sheepData.push({ mesh, pos: new THREE.Vector3(sx, 0, sz), bouncing: false })
      }
    }
  })
}

// ── Entry arch ──
function createArch(scene) {
  const mat     = new THREE.MeshLambertMaterial({ color: 0xd4a0b8 })
  const ballMat = new THREE.MeshLambertMaterial({ color: 0xffd4e8 })
  ;[[-6.5, 9],[6.5, 9]].forEach(([x, z]) => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.45, 5.8, 0.45), mat)
    post.position.set(x, 2.9, z); scene.add(post)
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.38, 10, 10), ballMat)
    ball.position.set(x, 5.9, z); scene.add(ball)
  })
  const beam = new THREE.Mesh(new THREE.BoxGeometry(13.5, 0.6, 0.45), mat)
  beam.position.set(0, 5.7, 9); scene.add(beam)
}

// ── End glow ──
function createEndMarker(scene, curve) {
  const end = curve.getPoint(1)
  const light = new THREE.PointLight(0xffc4dc, 4, 30)
  light.position.set(end.x, 7, end.z); scene.add(light)
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(2.2, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xffc4dc, transparent: true, opacity: 0.7 })
  )
  glow.position.set(end.x, 4, end.z); scene.add(glow)
}

// ══════════════════════════════════════════
//  RIGHT-SIDE WORLD
// ══════════════════════════════════════════

// ── Cherry blossom tree ──
function makeCherryTree(x, z, scale = 1) {
  const g      = new THREE.Group()
  const tMat   = new THREE.MeshLambertMaterial({ color: 0xd4b090 })
  const blossomColors = [0xffb8cc, 0xffd0de, 0xff90aa, 0xffc4d4]

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.16, 2.8, 6), tMat)
  trunk.position.y = 1.4; trunk.castShadow = true; g.add(trunk)

  // Branch
  const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.8, 5), tMat)
  branch.rotation.z = 0.55; branch.position.set(-0.7, 2.4, 0.2); g.add(branch)

  // Blossom clusters
  ;[[0,3.4,0],[0.9,3.0,0.5],[-0.9,3.0,-0.4],[0.4,4.0,-0.7],[-0.5,3.7,0.8],[0.1,2.8,0.9],[-0.3,4.3,0.1]]
    .forEach(([bx,by,bz], i) => {
      const r = 0.75 + Math.random() * 0.55
      const b = new THREE.Mesh(
        new THREE.SphereGeometry(r, 8, 6),
        new THREE.MeshLambertMaterial({ color: blossomColors[i % blossomColors.length] })
      )
      b.position.set(bx, by, bz); b.castShadow = true; g.add(b)
    })

  g.position.set(x, 0, z)
  g.rotation.y = Math.random() * Math.PI * 2
  g.scale.setScalar(scale)
  return g
}

// ── Cottage ──
function makeCottage(scene, x, z, wallColor, roofColor) {
  const g    = new THREE.Group()
  const wMat = new THREE.MeshLambertMaterial({ color: wallColor })
  const rMat = new THREE.MeshLambertMaterial({ color: roofColor })
  const winM = new THREE.MeshLambertMaterial({ color: 0xaae8ff, transparent: true, opacity: 0.75 })
  const dorM = new THREE.MeshLambertMaterial({ color: 0x8b5030 })
  const chMat= new THREE.MeshLambertMaterial({ color: 0xb06040 })

  // Walls
  const walls = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.6, 3.6), wMat)
  walls.position.y = 1.3; walls.castShadow = true; g.add(walls)

  // Hip roof (pyramid)
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.9, 2.0, 4), rMat)
  roof.position.y = 3.3; roof.rotation.y = Math.PI/4; roof.castShadow = true; g.add(roof)

  // Door
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.3, 0.1), dorM)
  door.position.set(0, 0.65, 1.85); g.add(door)

  // Windows front
  ;[[-1.1, 1.5, 1.86],[1.1, 1.5, 1.86]].forEach(([wx,wy,wz]) => {
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.72, 0.08), winM)
    win.position.set(wx,wy,wz); g.add(win)
  })

  // Side window
  const sw = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.72, 0.72), winM)
  sw.position.set(1.86, 1.5, 0); g.add(sw)

  // Chimney
  const chim = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.8, 0.5), chMat)
  chim.position.set(0.9, 3.6, -0.4); g.add(chim)

  // Small garden fence
  for (let i = -2; i <= 2; i++) {
    const post = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.7, 0.12),
      new THREE.MeshLambertMaterial({ color: 0xf0ddd0 })
    )
    post.position.set(i * 0.7, 0.35, 2.6); g.add(post)
  }

  g.position.set(x, 0, z)
  g.rotation.y = (Math.random() - 0.5) * 0.5
  scene.add(g)
}

// ── Windmill ──
function makeWindmill(scene, x, z) {
  const g     = new THREE.Group()
  const stone = new THREE.MeshLambertMaterial({ color: 0xddd0c4 })
  const capM  = new THREE.MeshLambertMaterial({ color: 0xc8a890 })
  const bladeM= new THREE.MeshLambertMaterial({ color: 0xfce8f0, side: THREE.DoubleSide })

  // Stone tower
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1.3, 9, 10), stone)
  tower.position.y = 4.5; tower.castShadow = true; g.add(tower)

  // Conical cap
  const cap = new THREE.Mesh(new THREE.ConeGeometry(1.1, 2.0, 10), capM)
  cap.position.y = 10; g.add(cap)

  // Hub
  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.38, 10, 10),
    new THREE.MeshLambertMaterial({ color: 0xd4a0b8 }))
  hub.position.set(0, 8.2, 0.75); g.add(hub)

  // Rotating blade group
  const bladeGroup = new THREE.Group()
  bladeGroup.position.set(0, 8.2, 0.8)

  for (let b = 0; b < 4; b++) {
    const wrapper = new THREE.Group()
    wrapper.rotation.z = (b / 4) * Math.PI * 2

    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.32, 4.0, 0.1), bladeM)
    blade.position.y = 2.0; wrapper.add(blade)

    // Blade rib
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.08, 3.8, 0.06),
      new THREE.MeshLambertMaterial({ color: 0xd4b0b8 }))
    rib.position.y = 2.0; wrapper.add(rib)

    bladeGroup.add(wrapper)
  }

  g.add(bladeGroup)
  g.position.set(x, 0, z)
  scene.add(g)
  windmillBlades.push(bladeGroup)
}

// ── Scatter right side ──
function createRightSide(scene, curve) {
  const pts = curve.getPoints(120)
  const cottageColors = [
    [0xfce8f0, 0xd05060], [0xf0f8e8, 0x608040],
    [0xfff8e8, 0xa06030], [0xe8f0ff, 0x4060a0],
    [0xfff0f8, 0xc04070],
  ]

  let cottageIdx = 0
  let windmillCount = 0

  pts.forEach((pt, i) => {
    if (i < 5) return   // skip start
    const t   = Math.min(i / 120, 0.9999)
    const tan = curve.getTangent(t)
    const R   = new THREE.Vector3(-tan.z, 0, tan.x).normalize()

    // Cherry blossom trees — dense, close to road
    if (Math.random() < 0.35) {
      const dist = ROAD_WIDTH / 2 + 4 + Math.random() * 12
      const pos  = pt.clone().addScaledVector(R, dist)
      scene.add(makeCherryTree(pos.x, pos.z, 0.8 + Math.random() * 0.7))
    }

    // Cottages — small village clusters
    if (Math.random() < 0.055 && cottageIdx < cottageColors.length * 2) {
      const dist = ROAD_WIDTH / 2 + 10 + Math.random() * 8
      const pos  = pt.clone().addScaledVector(R, dist)
      const [wc, rc] = cottageColors[cottageIdx % cottageColors.length]
      makeCottage(scene, pos.x, pos.z, wc, rc)
      cottageIdx++
    }

    // Windmills — 3 along the road
    if (Math.random() < 0.012 && windmillCount < 3) {
      const dist = ROAD_WIDTH / 2 + 18 + Math.random() * 10
      const pos  = pt.clone().addScaledVector(R, dist)
      makeWindmill(scene, pos.x, pos.z)
      windmillCount++
    }
  })
}

export function createRoad(scene) {
  scene.add(buildRibbon(roadCurve, ROAD_WIDTH + 3.5, 400, 0.01, 0x9a8898))
  const road = buildRibbon(roadCurve, ROAD_WIDTH, 400, 0.02, 0x5a4f64)
  road.receiveShadow = true; scene.add(road)
  scene.add(buildRibbon(roadCurve, 0.22, 400, 0.03, 0xf8d8e8))

  createHills(scene)
  createClouds(scene)
  createBirds(scene)
  createGrassPatches(scene, roadCurve)
  scatterFlowers(scene, roadCurve)
  createFences(scene, roadCurve)
  scatterNature(scene, roadCurve)
  createRightSide(scene, roadCurve)   // cottages, cherry blossoms, windmills
  createArch(scene)
  createEndMarker(scene, roadCurve)
}
