<script setup lang="ts">
import type { EventRecord, Organization, Venue } from '~~/shared/types'

const route = useRoute()
const orgSlug = computed(() => String(route.params.org))
const venueSlug = computed(() => String(route.params.venue))

const { data } = await useFetch<{
  organization: Organization
  venue: Venue
  event: EventRecord | null
  events: EventRecord[]
}>(() => `/api/live/${orgSlug.value}/${venueSlug.value}`)

function formatTimes(venue: Venue) {
  if (!venue.serviceTimes?.length) return 'Times TBD'
  return venue.serviceTimes
    .map((t) => `${t.day} ${t.label ?? t.time}${t.notes ? ` (${t.notes})` : ''}`)
    .join(' · ')
}
</script>

<template>
  <div v-if="data" class="admin">
    <header>
      <NuxtLink class="back" :to="`/admin/o/${orgSlug}`">← {{ data.organization.name }}</NuxtLink>
      <h1>{{ data.venue.name }}</h1>
      <p v-if="data.venue.address" class="addr">
        {{ data.venue.address.line1 }}
        <template v-if="data.venue.address.line2">, {{ data.venue.address.line2 }}</template><br>
        {{ data.venue.address.city }}, {{ data.venue.address.region }}
        {{ data.venue.address.postalCode }}
      </p>
      <p class="times">{{ formatTimes(data.venue) }}</p>
      <div class="toolbar">
        <NuxtLink class="btn" :to="`/v/${orgSlug}/${venueSlug}`">Open guest live</NuxtLink>
        <NuxtLink class="btn ghost" :to="`/admin/o/${orgSlug}/v/${venueSlug}/live`">
          Producer console
        </NuxtLink>
        <NuxtLink class="btn ghost" :to="`/admin/o/${orgSlug}/items`">Item library</NuxtLink>
      </div>
    </header>

    <section class="card">
      <h2>Events</h2>
      <p v-if="!data.events.length" class="empty">No events seeded yet for this venue.</p>
      <ul v-else class="events">
        <li v-for="event in data.events" :key="event.id">
          <span>
            <strong>{{ event.title }}</strong>
            <span class="meta">{{ event.status }} · {{ event.slug }}</span>
          </span>
          <NuxtLink
            class="btn ghost sm"
            :to="`/admin/o/${orgSlug}/v/${venueSlug}/e/${event.slug}/flow`"
          >
            Flow builder
          </NuxtLink>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.admin {
  width: min(720px, 100%);
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

h1 {
  font-family: var(--font-display);
  color: var(--teal-deep);
  margin-bottom: 0.35rem;
}

.addr,
.times {
  color: var(--ink-muted);
  margin-bottom: 0.35rem;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 1rem 0 1.25rem;
}

.btn {
  display: inline-flex;
  padding: 0.55rem 0.85rem;
  border-radius: 10px;
  background: var(--teal);
  color: #fff;
  font-weight: 700;
  text-decoration: none;
}

.btn.ghost {
  background: var(--white);
  color: var(--teal-deep);
  border: 1px solid rgba(26, 107, 99, 0.18);
}

.btn.sm {
  font-size: 0.78rem;
  padding: 0.4rem 0.65rem;
}

.events li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
}

.card {
  background: var(--white);
  border: 1px solid rgba(26, 107, 99, 0.12);
  border-radius: var(--radius);
  padding: 1rem;
  box-shadow: var(--shadow);
}

.card h2 {
  font-family: var(--font-display);
  color: var(--teal-deep);
  margin-bottom: 0.65rem;
}

ul {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.meta,
.empty {
  display: block;
  font-size: 0.8rem;
  color: var(--ink-faint);
  font-weight: 600;
}
</style>
