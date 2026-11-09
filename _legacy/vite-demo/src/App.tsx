import { useEffect, useRef, useState } from 'react'
import { useServicePlan } from './state/ServicePlanContext'
import './App.css'

type SegmentState = 'past' | 'current' | 'upcoming'

function segmentState(index: number, currentIndex: number): SegmentState {
  if (index < currentIndex) return 'past'
  if (index === currentIndex) return 'current'
  return 'upcoming'
}

function App() {
  const { plan } = useServicePlan()
  const { church, segments, currentIndex } = plan

  const [openIds, setOpenIds] = useState<Set<number>>(
    () => new Set([currentIndex]),
  )
  const [stickyVisible, setStickyVisible] = useState(false)
  const currentRef = useRef<HTMLElement | null>(null)
  const heroRef = useRef<HTMLElement | null>(null)
  const prevCurrent = useRef(currentIndex)

  useEffect(() => {
    if (prevCurrent.current !== currentIndex) {
      setOpenIds(new Set([currentIndex]))
      prevCurrent.current = currentIndex
    }
  }, [currentIndex])

  const toggleExpanded = (index: number) => {
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      currentRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }, 500)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    const hero = heroRef.current
    if (!hero) return
    const observer = new IntersectionObserver(
      ([entry]) => setStickyVisible(!entry.isIntersecting),
      { threshold: 0, rootMargin: '-1px 0px 0px 0px' },
    )
    observer.observe(hero)
    return () => observer.disconnect()
  }, [])

  const current = segments[currentIndex]
  const progressPct = ((currentIndex + 1) / segments.length) * 100
  const preService = currentIndex === 0
  const nowLabel = preService
    ? `Live · ${current?.label ?? 'Welcome'}`
    : `Now · ${current?.label ?? ''}`

  return (
    <div className="page">
      <div
        className={`sticky-bar${stickyVisible ? ' visible' : ''}`}
        aria-hidden={!stickyVisible}
      >
        <img
          className="sticky-logo"
          src="/river-valley-logo.png"
          alt=""
          width={180}
          height={60}
        />
        <div className="sticky-meta">
          <span className="sticky-campus">{church.campus}</span>
          <span className="sticky-now">
            <span className="live-dot" aria-hidden="true" />
            {nowLabel}
          </span>
        </div>
      </div>

      <header className="hero" ref={heroRef}>
        <h1 className="brand">
          <img
            className="brand-logo"
            src="/river-valley-logo.png"
            alt={church.name}
            width={720}
            height={240}
          />
        </h1>
        <span className="eyebrow">{church.campus}</span>
        <p className="service-line">
          <strong>{church.service}</strong> · {church.dateLabel}
        </p>
        <div className="live-pill" aria-live="polite">
          <span className="live-dot" aria-hidden="true" />
          <span>{nowLabel}</span>
        </div>
      </header>

      <div className="rundown-head">
        <h2>Today&apos;s service</h2>
        <span className="rundown-hint">
          {currentIndex + 1} of {segments.length}
        </span>
      </div>
      <div className="progress-track" aria-hidden="true">
        <div className="progress-fill" style={{ width: `${progressPct}%` }} />
      </div>

      <main className="segments" aria-label="Service rundown">
        {segments.map((seg, i) => {
          const state = segmentState(i, currentIndex)
          const isOpen = openIds.has(i)

          return (
            <article
              key={seg.id}
              className={`segment ${state}${isOpen ? ' open' : ' collapsed'}`}
              data-index={i}
              id={`seg-${seg.id}`}
              ref={state === 'current' ? currentRef : undefined}
            >
              <div className="seg-top">
                <div className="seg-index" aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div className="seg-copy">
                  <button
                    type="button"
                    className="seg-toggle"
                    aria-expanded={isOpen}
                    onClick={() => toggleExpanded(i)}
                  >
                    <span className="seg-label-row">
                      <h3 className="seg-label">{seg.label}</h3>
                      {state === 'current' && (
                        <span className="now-badge">Now</span>
                      )}
                    </span>
                    <span className="seg-chevron" aria-hidden="true">
                      {isOpen ? '−' : '+'}
                    </span>
                  </button>

                  {isOpen && (
                    <>
                      <p className="seg-desc">{seg.desc}</p>
                      {seg.video && (
                        <figure className="video-block">
                          <div className="video-frame">
                            {seg.video.embedUrl ? (
                              <iframe
                                title={seg.video.title}
                                src={seg.video.embedUrl}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                loading="lazy"
                              />
                            ) : (
                              <button
                                type="button"
                                className="video-poster"
                                aria-label={`Play ${seg.video.title}`}
                              >
                                <span className="video-play" aria-hidden="true">
                                  ▶
                                </span>
                                <span className="video-poster-title">{seg.video.title}</span>
                                <span className="video-poster-cap">{seg.video.caption}</span>
                              </button>
                            )}
                          </div>
                          <figcaption className="video-caption">
                            <strong>{seg.video.title}</strong>
                            <span>{seg.video.caption}</span>
                          </figcaption>
                        </figure>
                      )}
                      <ul className="links">
                        {seg.links.map((link) => (
                          <li key={`${seg.id}-${link.title}`}>
                            <a
                              className={`link-row${link.cta ? ' cta' : ''}`}
                              href={link.href}
                              onClick={(e) => {
                                if (link.href === '#' || !link.href) e.preventDefault()
                              }}
                            >
                              <span className="link-text">
                                <span className="link-title">{link.title}</span>
                                {!link.cta && (
                                  <span className="link-meta">{link.meta}</span>
                                )}
                              </span>
                              <span className="link-arrow" aria-hidden="true">
                                →
                              </span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </div>
            </article>
          )
        })}
      </main>

      <p className="footer-note">
        Tap a section anytime · “Now” follows the service
      </p>

      <div className="demo-foot">
        <a className="demo-toggle" href="#/builder">
          Service builder
        </a>
      </div>
    </div>
  )
}

export default App
