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

useHead({
  title: computed(() =>
    data.value
      ? `${data.value.organization.name} · ${data.value.venue.name}`
      : 'Venue live',
  ),
})

let timer: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  timer = setInterval(async () => {
    if (document.visibilityState !== 'visible') return
    await refresh()
  }, 15000)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div v-if="data?.event">
    <GuestFlow
      :organization="data.organization"
      :venue="data.venue"
      :event="data.event"
    />
    <p class="admin-link">
      <NuxtLink :to="`/admin/o/${orgSlug}/v/${venueSlug}/live`">Producer live</NuxtLink>
    </p>
  </div>
  <div v-else-if="data" class="empty">
    <h1>{{ data.venue.name }}</h1>
    <p>No live or upcoming event yet for this venue.</p>
    <NuxtLink :to="`/admin/o/${orgSlug}`">Back to admin</NuxtLink>
  </div>
  <div v-else class="empty">
    <p>Loading…</p>
  </div>
</template>

<style scoped>
.admin-link {
  text-align: center;
  padding: 1rem;
  font-size: 0.78rem;
}

.admin-link a {
  color: var(--ink-faint);
  font-weight: 700;
}

.empty {
  max-width: 420px;
  margin: 3rem auto;
  padding: 1rem;
  text-align: center;
}

.empty h1 {
  font-family: var(--font-display);
  color: var(--teal-deep);
  margin-bottom: 0.5rem;
}
</style>
