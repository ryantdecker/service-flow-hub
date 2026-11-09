<script setup lang="ts">
import type { EventRecord, Organization, Venue } from '~~/shared/types'

const route = useRoute()
const router = useRouter()
const orgSlug = computed(() => String(route.params.org))
const venueSlug = computed(() => String(route.params.venue))

const { data, refresh } = await useFetch<{
  organization: Organization
  venue: Venue
  event: EventRecord | null
  events: EventRecord[]
}>(() => `/api/live/${orgSlug.value}/${venueSlug.value}`)

const creating = ref(false)
const cloning = ref(false)
const showCreate = ref(false)
const showCloneModal = ref(false)
const createSystemName = ref('')
const createTitle = ref('')
const cloneSourceSlug = ref('')
const actionError = ref('')

const sortedEvents = computed(() =>
  [...(data.value?.events ?? [])].sort((a, b) =>
    a.systemName.localeCompare(b.systemName) || a.title.localeCompare(b.title),
  ),
)

function formatTimes(venue: Venue) {
  if (!venue.serviceTimes?.length) return 'Times TBD'
  return venue.serviceTimes
    .map((t) => `${t.day} ${t.label ?? t.time}${t.notes ? ` (${t.notes})` : ''}`)
    .join(' · ')
}

function openCreate() {
  createSystemName.value = ''
  createTitle.value = ''
  actionError.value = ''
  showCloneModal.value = false
  showCreate.value = true
}

function openCloneModal() {
  actionError.value = ''
  showCreate.value = false
  cloneSourceSlug.value = sortedEvents.value[0]?.slug ?? ''
  showCloneModal.value = true
}

function closeCloneModal() {
  showCloneModal.value = false
  cloneSourceSlug.value = ''
}

async function createEvent() {
  if (!createSystemName.value.trim()) {
    actionError.value = 'System name is required'
    return
  }
  creating.value = true
  actionError.value = ''
  try {
    const result = await $fetch<{ event: EventRecord; path: string }>(
      `/api/events/${orgSlug.value}/${venueSlug.value}`,
      {
        method: 'POST',
        body: {
          systemName: createSystemName.value,
          title: createTitle.value.trim() || undefined,
        },
      },
    )
    showCreate.value = false
    createSystemName.value = ''
    createTitle.value = ''
    await refresh()
    await router.push(result.path)
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : 'Create failed'
  } finally {
    creating.value = false
  }
}

async function confirmClone() {
  if (!cloneSourceSlug.value) {
    actionError.value = 'Choose an event to clone'
    return
  }
  cloning.value = true
  actionError.value = ''
  try {
    const result = await $fetch<{ event: EventRecord; path: string }>(
      `/api/events/${orgSlug.value}/${venueSlug.value}/${cloneSourceSlug.value}/clone`,
      { method: 'POST' },
    )
    closeCloneModal()
    await refresh()
    await router.push(result.path)
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : 'Clone failed'
  } finally {
    cloning.value = false
  }
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
      <div class="card-head">
        <h2>Events</h2>
        <div class="head-actions">
          <button
            type="button"
            class="btn ghost sm"
            :disabled="!sortedEvents.length"
            @click="openCloneModal"
          >
            Clone flow
          </button>
          <button type="button" class="btn sm" @click="openCreate">Create new</button>
        </div>
      </div>

      <p v-if="actionError" class="error">{{ actionError }}</p>

      <div v-if="showCreate" class="create-panel">
        <label>
          <span>System name</span>
          <input
            v-model="createSystemName"
            type="text"
            placeholder="City Sun 11:00"
            @keydown.enter.prevent="createEvent"
          >
        </label>
        <label>
          <span>Guest display name</span>
          <input
            v-model="createTitle"
            type="text"
            placeholder="Defaults to system name"
            @keydown.enter.prevent="createEvent"
          >
        </label>
        <div class="create-actions">
          <button type="button" class="text-btn" @click="showCreate = false">Cancel</button>
          <button type="button" class="btn sm" :disabled="creating" @click="createEvent">
            {{ creating ? 'Creating…' : 'Create & edit flow' }}
          </button>
        </div>
      </div>

      <p v-if="!sortedEvents.length" class="empty">No events yet for this venue.</p>
      <ul v-else class="events">
        <li v-for="event in sortedEvents" :key="event.id">
          <span>
            <strong>{{ event.systemName }}</strong>
            <span class="meta">
              Guest: {{ event.title }} · {{ event.status }} · {{ event.slug }}
            </span>
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

    <div
      v-if="showCloneModal"
      class="modal-backdrop"
      @click.self="closeCloneModal"
    >
      <div
        class="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="clone-modal-title"
      >
        <div class="modal-head">
          <h3 id="clone-modal-title">Clone a flow</h3>
          <button type="button" class="text-btn" @click="closeCloneModal">Close</button>
        </div>
        <p class="modal-lede">Choose an event to copy. The clone opens as a new draft.</p>
        <label class="scope-field">
          <span>Event</span>
          <select v-model="cloneSourceSlug">
            <option disabled value="">Select an event…</option>
            <option v-for="event in sortedEvents" :key="event.id" :value="event.slug">
              {{ event.systemName }} — {{ event.title }}
            </option>
          </select>
        </label>
        <div class="create-actions">
          <button type="button" class="text-btn" @click="closeCloneModal">Cancel</button>
          <button
            type="button"
            class="btn sm"
            :disabled="cloning || !cloneSourceSlug"
            @click="confirmClone"
          >
            {{ cloning ? 'Cloning…' : 'Clone & edit' }}
          </button>
        </div>
      </div>
    </div>
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
  align-items: center;
  justify-content: center;
  padding: 0.55rem 0.85rem;
  border: none;
  border-radius: 10px;
  background: var(--teal);
  color: #fff;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
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

.btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.card {
  background: var(--white);
  border: 1px solid rgba(26, 107, 99, 0.12);
  border-radius: var(--radius);
  padding: 1rem;
  box-shadow: var(--shadow);
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.65rem;
}

.head-actions {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.card h2 {
  font-family: var(--font-display);
  color: var(--teal-deep);
  margin: 0;
}

.create-panel {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  margin-bottom: 0.85rem;
  padding: 0.75rem;
  border-radius: 12px;
  background: var(--gray-wash);
  border: 1px solid rgba(26, 107, 99, 0.12);
}

.create-panel label,
.scope-field {
  display: flex;
  flex-direction: column;
  gap: 0.28rem;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

.create-panel input,
.scope-field select {
  font: inherit;
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: none;
  color: var(--ink);
  border: 1px solid rgba(26, 107, 99, 0.16);
  border-radius: 10px;
  padding: 0.6rem 0.7rem;
  background: var(--white);
}

.create-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 0.75rem;
}

.text-btn {
  border: none;
  background: none;
  color: var(--teal);
  font-weight: 700;
  cursor: pointer;
  font-size: 0.8rem;
}

.events li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
}

.error {
  color: #9b3b2e;
  font-weight: 700;
  margin-bottom: 0.55rem;
}

ul {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.meta,
.empty,
.modal-lede {
  display: block;
  font-size: 0.8rem;
  color: var(--ink-faint);
  font-weight: 600;
}

.modal-lede {
  margin-bottom: 0.75rem;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: rgba(13, 63, 60, 0.35);
}

.modal {
  width: min(440px, 100%);
  background: var(--white);
  border-radius: var(--radius);
  padding: 1rem;
  box-shadow: var(--shadow);
  border: 1px solid rgba(26, 107, 99, 0.12);
}

.modal-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.35rem;
}

.modal-head h3 {
  font-family: var(--font-display);
  color: var(--teal-deep);
  margin: 0;
  font-size: 1.1rem;
}
</style>
