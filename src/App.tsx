import { useEffect, useRef, useState } from 'react'
import { DEFAULT_CURRENT_INDEX, SEGMENTS } from './data/segments'
import './App.css'

type SegmentState = 'past' | 'current' | 'upcoming'

function segmentState(index: number, currentIndex: number): SegmentState {
  if (index < currentIndex) return 'past'
  if (index === currentIndex) return 'current'
  return 'upcoming'
}

function App() {
  const [currentIndex, setCurrentIndex] = useState(DEFAULT_CURRENT_INDEX)
  const [demoOpen, setDemoOpen] = useState(false)
  const currentRef = useRef<HTMLElement | null>(null)

  const setCurrent = (index: number, scroll = false) => {
    const next = Math.max(0, Math.min(SEGMENTS.length - 1, index))
    setCurrentIndex(next)
    if (scroll) {
      requestAnimationFrame(() => {
        const el = document.querySelector<HTMLElement>(`.segment[data-index="${next}"]`)
        if (!el) return
        const top = el.getBoundingClientRect().top + window.scrollY - 72
        window.scrollTo({ top, behavior: 'smooth' })
      })
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      currentRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }, 500)
    return () => window.clearTimeout(timer)
  }, [])

  const current = SEGMENTS[currentIndex]
  const progressPct = ((currentIndex + 1) / SEGMENTS.length) * 100

  return (
    <div className="page">
      <header className="hero">
        <span className="eyebrow">This morning</span>
        <h1 className="brand">Riverside Community Church</h1>
        <p className="service-line">
          <strong>Sunday 9:00</strong> · November 9, 2026
        </p>
        <p className="hero-lead">
          Links for today’s service. What’s happening now is highlighted—everything else stays
          available.
        </p>
        <div className="live-pill" aria-live="polite">
          <span className="live-dot" aria-hidden="true" />
          <span>Now · {current.label}</span>
        </div>
      </header>

      <div className="rundown-head">
        <h2>Service order</h2>
        <span className="rundown-hint">
          {currentIndex + 1} of {SEGMENTS.length}
        </span>
      </div>
      <div className="progress-track" aria-hidden="true">
        <div className="progress-fill" style={{ width: `${progressPct}%` }} />
      </div>

      <main className="segments" aria-label="Service rundown">
        {SEGMENTS.map((seg, i) => {
          const state = segmentState(i, currentIndex)
          return (
            <article
              key={seg.id}
              className={`segment ${state}`}
              data-index={i}
              id={`seg-${seg.id}`}
              ref={state === 'current' ? currentRef : undefined}
            >
              <div className="seg-top">
                <div className="seg-index" aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div className="seg-copy">
                  <div className="seg-label-row">
                    <h3 className="seg-label">{seg.label}</h3>
                    <span className="now-badge">Now</span>
                    <span className="seg-time">{seg.time}</span>
                  </div>
                  <p className="seg-desc">{seg.desc}</p>
                  <ul className="links">
                    {seg.links.map((link) => (
                      <li key={link.title}>
                        <a
                          className="link-row"
                          href={link.href}
                          onClick={(e) => e.preventDefault()}
                        >
                          <span className="link-text">
                            <span className="link-title">{link.title}</span>
                            <span className="link-meta">{link.meta}</span>
                          </span>
                          <span className="link-arrow" aria-hidden="true">
                            →
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>
          )
        })}
      </main>

      <p className="footer-note">Tap any link anytime · “Now” follows the service</p>

      <div className="demo-foot">
        <button
          type="button"
          className="demo-toggle"
          aria-expanded={demoOpen}
          aria-controls="demoPanel"
          onClick={() => setDemoOpen((open) => !open)}
        >
          Demo
        </button>
        <div
          className={`demo-panel${demoOpen ? ' open' : ''}`}
          id="demoPanel"
          hidden={!demoOpen}
        >
          <div className="demo-label">Simulate “now” (reviewers)</div>
          <div className="demo-row">
            <button
              type="button"
              className="nav-btn"
              aria-label="Previous segment"
              disabled={currentIndex === 0}
              onClick={() => setCurrent(currentIndex - 1, true)}
            >
              ‹
            </button>
            <select
              className="segment-select"
              aria-label="Current segment"
              value={currentIndex}
              onChange={(e) => setCurrent(Number(e.target.value), true)}
            >
              {SEGMENTS.map((s, i) => (
                <option key={s.id} value={i}>
                  {i + 1}. {s.label} · {s.time}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="nav-btn"
              aria-label="Next segment"
              disabled={currentIndex === SEGMENTS.length - 1}
              onClick={() => setCurrent(currentIndex + 1, true)}
            >
              ›
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
