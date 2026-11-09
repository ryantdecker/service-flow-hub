import { useState } from 'react'
import type { SegmentLink, SegmentVideo } from './data/segments'
import { useServicePlan } from './state/ServicePlanContext'
import './Builder.css'

function Builder() {
  const {
    plan,
    setChurch,
    setCurrentIndex,
    updateSegment,
    setSegmentLinks,
    setSegmentVideo,
    addSegment,
    removeSegment,
    moveSegment,
    resetPlan,
  } = useServicePlan()

  const [selected, setSelected] = useState(0)
  const active = plan.segments[Math.min(selected, plan.segments.length - 1)]

  const updateLink = (linkIndex: number, patch: Partial<SegmentLink>) => {
    const links = active.links.map((link, i) =>
      i === linkIndex ? { ...link, ...patch } : link,
    )
    setSegmentLinks(selected, links)
  }

  const addLink = () => {
    setSegmentLinks(selected, [
      ...active.links,
      { title: 'New link', meta: '', href: '#', cta: false },
    ])
  }

  const removeLink = (linkIndex: number) => {
    setSegmentLinks(
      selected,
      active.links.filter((_, i) => i !== linkIndex),
    )
  }

  const enableVideo = () => {
    setSegmentVideo(selected, {
      title: 'Video title',
      caption: 'Tap play to re-watch',
      embedUrl: '',
    })
  }

  const patchVideo = (patch: Partial<SegmentVideo>) => {
    if (!active.video) return
    setSegmentVideo(selected, { ...active.video, ...patch })
  }

  return (
    <div className="builder">
      <header className="builder-top">
        <div>
          <p className="builder-kicker">Service Flow Hub</p>
          <h1>Service builder</h1>
          <p className="builder-sub">
            Build today’s plan, set what’s live, then open the guest page.
          </p>
        </div>
        <div className="builder-actions">
          <a className="btn ghost" href="#/">
            Open guest view
          </a>
          <button type="button" className="btn ghost" onClick={resetPlan}>
            Reset defaults
          </button>
        </div>
      </header>

      <section className="builder-card">
        <div className="card-head">
          <h2>Service details</h2>
        </div>
        <div className="field-grid">
          <label className="field">
            <span>Church</span>
            <input
              value={plan.church.name}
              onChange={(e) => setChurch({ name: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Campus</span>
            <input
              value={plan.church.campus}
              onChange={(e) => setChurch({ campus: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Service</span>
            <input
              value={plan.church.service}
              onChange={(e) => setChurch({ service: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Date</span>
            <input
              value={plan.church.dateLabel}
              onChange={(e) => setChurch({ dateLabel: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Pastor</span>
            <input
              value={plan.church.pastor}
              onChange={(e) => setChurch({ pastor: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Giving platform</span>
            <input
              value={plan.church.givingPlatform}
              onChange={(e) => setChurch({ givingPlatform: e.target.value })}
            />
          </label>
        </div>
      </section>

      <section className="builder-card live-card">
        <div className="card-head">
          <h2>Live now</h2>
          <p>Guests see this segment highlighted as current.</p>
        </div>
        <div className="live-row">
          <select
            className="live-select"
            value={plan.currentIndex}
            onChange={(e) => setCurrentIndex(Number(e.target.value))}
            aria-label="Current live segment"
          >
            {plan.segments.map((seg, i) => (
              <option key={seg.id} value={i}>
                {i + 1}. {seg.label}
              </option>
            ))}
          </select>
          <div className="live-scrub">
            <button
              type="button"
              className="btn icon"
              disabled={plan.currentIndex === 0}
              onClick={() => setCurrentIndex(plan.currentIndex - 1)}
              aria-label="Previous live segment"
            >
              ‹
            </button>
            <button
              type="button"
              className="btn icon"
              disabled={plan.currentIndex === plan.segments.length - 1}
              onClick={() => setCurrentIndex(plan.currentIndex + 1)}
              aria-label="Next live segment"
            >
              ›
            </button>
          </div>
        </div>
      </section>

      <div className="builder-split">
        <section className="builder-card list-card">
          <div className="card-head">
            <h2>Segments</h2>
            <button type="button" className="btn primary sm" onClick={addSegment}>
              Add segment
            </button>
          </div>
          <ol className="seg-list">
            {plan.segments.map((seg, i) => {
              const isLive = i === plan.currentIndex
              const isSelected = i === selected
              return (
                <li key={seg.id}>
                  <button
                    type="button"
                    className={`seg-item${isSelected ? ' selected' : ''}${isLive ? ' live' : ''}`}
                    onClick={() => setSelected(i)}
                  >
                    <span className="seg-item-index">{String(i + 1).padStart(2, '0')}</span>
                    <span className="seg-item-copy">
                      <span className="seg-item-label">{seg.label}</span>
                      <span className="seg-item-meta">
                        {seg.links.length} link{seg.links.length === 1 ? '' : 's'}
                        {seg.video ? ' · video' : ''}
                      </span>
                    </span>
                    {isLive && <span className="live-chip">Now</span>}
                  </button>
                  <div className="seg-item-tools">
                    <button
                      type="button"
                      className="btn icon sm"
                      disabled={i === 0}
                      onClick={() => {
                        moveSegment(i, -1)
                        setSelected(Math.max(0, i - 1))
                      }}
                      aria-label="Move up"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="btn icon sm"
                      disabled={i === plan.segments.length - 1}
                      onClick={() => {
                        moveSegment(i, 1)
                        setSelected(Math.min(plan.segments.length - 1, i + 1))
                      }}
                      aria-label="Move down"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="btn icon sm danger"
                      disabled={plan.segments.length <= 1}
                      onClick={() => {
                        removeSegment(i)
                        setSelected(Math.max(0, Math.min(selected, plan.segments.length - 2)))
                      }}
                      aria-label="Remove segment"
                    >
                      ×
                    </button>
                  </div>
                </li>
              )
            })}
          </ol>
        </section>

        {active && (
          <section className="builder-card editor-card">
            <div className="card-head">
              <h2>Edit segment</h2>
              <button
                type="button"
                className="btn ghost sm"
                onClick={() => setCurrentIndex(selected)}
              >
                Set as Now
              </button>
            </div>

            <div className="field-stack">
              <label className="field">
                <span>Label</span>
                <input
                  value={active.label}
                  onChange={(e) => updateSegment(selected, { label: e.target.value })}
                />
              </label>
              <label className="field">
                <span>Internal time (not shown to guests)</span>
                <input
                  value={active.time}
                  onChange={(e) => updateSegment(selected, { time: e.target.value })}
                  placeholder="9:00"
                />
              </label>
              <label className="field">
                <span>Description</span>
                <textarea
                  rows={3}
                  value={active.desc}
                  onChange={(e) => updateSegment(selected, { desc: e.target.value })}
                />
              </label>
            </div>

            <div className="editor-block">
              <div className="card-head tight">
                <h3>Video</h3>
                {active.video ? (
                  <button
                    type="button"
                    className="btn ghost sm"
                    onClick={() => setSegmentVideo(selected, undefined)}
                  >
                    Remove video
                  </button>
                ) : (
                  <button type="button" className="btn ghost sm" onClick={enableVideo}>
                    Add video
                  </button>
                )}
              </div>
              {active.video && (
                <div className="field-stack">
                  <label className="field">
                    <span>Title</span>
                    <input
                      value={active.video.title}
                      onChange={(e) => patchVideo({ title: e.target.value })}
                    />
                  </label>
                  <label className="field">
                    <span>Caption</span>
                    <input
                      value={active.video.caption}
                      onChange={(e) => patchVideo({ caption: e.target.value })}
                    />
                  </label>
                  <label className="field">
                    <span>Embed URL</span>
                    <input
                      value={active.video.embedUrl}
                      onChange={(e) => patchVideo({ embedUrl: e.target.value })}
                      placeholder="https://www.youtube-nocookie.com/embed/…"
                    />
                  </label>
                </div>
              )}
            </div>

            <div className="editor-block">
              <div className="card-head tight">
                <h3>Links</h3>
                <button type="button" className="btn primary sm" onClick={addLink}>
                  Add link
                </button>
              </div>
              {active.links.length === 0 && (
                <p className="empty-hint">No links yet—add songs, CTAs, or resources.</p>
              )}
              <ul className="link-editor">
                {active.links.map((link, linkIndex) => (
                  <li key={`${active.id}-link-${linkIndex}`} className="link-editor-row">
                    <div className="field-grid compact">
                      <label className="field">
                        <span>Title</span>
                        <input
                          value={link.title}
                          onChange={(e) => updateLink(linkIndex, { title: e.target.value })}
                        />
                      </label>
                      <label className="field">
                        <span>Meta / writer</span>
                        <input
                          value={link.meta}
                          onChange={(e) => updateLink(linkIndex, { meta: e.target.value })}
                        />
                      </label>
                      <label className="field">
                        <span>URL</span>
                        <input
                          value={link.href}
                          onChange={(e) => updateLink(linkIndex, { href: e.target.value })}
                        />
                      </label>
                      <label className="field check">
                        <input
                          type="checkbox"
                          checked={Boolean(link.cta)}
                          onChange={(e) => updateLink(linkIndex, { cta: e.target.checked })}
                        />
                        <span>Primary CTA</span>
                      </label>
                    </div>
                    <button
                      type="button"
                      className="btn ghost sm danger"
                      onClick={() => removeLink(linkIndex)}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

export default Builder
