import * as THREE from 'three'

// Palette matched to the reference image
const PINK      = 0xf07898   // main body pink
const PINK_MID  = 0xe06888   // slightly darker pink for recessed panels
const PINK_DARK = 0xc85070   // dark accent / grille
const TYRE      = 0x1e1a1e   // near-black fat tires
const TEAL      = 0x88d8f0   // light blue / teal hub caps
const GLASS     = 0xb8eeff   // light blue windows
const HEADLIGHT = 0xfff8e8   // front lights
const TAILLIGHT = 0xff5580   // rear lights

export function createCar(scene) {
  const group = new THREE.Group()

  const bodyM  = new THREE.MeshLambertMaterial({ color: PINK })
  const midM   = new THREE.MeshLambertMaterial({ color: PINK_MID })
  const darkM  = new THREE.MeshLambertMaterial({ color: PINK_DARK })
  const tyreM  = new THREE.MeshLambertMaterial({ color: TYRE })
  const tealM  = new THREE.MeshLambertMaterial({ color: TEAL })
  const glassM = new THREE.MeshLambertMaterial({ color: GLASS, transparent: true, opacity: 0.72 })
  const hlM    = new THREE.MeshBasicMaterial({ color: HEADLIGHT })
  const tlM    = new THREE.MeshBasicMaterial({ color: TAILLIGHT })
  const whiteM = new THREE.MeshBasicMaterial({ color: 0xffffff })

  // ── Lower body ──
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.80, 4.0), bodyM)
  body.position.y = 0.9; body.castShadow = true; group.add(body)

  // ── Cabin / upper body ──
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.0, 2.45), bodyM)
  cabin.position.set(0, 1.65, -0.1); cabin.castShadow = true; group.add(cabin)

  // ── Hood (slopes slightly) ──
  const hood = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.16, 1.1), bodyM)
  hood.position.set(0, 1.34, 1.4); hood.rotation.x = -0.18; group.add(hood)

  // ── Boot lip ──
  const boot = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 0.5), bodyM)
  boot.position.set(0, 1.3, -1.7); boot.rotation.x = 0.14; group.add(boot)

  // ── Wheel arch flares (boxy fenders) ──
  ;[[-1.22, 0.76, 1.32], [1.22, 0.76, 1.32],
    [-1.22, 0.76,-1.32], [1.22, 0.76,-1.32]].forEach(([x,y,z]) => {
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.45, 1.3), midM)
    f.position.set(x, y, z); group.add(f)
  })

  // ── Large windshield ──
  const windF = new THREE.Mesh(new THREE.PlaneGeometry(1.88, 0.82), glassM)
  windF.position.set(0, 1.68, 1.24); windF.rotation.x = -0.42; group.add(windF)

  const windR = new THREE.Mesh(new THREE.PlaneGeometry(1.88, 0.70), glassM)
  windR.position.set(0, 1.65, -1.34); windR.rotation.x = 0.38; group.add(windR)

  // ── Side windows ──
  ;[[-1.06, 1.67, -0.1, Math.PI/2], [1.06, 1.67, -0.1, -Math.PI/2]].forEach(([x,y,z,ry]) => {
    const sw = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 0.72), glassM)
    sw.position.set(x, y, z); sw.rotation.y = ry; group.add(sw)
  })

  // ── Roof ──
  const roof = new THREE.Mesh(new THREE.BoxGeometry(2.08, 0.10, 2.38), midM)
  roof.position.set(0, 2.17, -0.1); group.add(roof)

  // ── Roof rack ──
  const rackMat = new THREE.MeshLambertMaterial({ color: PINK_DARK })
  const rack = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.07, 2.1), rackMat)
  rack.position.set(0, 2.25, -0.1); group.add(rack)
  // Rack rails
  ;[[-0.8, 2.28, -0.1],[0.8, 2.28, -0.1]].forEach(([x,y,z]) => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 2.0), rackMat)
    rail.position.set(x, y, z); group.add(rail)
  })

  // ── Round headlights ──
  ;[[-0.68, 1.08, 2.02],[0.68, 1.08, 2.02]].forEach(([x,y,z]) => {
    const hl = new THREE.Mesh(new THREE.CircleGeometry(0.24, 18), hlM)
    hl.position.set(x, y, z); group.add(hl)
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.24, 0.31, 18),
      new THREE.MeshBasicMaterial({ color: PINK_DARK, side: THREE.DoubleSide })
    )
    ring.position.set(x, y, z - 0.01); group.add(ring)
  })

  // ── Front grille ──
  const grille = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.28, 0.09), darkM)
  grille.position.set(0, 0.82, 2.03); group.add(grille)

  // ── Front bumper ──
  const bumpF = new THREE.Mesh(new THREE.BoxGeometry(2.42, 0.32, 0.26), midM)
  bumpF.position.set(0, 0.52, 2.06); group.add(bumpF)

  // ── Rear bumper ──
  const bumpR = new THREE.Mesh(new THREE.BoxGeometry(2.42, 0.32, 0.26), midM)
  bumpR.position.set(0, 0.52, -2.06); group.add(bumpR)

  // ── Tail lights ──
  ;[[-0.8, 0.92, -2.04],[0.8, 0.92, -2.04]].forEach(([x,y,z]) => {
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.26, 0.07), tlM)
    tl.position.set(x, y, z); group.add(tl)
  })

  // ── Spare tyre on back ──
  const spareHolder = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 0.12), midM)
  spareHolder.position.set(0, 1.4, -2.09); group.add(spareHolder)
  const spare = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.34, 16), tyreM)
  spare.rotation.x = Math.PI / 2
  spare.position.set(0, 1.4, -2.16); group.add(spare)
  const spareRim = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.35, 12), tealM)
  spareRim.rotation.x = Math.PI / 2
  spareRim.position.set(0, 1.4, -2.16); group.add(spareRim)

  // ── Step rails under doors ──
  ;[[-1.22, 0.3, -0.1],[1.22, 0.3, -0.1]].forEach(([x,y,z]) => {
    const step = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 2.2), darkM)
    step.position.set(x, y, z); group.add(step)
  })

  // ── Fat chunky wheels ──
  const wheelData = []
  const wPos = [
    [ 1.32, 0.55,  1.38],
    [-1.32, 0.55,  1.38],
    [ 1.32, 0.55, -1.38],
    [-1.32, 0.55, -1.38],
  ]

  wPos.forEach(([x, y, z]) => {
    const wg = new THREE.Group(); wg.position.set(x, y, z)

    // Fat black tyre
    const tyre = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.46, 20), tyreM)
    tyre.rotation.z = Math.PI / 2; tyre.castShadow = true; wg.add(tyre)

    // Teal hub cap
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.47, 14), tealM)
    hub.rotation.z = Math.PI / 2; wg.add(hub)

    // White centre dot
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.12, 12), whiteM)
    dot.position.set(x > 0 ? 0.25 : -0.25, 0, 0)
    dot.rotation.y = x > 0 ? -Math.PI/2 : Math.PI/2
    wg.add(dot)

    // Tyre tread lines (thin rings)
    ;[0.18, -0.18].forEach(ox => {
      const tread = new THREE.Mesh(
        new THREE.TorusGeometry(0.55, 0.035, 6, 20),
        new THREE.MeshLambertMaterial({ color: 0x333333 })
      )
      tread.rotation.y = Math.PI / 2; tread.position.x = ox; wg.add(tread)
    })

    group.add(wg)
    wheelData.push(wg)
  })

  group.scale.setScalar(0.52)
  scene.add(group)

  // ── Physics state ──
  const state = {
    speed: 0, maxSpeed: 0.42, acceleration: 0.010,
    friction: 0.925, steerSpeed: 0.030, yaw: Math.PI,
    position: new THREE.Vector3(0, 0, 8),
  }
  const _dir = new THREE.Vector3()

  function update(keys) {
    if (keys.forward)  state.speed = Math.min(state.speed + state.acceleration, state.maxSpeed)
    if (keys.backward) state.speed = Math.max(state.speed - state.acceleration * 1.6, -state.maxSpeed * 0.4)
    state.speed *= state.friction
    if (Math.abs(state.speed) < 0.0004) state.speed = 0
    if (Math.abs(state.speed) > 0.002) {
      const sign = state.speed > 0 ? 1 : -1
      if (keys.left)  state.yaw += state.steerSpeed * sign
      if (keys.right) state.yaw -= state.steerSpeed * sign
    }
    _dir.set(Math.sin(state.yaw), 0, Math.cos(state.yaw))
    state.position.addScaledVector(_dir, state.speed)
    group.position.copy(state.position)
    group.rotation.y = state.yaw
    wheelData.forEach(w => { w.rotation.y += state.speed * 3.5 })
  }

  return { group, state, update }
}
