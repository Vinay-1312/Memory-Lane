import * as THREE from 'three'
import { getKeys }                        from './controls.js'
import { createRoad, roadCurve, createRiver, riverCurveExport, sheepData, windmillBlades } from './road.js'
import { createCar }                                   from './car.js'
import { createMemories, updateMemories, getFramePositions } from './memories.js'
import { getMemories }                    from '../lib/supabase.js'


// ── Hot air balloons ──
function createBalloons(scene) {
  const configs = [
    { x:  35, y: 38, z: -80,  colors: [0xff6688, 0xffdd44, 0x88eeff] },
    { x:  50, y: 52, z: -200, colors: [0xcc44ff, 0xff88aa, 0xffff66] },
    { x:  40, y: 44, z: -320, colors: [0x44ddff, 0xff99bb, 0xffcc44] },
  ]
  const balloons = []

  configs.forEach(({ x, y, z, colors }) => {
    const g = new THREE.Group(); g.position.set(x, y, z)

    // Striped balloon — alternating colored vertical panels
    for (let s = 0; s < colors.length; s++) {
      const panel = new THREE.Mesh(
        new THREE.SphereGeometry(3, 16, 12, (s/colors.length)*Math.PI*2, Math.PI*2/colors.length),
        new THREE.MeshLambertMaterial({ color: colors[s], side: THREE.DoubleSide })
      )
      panel.scale.y = 1.35; g.add(panel)
    }

    // Rope lines
    const ropeMat = new THREE.MeshBasicMaterial({ color: 0x888888 })
    ;[[-1.2,0.8],[-1.2,-0.8],[1.2,0.8],[1.2,-0.8]].forEach(([rx,rz]) => {
      const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,5,4), ropeMat)
      rope.position.set(rx, -4.8, rz); g.add(rope)
    })

    // Basket
    const basket = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 1.2, 2.0),
      new THREE.MeshLambertMaterial({ color: 0xc8903c })
    )
    basket.position.y = -7.2; g.add(basket)

    scene.add(g)
    balloons.push({ group: g, baseY: y })
  })

  return balloons
}

// ── Sun — positioned in driving direction, fog ignored ──
function createSun(scene) {
  // Slightly to the right and ahead so it's visible while driving
  const sunPos = new THREE.Vector3(120, 130, -160)

  const noFog = (col, op = 1, blend = THREE.NormalBlending) =>
    new THREE.MeshBasicMaterial({ color: col, transparent: op < 1, opacity: op,
      blending: blend, depthWrite: false, fog: false })

  const core = new THREE.Mesh(new THREE.SphereGeometry(12, 24, 24), noFog(0xfffde8))
  core.position.copy(sunPos); scene.add(core)

  const glow1 = new THREE.Mesh(new THREE.SphereGeometry(20, 20, 20), noFog(0xffee66, 0.5, THREE.AdditiveBlending))
  glow1.position.copy(sunPos); scene.add(glow1)

  const glow2 = new THREE.Mesh(new THREE.SphereGeometry(35, 16, 16), noFog(0xffbb33, 0.22, THREE.AdditiveBlending))
  glow2.position.copy(sunPos); scene.add(glow2)

  const glow3 = new THREE.Mesh(new THREE.SphereGeometry(60, 12, 12), noFog(0xff9900, 0.08, THREE.AdditiveBlending))
  glow3.position.copy(sunPos); scene.add(glow3)

  // Rays
  for (let r = 0; r < 14; r++) {
    const ray = new THREE.Mesh(new THREE.BoxGeometry(3, 75, 2), noFog(0xffdd44, 0.18, THREE.AdditiveBlending))
    ray.position.copy(sunPos)
    ray.rotation.z = (r / 14) * Math.PI * 2
    scene.add(ray)
  }

  return core
}

// ── Fireflies ──
function createFireflies(scene) {
  const COUNT = 200
  const pos   = new Float32Array(COUNT * 3)
  const base  = new Float32Array(COUNT * 3)
  for (let i = 0; i < COUNT; i++) {
    const x = (Math.random()-0.5)*80, y = Math.random()*8+0.4, z = Math.random()*-380
    pos[i*3]=base[i*3]=x; pos[i*3+1]=base[i*3+1]=y; pos[i*3+2]=base[i*3+2]=z
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  scene.add(new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0xffc4dc, size: 0.28, transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false,
  })))
  return { geo, pos, base }
}

export async function initScene(canvas) {
  // ── Renderer ──
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.setSize(innerWidth, innerHeight)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.setClearColor(0xff9ec8)   // vibrant warm pink sky

  // ── Scene + Fog (lighter so world feels open) ──
  const scene = new THREE.Scene()
  scene.fog = new THREE.FogExp2(0xff9ec8, 0.0038)

  // ── Camera ──
  const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.1, 350)
  camera.position.set(0, 5, 20)

  // ── Lights ──
  scene.add(new THREE.AmbientLight(0xffd0e0, 0.75))

  const sunLight = new THREE.DirectionalLight(0xffb060, 1.8)
  sunLight.position.set(120, 130, -160)   // match sun visual position
  sunLight.castShadow = true
  sunLight.shadow.mapSize.set(2048, 2048)
  sunLight.shadow.camera.far = 350
  sunLight.shadow.camera.left = sunLight.shadow.camera.bottom = -120
  sunLight.shadow.camera.right = sunLight.shadow.camera.top   =  120
  scene.add(sunLight)

  const fill = new THREE.DirectionalLight(0xd0a0e0, 0.45)
  fill.position.set(-60, 30, 80)
  scene.add(fill)

  // ── Sun visual ──
  createSun(scene)

  // ── Ground — vibrant green ──
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(900, 900),
    new THREE.MeshLambertMaterial({ color: 0x74c44c })
  )
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)

  // ── Road + environment ──
  createRoad(scene)

  // ── River ──
  const river = createRiver(scene)

  // ── Floating petals ──
  const PETAL_COUNT = 100
  const petalPos  = new Float32Array(PETAL_COUNT * 3)
  const petalBase = new Float32Array(PETAL_COUNT * 3)
  for (let i = 0; i < PETAL_COUNT; i++) {
    petalPos[i*3]=petalBase[i*3]=(Math.random()-0.5)*70
    petalPos[i*3+1]=petalBase[i*3+1]=1+Math.random()*10
    petalPos[i*3+2]=petalBase[i*3+2]=-Math.random()*380
  }
  const petalGeo = new THREE.BufferGeometry()
  petalGeo.setAttribute('position', new THREE.BufferAttribute(petalPos, 3))
  scene.add(new THREE.Points(petalGeo, new THREE.PointsMaterial({
    color: 0xff88cc, size: 0.4, transparent: true, opacity: 0.8,
    blending: THREE.AdditiveBlending, depthWrite: false
  })))

  // ── Hot air balloons ──
  const balloons = createBalloons(scene)

  // ── Fireflies ──
  const flies = createFireflies(scene)

  // ── Car ──
  const car = createCar(scene)

  // ── Memories ──
  try {
    const memories = await getMemories()
    createMemories(scene, memories, roadCurve)
  } catch (e) {
    console.warn('Memories unavailable:', e)
  }

  // ── Resize ──
  window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(innerWidth, innerHeight)
  })

  // ── Fun interaction state ──
  const splashEl  = document.getElementById('splash-overlay')
  const notifEl   = document.getElementById('fun-notif')
  let notifTimer  = 0
  let inRiver     = false
  let shakeTime   = 0
  let billboardCooldown = 0
  let sheepCooldown     = 0
  const _riverPt  = new THREE.Vector3()

  function showNotif(text, bg) {
    notifEl.textContent = text
    notifEl.style.background = bg
    notifEl.classList.add('show')
    clearTimeout(notifTimer)
    notifTimer = setTimeout(() => notifEl.classList.remove('show'), 2600)
  }

  function checkRiver(carPos) {
    for (let i = 0; i <= 60; i++) {
      riverCurveExport.getPoint(i / 60, _riverPt)
      const dx = carPos.x - _riverPt.x, dz = carPos.z - _riverPt.z
      if (Math.sqrt(dx*dx + dz*dz) < 7) return true
    }
    return false
  }

  // ── Camera state ──
  const camPos    = new THREE.Vector3(0, 5, 20)
  const camLookAt = new THREE.Vector3(0, 1, 0)
  const _camTgt   = new THREE.Vector3()
  const _lookTgt  = new THREE.Vector3()
  const clock     = new THREE.Clock()

  function tick() {
    const t    = clock.getElapsedTime()
    const keys = getKeys()
    car.update(keys)

    const sinY = Math.sin(car.state.yaw)
    const cosY = Math.cos(car.state.yaw)

    _camTgt.set(
      car.state.position.x - sinY * 9,
      car.state.position.y + 5,
      car.state.position.z - cosY * 9,
    )
    _lookTgt.set(
      car.state.position.x + sinY * 4,
      car.state.position.y + 2,
      car.state.position.z + cosY * 4,
    )
    camPos.lerp(_camTgt, 0.07)
    camLookAt.lerp(_lookTgt, 0.09)
    camera.position.copy(camPos)
    camera.lookAt(camLookAt)

    // ── Animate windmill blades ──
    windmillBlades.forEach((b, i) => { b.rotation.z += 0.008 + i * 0.002 })

    // ── Animate balloons (gentle float) ──
    balloons.forEach((b, i) => {
      b.group.position.y = b.baseY + Math.sin(t * 0.4 + i * 1.4) * 2.5
      b.group.rotation.y += 0.002
    })

    // ── Animate river ──
    river.waterTex.offset.y   -= 0.016
    river.shimmerTex.offset.y -= 0.010

    // ── Fun interactions ──
    const carPos = car.state.position

    // River
    const nowInRiver = checkRiver(carPos)
    if (nowInRiver && !inRiver) {
      inRiver = true
      car.state.maxSpeed = 0.09
      splashEl.classList.add('active')
      showNotif('💦 Splash! You drove into the river!', 'rgba(20,80,220,0.75)')
    }
    if (!nowInRiver && inRiver) {
      inRiver = false
      car.state.maxSpeed = 0.42
      splashEl.classList.remove('active')
    }

    // Billboard
    if (billboardCooldown > 0) billboardCooldown -= 0.016
    else {
      for (const fp of getFramePositions()) {
        if (carPos.distanceTo(fp) < 5.5) {
          billboardCooldown = 3
          shakeTime = 0.6
          showNotif('📸 Oops! That\'s a precious memory!', 'rgba(212,100,160,0.8)')
          break
        }
      }
    }

    // Sheep
    if (sheepCooldown > 0) sheepCooldown -= 0.016
    else {
      for (const s of sheepData) {
        if (carPos.distanceTo(s.pos) < 4.5) {
          sheepCooldown = 3
          s.bouncing = true
          s.bounceT  = t
          showNotif('🐑 Baaaa! Watch where you\'re driving!', 'rgba(80,160,60,0.8)')
          break
        }
      }
    }

    // Animate bouncing sheep
    for (const s of sheepData) {
      if (s.bouncing) {
        const elapsed = t - s.bounceT
        s.mesh.position.y = Math.max(0, Math.sin(elapsed * 7) * 2.5)
        if (elapsed > 1.5) { s.bouncing = false; s.mesh.position.y = 0 }
      }
    }

    // Camera shake (billboard hit)
    if (shakeTime > 0) {
      shakeTime -= 0.016
      const intensity = shakeTime * 0.6
      camPos.x += (Math.random()-0.5) * intensity
      camPos.y += (Math.random()-0.5) * intensity * 0.4
    }

    // ── Animate petals ──
    const pa2 = petalGeo.attributes.position.array
    for (let i = 0; i < PETAL_COUNT; i++) {
      pa2[i*3]   = petalBase[i*3]   + Math.sin(t*0.3+i*0.7)*1.4
      pa2[i*3+1] = petalBase[i*3+1] + Math.sin(t*0.5+i*0.4)*0.9
      pa2[i*3+2] = ((petalBase[i*3+2] + t * 0.5) % 380) - 380
    }
    petalGeo.attributes.position.needsUpdate = true

    // ── Animate fireflies ──
    const fa = flies.geo.attributes.position.array
    for (let i = 0; i < 200; i++) {
      fa[i*3+1] = flies.base[i*3+1] + Math.sin(t*0.7+i*0.55)*0.6
      fa[i*3]   = flies.base[i*3]   + Math.cos(t*0.35+i*0.3)*0.4
    }
    flies.geo.attributes.position.needsUpdate = true

    updateMemories(car.state.position)
    renderer.render(scene, camera)
    requestAnimationFrame(tick)
  }

  tick()
}
