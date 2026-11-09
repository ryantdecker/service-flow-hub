<script setup lang="ts">
import type { EventRecord, Organization, Venue } from '~~/shared/types'

const route = useRoute()
const orgSlug = computed(() => String(route.params.org))
const venueSlug = computed(() => String(route.params.venue))

const { data, refresh } = await useFetch<{
  organization: Organization
  venue: Venue
  event: EventRecord | null
}>(() => `/api/live/${orgSlug.value}/${venueSlug.value}`)

const saving = ref(false)
const error = ref('')

async function setNow(segmentId: string) {
  if (!data.value?.event) return
  saving.value = true
  error.value = ''
  try {
    await $fetch(`/api/live/${orgSlug.value}/${venueSlug.value}/state`, {
      method: 'PATCH',
      body: {
        eventSlug: data.value.event.slug,
        currentSegmentId: segmentId,
        mode: 'override',
      },
    })
    await refresh()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to update Now'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div v-if="data?.event" class="admin">
    <header>
      <NuxtLink class="back" :to="`/admin/o/${orgSlug}/v/${venueSlug}`">
        ← {{ data.venue.name }}
      </NuxtLink>
      <p class="kicker">Producer console</p>
      <h1>{{ data.event.title }}</h1>
      <p class="lede">
        Now:
        <strong>{{ data.event.liveState.currentSegmentId }}</strong>
        · {{ data.event.liveState.mode }}
      </p>
      <p v-if="error" class="error">{{ error }}</p>
    </header>

    <ul class="segments">
      <li v-for="(seg, i) in data.event.segments" :key="seg.id">
        <button
          type="button"
          class="seg-btn"
          :class="{ active: seg.id === data.event.liveState.currentSegmentId }"
          :disabled="saving"
          @click="setNow(seg.id)"
        >
          <span class="idx">{{ String(i + 1).padStart(2, '0') }}</span>
          <span class="label">{{ seg.label }}</span>
          <span v-if="seg.id === data.event.liveState.currentSegmentId" class="chip">Now</span>
        </button>
      </li>
    </ul>

    <p class="hint">
      Guests on
      <NuxtLink :to="`/v/${orgSlug}/${venueSlug}`">/v/{{ orgSlug }}/{{ venueSlug }}</NuxtLink>
      poll every 15s.
    </p>
  </div>
  <div v-else class="admin">
    <p>No live event for this venue.</p>
  </div>
</template>

<style scoped>
.admin {
  width: min(560px, 100%);
  margin: 0 auto;
  padding: 2rem 1.1rem 4rem;
}

.back {
  display: inline-block;
  margin-bottom: 0.75rem;
  color: var(--ink-faint);
  font-weight: 700;
  font-size: 0.85rem;
  text-decoration: none;
}

.kicker {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--teal);
}

h1 {
  font-family: var(--font-display);
  color: var(--teal-deep);
}

.lede {
  margin: 0.4rem 0 1rem;
  color: var(--ink-muted);
}

.error {
  color: #9b3b2e;
  font-weight: 700;
  margin-bottom: 0.75rem;
}

.segments {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.seg-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.95rem 1rem;
  border-radius: 12px;
  border: 1px solid rgba(26, 107, 99, 0.12);
  background: var(--white);
  cursor: pointer;
  text-align: left;
}

.seg-btn.active {
  border-color: rgba(201, 120, 58, 0.45);
  box-shadow: 0 0 0 3px var(--now-soft);
}

.idx {
  font-family: var(--font-display);
  font-size: 0.72rem;
  font-weight: 800;
  color: var(--ink-faint);
}

.label {
  flex: 1;
  font-weight: 700;
  color: var(--teal-deep);
}

.chip {
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--now);
  background: var(--now-soft);
  padding: 0.2rem 0.45rem;
  border-radius: 6px;
}

.hint {
  margin-top: 1.25rem;
  font-size: 0.82rem;
  color: var(--ink-faint);
}

.hint a {
  color: var(--teal-deep);
  font-weight: 700;
}
</style>
