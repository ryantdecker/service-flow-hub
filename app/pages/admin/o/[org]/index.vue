<script setup lang="ts">
import type { Organization, Venue } from '~~/shared/types'

const route = useRoute()
const orgSlug = computed(() => String(route.params.org))

const { data } = await useFetch<{ organization: Organization; venues: Venue[] }>(
  () => `/api/orgs/${orgSlug.value}/venues`,
)

function formatTimes(venue: Venue) {
  if (!venue.serviceTimes?.length) return 'Times TBD'
  return venue.serviceTimes
    .map((t) => `${t.day.slice(0, 3)} ${t.label ?? t.time}`)
    .join(' · ')
}
</script>

<template>
  <div v-if="data" class="admin">
    <header>
      <NuxtLink class="back" to="/admin">← Organizations</NuxtLink>
      <p class="kicker">{{ data.organization.vertical }}</p>
      <h1>{{ data.organization.name }}</h1>
      <p class="lede">
        {{ data.venues.length }} venues · times from rivervalley.org
      </p>
      <div class="toolbar">
        <NuxtLink class="btn" :to="`/admin/o/${orgSlug}/items`">Item library</NuxtLink>
      </div>
    </header>

    <ul class="list">
      <li v-for="venue in data.venues" :key="venue.id" class="row">
        <NuxtLink class="main" :to="`/admin/o/${orgSlug}/v/${venue.slug}`">
          <strong>{{ venue.name }}</strong>
          <span class="meta">
            <template v-if="venue.address">
              {{ venue.address.city }}, {{ venue.address.region }}
            </template>
            <template v-else>Virtual / TBD</template>
          </span>
          <span class="times">{{ formatTimes(venue) }}</span>
        </NuxtLink>
        <div class="actions">
          <NuxtLink class="pill" :to="`/v/${orgSlug}/${venue.slug}`">Guest</NuxtLink>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.admin {
  width: min(860px, 100%);
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
  margin: 0.25rem 0 0.35rem;
}

.lede {
  color: var(--ink-muted);
  margin-bottom: 0.85rem;
}

.toolbar {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
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

.list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 0.95rem 1rem;
  background: var(--white);
  border: 1px solid rgba(26, 107, 99, 0.12);
  border-radius: 12px;
  box-shadow: var(--shadow);
}

.main {
  flex: 1;
  min-width: 0;
  text-decoration: none;
}

.row strong {
  display: block;
  color: var(--teal-deep);
}

.meta,
.times {
  display: block;
  margin-top: 0.15rem;
  font-size: 0.78rem;
  color: var(--ink-faint);
  font-weight: 600;
}

.times {
  color: var(--ink-muted);
}

.actions {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  flex-shrink: 0;
}

.pill {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.3rem 0.55rem;
  border-radius: 999px;
  background: var(--teal-soft);
  color: var(--teal-deep);
  text-decoration: none;
}
</style>
