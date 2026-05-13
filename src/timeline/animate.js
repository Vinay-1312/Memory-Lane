import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export function animateTimeline() {
  const cards = document.querySelectorAll('.memory')

  cards.forEach((card, i) => {
    const isEven = (i + 1) % 2 === 0
    const xFrom  = isEven ? 40 : -40

    gsap.fromTo(card,
      { opacity: 0, y: 30, x: xFrom },
      {
        opacity: 1,
        y: 0,
        x: 0,
        duration: 0.9,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: card,
          start: 'top 82%',
          toggleActions: 'play none none none',
        }
      }
    )
  })

  // header parallax
  gsap.to('.site-title', {
    yPercent: -20,
    ease: 'none',
    scrollTrigger: {
      trigger: '.site-header',
      start: 'top top',
      end: 'bottom top',
      scrub: true,
    }
  })
}
