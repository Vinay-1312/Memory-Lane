function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

function createCard(memory) {
  const article = document.createElement('article')
  article.className = 'memory'
  article.dataset.id = memory.id

  const isVideo = memory.media_type === 'video'

  const mediaHTML = isVideo
    ? `<video class="memory-media" src="${memory.media_url}" controls playsinline muted loop></video>`
    : `<img class="memory-media" src="${memory.media_url}" alt="${memory.description}" loading="lazy" />`

  article.innerHTML = `
    <div class="media-side">${mediaHTML}</div>
    <div class="text-side">
      <div class="memory-text">
        <p class="memory-date">${formatDate(memory.date)}</p>
        <p class="memory-desc">${memory.description}</p>
      </div>
    </div>
  `

  return article
}

export function renderTimeline(memories, container) {
  container.innerHTML = ''

  if (!memories || memories.length === 0) {
    container.innerHTML = '<p style="text-align:center;color:var(--gold);padding:60px 0;font-style:italic;">No memories yet...</p>'
    return
  }

  memories.forEach(m => container.appendChild(createCard(m)))
}
