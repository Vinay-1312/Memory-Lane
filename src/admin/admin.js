import '../style.css'
import { uploadMedia }              from '../lib/firebase.js'
import { addMemory, getMemories, deleteMemory } from '../lib/supabase.js'

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD

// ── Auth gate ──
const authGate    = document.getElementById('auth-gate')
const adminPanel  = document.getElementById('admin-panel')
const passwordIn  = document.getElementById('password-input')
const authBtn     = document.getElementById('auth-btn')
const authError   = document.getElementById('auth-error')

function unlock() {
  if (passwordIn.value === ADMIN_PASSWORD) {
    authGate.classList.add('hidden')
    adminPanel.classList.remove('hidden')
    loadMemoryList()
  } else {
    authError.classList.remove('hidden')
    passwordIn.value = ''
  }
}

authBtn.addEventListener('click', unlock)
passwordIn.addEventListener('keydown', e => e.key === 'Enter' && unlock())

// ── File preview ──
const fileInput   = document.getElementById('mem-file')
const filePreview = document.getElementById('file-preview')

fileInput.addEventListener('change', () => {
  const file = fileInput.files[0]
  if (!file) return

  filePreview.classList.remove('hidden')
  filePreview.innerHTML = ''

  const url = URL.createObjectURL(file)

  if (file.type.startsWith('video')) {
    filePreview.innerHTML = `<video src="${url}" controls muted></video>`
  } else {
    filePreview.innerHTML = `<img src="${url}" alt="preview" />`
  }
})

// ── Submit ──
const submitBtn    = document.getElementById('submit-btn')
const submitStatus = document.getElementById('submit-status')
const dateInput    = document.getElementById('mem-date')
const descInput    = document.getElementById('mem-desc')

submitBtn.addEventListener('click', async () => {
  const date = dateInput.value
  const desc = descInput.value.trim()
  const file = fileInput.files[0]

  if (!date || !desc || !file) {
    submitStatus.textContent = 'Please fill in all fields and pick a file.'
    return
  }

  submitBtn.disabled = true
  submitStatus.textContent = 'Uploading...'

  try {
    const mediaType = file.type.startsWith('video') ? 'video' : 'photo'

    const { url } = await uploadMedia(file, pct => {
      submitStatus.textContent = `Uploading... ${pct}%`
    })

    await addMemory({ date, description: desc, media_url: url, media_type: mediaType })

    submitStatus.textContent = 'Memory saved!'
    dateInput.value  = ''
    descInput.value  = ''
    fileInput.value  = ''
    filePreview.classList.add('hidden')
    filePreview.innerHTML = ''

    loadMemoryList()
  } catch (err) {
    console.error(err)
    submitStatus.textContent = 'Something went wrong. Try again.'
  } finally {
    submitBtn.disabled = false
  }
})

// ── Memory list ──
async function loadMemoryList() {
  const list = document.getElementById('memory-list')
  list.innerHTML = 'Loading...'

  try {
    const memories = await getMemories()

    if (!memories.length) {
      list.innerHTML = '<p style="color:var(--text-light);font-style:italic;">No memories yet.</p>'
      return
    }

    list.innerHTML = ''
    memories.forEach(m => {
      const item = document.createElement('div')
      item.className = 'memory-list-item'
      item.innerHTML = `
        <span class="item-date">${m.date}</span>
        <span class="item-desc">${m.description}</span>
        <button class="item-delete" data-id="${m.id}">Delete</button>
      `
      list.appendChild(item)
    })

    list.querySelectorAll('.item-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this memory?')) return
        await deleteMemory(btn.dataset.id)
        loadMemoryList()
      })
    })
  } catch (err) {
    list.innerHTML = '<p style="color:var(--rose);">Could not load memories.</p>'
  }
}
