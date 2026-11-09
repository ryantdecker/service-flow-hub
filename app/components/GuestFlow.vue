<script setup lang="ts">
import type { EventRecord, Organization, Venue } from '~~/shared/types'

const props = defineProps<{
  organization: Organization
  venue: Venue
  event: EventRecord
}>()

const currentIndex = computed(() => {
  const idx = props.event.segments.findIndex(
    (segment) => segment.id === props.event.liveState.currentSegmentId,
  )
  return idx >= 0 ? idx : 0
})

const openIds = ref<Set<number>>(new Set([currentIndex.value]))

watch(currentIndex, (next, prev) => {
  if (next !== prev) openIds.value = new Set([next])
})

function toggle(index: number) {
  const next = new Set(openIds.value)
  if (next.has(index)) next.delete(index)
  else next.add(index)
  openIds.value = next
}

function stateFor(index: number) {
  if (index < currentIndex.value) return 'past'
  if (index === currentIndex.value) return 'current'
  return 'upcoming'
}

const nowLabel = computed(() => {
  const current = props.event.segments[currentIndex.value]
  return currentIndex.value === 0
    ? `Live · ${current?.label ?? 'Welcome'}`
    : `Now · ${current?.label ?? ''}`
})

const progressPct = computed(
  () => ((currentIndex.value + 1) / props.event.segments.length) * 100,
)
</script>

<template>
  <div class="page">
    <header class="hero">
      <h1 class="brand">
        <img
          v-if="organization.branding.logoUrl"
          class="brand-logo"
          :src="organization.branding.logoUrl"
          :alt="organization.name"
        >
        <span v-else>{{ organization.name }}</span>
      </h1>
      <span class="eyebrow">{{ venue.name }}</span>
      <p class="service-line">
        <strong>{{ event.title }}</strong>
      </p>
      <div class="live-pill">
        <span class="live-dot" aria-hidden="true" />
        <span>{{ nowLabel }}</span>
      </div>
    </header>

    <div class="rundown-head">
      <h2>Today's service</h2>
      <span class="rundown-hint">{{ currentIndex + 1 }} of {{ event.segments.length }}</span>
    </div>
    <div class="progress-track" aria-hidden="true">
      <div class="progress-fill" :style="{ width: `${progressPct}%` }" />
    </div>

    <main class="segments" aria-label="Service rundown">
      <article
        v-for="(seg, i) in event.segments"
        :id="`seg-${seg.id}`"
        :key="seg.id"
        class="segment"
        :class="[stateFor(i), openIds.has(i) ? 'open' : 'collapsed']"
      >
        <div class="seg-top">
          <div class="seg-index" aria-hidden="true">
            {{ String(i + 1).padStart(2, '0') }}
          </div>
          <div class="seg-copy">
            <button
              type="button"
              class="seg-toggle"
              :aria-expanded="openIds.has(i)"
              @click="toggle(i)"
            >
              <span class="seg-label-row">
                <h3 class="seg-label">{{ seg.label }}</h3>
                <span v-if="stateFor(i) === 'current'" class="now-badge">Now</span>
              </span>
              <span class="seg-chevron" aria-hidden="true">{{ openIds.has(i) ? '−' : '+' }}</span>
            </button>

            <template v-if="openIds.has(i)">
              <p class="seg-desc">{{ seg.desc }}</p>
              <figure v-if="seg.video" class="video-block">
                <div class="video-frame">
                  <iframe
                    v-if="seg.video.embedUrl"
                    :title="seg.video.title"
                    :src="seg.video.embedUrl"
                    allowfullscreen
                    loading="lazy"
                  />
                  <div v-else class="video-poster">
                    <span class="video-play" aria-hidden="true">▶</span>
                    <span class="video-poster-title">{{ seg.video.title }}</span>
                    <span class="video-poster-cap">{{ seg.video.caption }}</span>
                  </div>
                </div>
              </figure>
              <ul class="links">
                <li v-for="(link, linkIndex) in seg.links" :key="`${seg.id}-${linkIndex}-${link.href}`">
                  <a
                    class="link-row"
                    :class="{
                      cta: link.cta || link.kind === 'cta',
                      song: link.kind === 'song',
                      resource: link.kind === 'resource',
                    }"
                    :href="link.href"
                    @click="(e) => { if (!link.href || link.href === '#') e.preventDefault() }"
                  >
                    <span class="link-text">
                      <span class="link-title">{{ link.title }}</span>
                      <span v-if="link.meta" class="link-meta">{{ link.meta }}</span>
                    </span>
                    <span class="link-arrow" aria-hidden="true">→</span>
                  </a>
                </li>
              </ul>
            </template>
          </div>
        </div>
      </article>
    </main>
  </div>
</template>

<style scoped>
.page {
  width: min(440px, 100%);
  margin: 0 auto;
  padding: 0 1.1rem 3rem;
}

.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 0 -1.1rem 0.35rem;
  padding: 1.35rem 1.25rem 1.25rem;
  background: #000;
  color: #fff;
}

.brand {
  margin: 0 0 0.85rem;
  line-height: 0;
}

.brand-logo {
  display: block;
  width: min(100%, 320px);
  height: auto;
}

.eyebrow {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.72);
  margin-bottom: 0.4rem;
}

.service-line {
  text-align: center;
  font-size: 0.98rem;
  color: rgba(255, 255, 255, 0.62);
  font-weight: 600;
}

.service-line strong {
  color: #fff;
}

.live-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.95rem;
  font-size: 0.78rem;
  font-weight: 700;
  padding: 0.4rem 0.7rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.18);
}

.live-dot {
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 50%;
  background: var(--now);
}

.rundown-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin: 1.15rem 0 0.75rem;
}

.rundown-head h2 {
  font-family: var(--font-display);
  font-size: 1.05rem;
  color: var(--teal-deep);
}

.rundown-hint {
  font-size: 0.75rem;
  color: var(--ink-faint);
  font-weight: 600;
}

.progress-track {
  height: 3px;
  background: rgba(26, 107, 99, 0.12);
  border-radius: 99px;
  margin-bottom: 1rem;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--teal), var(--teal-mid));
  transition: width 0.45s var(--ease);
}

.segments {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.segment {
  border-radius: calc(var(--radius) + 2px);
  padding: 0.95rem 1rem;
  border: 1px solid transparent;
}

.segment.past,
.segment.upcoming {
  background: rgba(255, 255, 255, 0.28);
  border-color: rgba(26, 107, 99, 0.08);
}

.segment.current {
  background: var(--white);
  border-color: rgba(26, 107, 99, 0.16);
  box-shadow: var(--shadow);
}

.seg-top {
  display: flex;
  gap: 0.7rem;
}

.seg-index {
  width: 1.7rem;
  height: 1.7rem;
  border-radius: 8px;
  display: grid;
  place-items: center;
  font-size: 0.72rem;
  font-weight: 800;
  font-family: var(--font-display);
  color: var(--ink-faint);
  background: rgba(26, 107, 99, 0.08);
}

.segment.current .seg-index {
  background: var(--teal);
  color: #fff;
}

.seg-copy {
  flex: 1;
  min-width: 0;
}

.seg-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  border: none;
  background: none;
  cursor: pointer;
  text-align: left;
  color: inherit;
}

.seg-label-row {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.seg-label {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.05rem;
}

.segment.current .seg-label {
  font-size: 1.28rem;
  color: var(--teal-deep);
}

.now-badge {
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--now);
  background: var(--now-soft);
  padding: 0.22rem 0.5rem;
  border-radius: 6px;
}

.seg-chevron {
  width: 1.55rem;
  height: 1.55rem;
  border-radius: 8px;
  display: grid;
  place-items: center;
  background: rgba(26, 107, 99, 0.08);
  color: var(--teal);
  font-weight: 700;
}

.seg-desc {
  margin-top: 0.4rem;
  font-size: 0.88rem;
  color: var(--ink-muted);
}

.video-block {
  margin-top: 0.85rem;
}

.video-frame {
  aspect-ratio: 16 / 9;
  border-radius: 12px;
  overflow: hidden;
  background: #0a0a0a;
  position: relative;
}

.video-frame iframe {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
}

.video-poster {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  color: #fff;
  background: linear-gradient(160deg, #141414, #0a0a0a);
}

.video-play {
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #fff;
  color: var(--teal-deep);
}

.links {
  list-style: none;
  margin-top: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.link-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.72rem 0.85rem;
  background: var(--gray-wash);
  border: 1px solid rgba(26, 107, 99, 0.1);
  border-radius: 11px;
  text-decoration: none;
}

.link-row.song {
  background: rgba(26, 107, 99, 0.06);
}

.link-row.resource {
  border-style: dashed;
}

.link-row.cta {
  background: var(--teal);
  border-color: var(--teal);
}

.link-text {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.link-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--teal-deep);
  line-height: 1.25;
}

.link-row.cta .link-title {
  color: #fff;
}

.link-meta {
  display: block;
  font-size: 0.75rem;
  color: var(--ink-faint);
  font-weight: 600;
  line-height: 1.3;
}

.link-row.cta .link-meta {
  color: rgba(255, 255, 255, 0.82);
}

.link-arrow {
  width: 1.55rem;
  height: 1.55rem;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--white);
  color: var(--teal);
}
</style>
