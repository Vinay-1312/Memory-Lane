const keys = { forward: false, backward: false, left: false, right: false }

const MAP = {
  ArrowUp: 'forward',   w: 'forward',   W: 'forward',
  ArrowDown: 'backward', s: 'backward', S: 'backward',
  ArrowLeft: 'left',    a: 'left',      A: 'left',
  ArrowRight: 'right',  d: 'right',     D: 'right',
}

window.addEventListener('keydown', e => {
  if (MAP[e.key]) { keys[MAP[e.key]] = true; e.preventDefault() }
})
window.addEventListener('keyup', e => {
  if (MAP[e.key]) keys[MAP[e.key]] = false
})

export function getKeys() { return keys }
