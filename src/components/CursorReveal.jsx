import { useEffect, useRef } from 'react'

/**
 * Awwwards-style cursor experience for the landing page:
 *  1. Spotlight reveal — a sharp copy of the background is revealed
 *     through a radial mask that follows the cursor (the blurred
 *     background "clears" where you travel).
 *  2. Targeting-reticle cursor — ring + rotating dashed ring + ticks
 *     + center dot, following with a smooth lerp (spring-like) lag.
 *
 * Both layers are pointer-events-none, so clicks pass through.
 */
export default function CursorReveal() {
  const revealRef = useRef(null)
  const reticleRef = useRef(null)
  const pos = useRef({ x: -100, y: -100, tx: -100, ty: -100, rx: -100, ry: -100 })
  const raf = useRef(null)

  useEffect(() => {
    const onMove = (e) => {
      pos.current.tx = e.clientX
      pos.current.ty = e.clientY
    }
    const onOver = (e) => {
      const interactive = e.target.closest('a, button, [role="button"], input, select, textarea')
      reticleRef.current?.classList.toggle('is-hover', !!interactive)
    }
    const loop = () => {
      const p = pos.current
      // Reveal follows the cursor closely…
      p.x += (p.tx - p.x) * 0.3
      p.y += (p.ty - p.y) * 0.3
      // …while the reticle chases with a slower, elegant lag.
      p.rx += (p.tx - p.rx) * 0.14
      p.ry += (p.ty - p.ry) * 0.14
      if (revealRef.current) {
        revealRef.current.style.setProperty('--mx', `${p.x}px`)
        revealRef.current.style.setProperty('--my', `${p.y}px`)
      }
      if (reticleRef.current) {
        reticleRef.current.style.transform = `translate3d(${p.rx}px, ${p.ry}px, 0)`
      }
      raf.current = requestAnimationFrame(loop)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseover', onOver)
    raf.current = requestAnimationFrame(loop)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseover', onOver)
      cancelAnimationFrame(raf.current)
    }
  }, [])

  return (
    <>
      {/* Sharp background revealed under the cursor */}
      <div ref={revealRef} className="reveal-layer" aria-hidden="true">
        <img src="/background.png" alt="" />
      </div>

      {/* Targeting-reticle cursor */}
      <div ref={reticleRef} className="reticle" aria-hidden="true">
        <div className="reticle-inner">
          <div className="reticle-ring-dashed" />
          <div className="reticle-ring" />
          <span className="reticle-tick reticle-tick-n" />
          <span className="reticle-tick reticle-tick-e" />
          <span className="reticle-tick reticle-tick-s" />
          <span className="reticle-tick reticle-tick-w" />
          <div className="reticle-dot" />
        </div>
      </div>
    </>
  )
}