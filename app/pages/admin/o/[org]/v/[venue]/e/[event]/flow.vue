<script setup lang="ts">
import type {
  EventRecord,
  ItemLibrary,
  LibraryItem,
  Organization,
  Venue,
} from '~~/shared/types'

type FlowRow = {
  id: string
  label: string
  desc: string
  itemIds: string[]
  videoItemId: string
  startTime: string
}

const route = useRoute()
const orgSlug = computed(() => String(route.params.org))
const venueSlug = computed(() => String(route.params.venue))
const eventSlug = computed(() => String(route.params.event))

const { data, refresh } = await useFetch<{
  organization: Organization
  venue: Venue
  event: EventRecord
  library: ItemLibrary
}>(() => `/api/events/${orgSlug.value}/${venueSlug.value}/${eventSlug.value}`)

function toRows(event: EventRecord): FlowRow[] {
  const scheduleById = new Map(event.schedule.map((beat) => [beat.segmentId, beat.startsAt]))
  return event.segments.map((seg) => {
    const iso = scheduleById.get(seg.id) ?? event.startsAt
    const match = iso.match(/T(\d{2}:\d{2})/)
    return {
      id: seg.id,
      label: seg.label,
      desc: seg.desc,
      itemIds: [...(seg.itemIds ?? [])],
      videoItemId: seg.videoItemId ?? '',
      startTime: match?.[1] ?? '09:00',
    }
  })
}

const rows = ref<FlowRow[]>(data.value ? toRows(data.value.event) : [])
const title = ref(data.value?.event.title ?? '')
const saving = ref(false)
const message = ref('')
const error = ref('')
const selectedRow = ref(0)

watch(
  () => data.value?.event,
  (event) => {
    if (!event) return
    rows.value = toRows(event)
    title.value = event.title
  },
)

const libraryItems = computed(() => data.value?.library.items ?? [])
const videoItems = computed(() => libraryItems.value.filter((item) => item.kind === 'video'))
const attachableItems = computed(() =>
  libraryItems.value.filter((item) => item.kind !== 'video'),
)

const active = computed(() => rows.value[selectedRow.value] ?? null)

function itemById(id: string): LibraryItem | undefined {
  return libraryItems.value.find((item) => item.id === id)
}

function addSegment() {
  rows.value.push({
    id: `seg_${Date.now().toString(36)}`,
    label: 'New segment',
    desc: '',
    itemIds: [],
    videoItemId: '',
    startTime: rows.value.at(-1)?.startTime ?? '09:00',
  })
  selectedRow.value = rows.value.length - 1
}

function removeSegment(index: number) {
  if (rows.value.length <= 1) return
  rows.value.splice(index, 1)
  selectedRow.value = Math.max(0, Math.min(selectedRow.value, rows.value.length - 1))
}

function moveSegment(index: number, dir: -1 | 1) {
  const target = index + dir
  if (target < 0 || target >= rows.value.length) return
  const copy = [...rows.value]
  const [row] = copy.splice(index, 1)
  copy.splice(target, 0, row)
  rows.value = copy
  selectedRow.value = target
}

function toggleItem(itemId: string) {
  if (!active.value) return
  const set = new Set(active.value.itemIds)
  if (set.has(itemId)) set.delete(itemId)
  else set.add(itemId)
  active.value.itemIds = [...set]
}

function addItemAtEnd(itemId: string) {
  if (!active.value || active.value.itemIds.includes(itemId)) return
  active.value.itemIds = [...active.value.itemIds, itemId]
}

function removeItemFromSegment(itemId: string) {
  if (!active.value) return
  active.value.itemIds = active.value.itemIds.filter((id) => id !== itemId)
}

function moveItem(itemIndex: number, dir: -1 | 1) {
  if (!active.value) return
  const target = itemIndex + dir
  if (target < 0 || target >= active.value.itemIds.length) return
  const copy = [...active.value.itemIds]
  const [id] = copy.splice(itemIndex, 1)
  copy.splice(target, 0, id)
  active.value.itemIds = copy
}

async function saveFlow() {
  saving.value = true
  message.value = ''
  error.value = ''
  try {
    await $fetch(
      `/api/events/${orgSlug.value}/${venueSlug.value}/${eventSlug.value}/flow`,
      {
        method: 'PUT',
        body: {
          title: title.value,
          segments: rows.value.map((row) => ({
            id: row.id,
            label: row.label,
            desc: row.desc,
            itemIds: row.itemIds,
            videoItemId: row.videoItemId || undefined,
            startTime: row.startTime,
          })),
        },
      },
    )
    await refresh()
    message.value = 'Flow saved — guest snapshot updated.'
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Save failed'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div v-if="data" class="admin">
    <header class="top">
      <div>
        <NuxtLink class="back" :to="`/admin/o/${orgSlug}/v/${venueSlug}`">
          ← {{ data.venue.name }}
        </NuxtLink>
        <p class="kicker">Flow builder</p>
        <h1>{{ data.event.title }}</h1>
        <p class="lede">
          Group library items into segments and set start times. Guest phones use the resolved snapshot.
        </p>
      </div>
      <div class="toolbar">
        <NuxtLink class="btn ghost" :to="`/admin/o/${orgSlug}/items`">Item library</NuxtLink>
        <NuxtLink class="btn ghost" :to="`/v/${orgSlug}/${venueSlug}`">Guest view</NuxtLink>
        <button type="button" class="btn" :disabled="saving" @click="saveFlow">
          Save flow
        </button>
      </div>
    </header>

    <p v-if="message" class="ok">{{ message }}</p>
    <p v-if="error" class="error">{{ error }}</p>

    <label class="title-field">
      <span>Event title</span>
      <input v-model="title" type="text">
    </label>

    <div class="split">
      <section class="card">
        <div class="card-head">
          <h2>Segments</h2>
          <button type="button" class="btn sm" @click="addSegment">Add segment</button>
        </div>
        <ul class="seg-list">
          <li v-for="(row, index) in rows" :key="row.id" class="seg-li">
            <button
              type="button"
              class="seg-row"
              :class="{ selected: index === selectedRow }"
              @click="selectedRow = index"
            >
              <span class="idx">{{ String(index + 1).padStart(2, '0') }}</span>
              <span class="copy">
                <strong>{{ row.label || 'Untitled' }}</strong>
                <span class="meta">
                  {{ row.startTime }} · {{ row.itemIds.length }} item{{ row.itemIds.length === 1 ? '' : 's' }}
                  <template v-if="row.videoItemId"> · video</template>
                </span>
              </span>
            </button>
            <div class="seg-tools">
              <button type="button" class="icon" :disabled="index === 0" @click="moveSegment(index, -1)">↑</button>
              <button type="button" class="icon" :disabled="index === rows.length - 1" @click="moveSegment(index, 1)">↓</button>
              <button type="button" class="icon danger" :disabled="rows.length <= 1" @click="removeSegment(index)">×</button>
            </div>
          </li>
        </ul>
      </section>

      <section v-if="active" class="card editor">
        <div class="card-head">
          <h2>Edit segment</h2>
        </div>
        <div class="fields">
          <label>
            <span>Label</span>
            <input v-model="active.label" type="text">
          </label>
          <label>
            <span>Start time</span>
            <input v-model="active.startTime" type="time">
          </label>
          <label>
            <span>Description</span>
            <textarea v-model="active.desc" rows="3" />
          </label>
          <label>
            <span>Video item (optional)</span>
            <select v-model="active.videoItemId">
              <option value="">None</option>
              <option v-for="item in videoItems" :key="item.id" :value="item.id">
                {{ item.title }}
              </option>
            </select>
          </label>
        </div>

        <div class="block">
          <div class="card-head tight">
            <h3>Items in this segment</h3>
          </div>
          <p v-if="!active.itemIds.length" class="empty">No items yet — pick from the library below.</p>
          <ul class="picked">
            <li v-for="(itemId, itemIndex) in active.itemIds" :key="itemId">
              <span>
                <strong>{{ itemById(itemId)?.title ?? itemId }}</strong>
                <span class="meta">{{ itemById(itemId)?.kind }} · {{ itemById(itemId)?.meta }}</span>
              </span>
              <span class="picked-tools">
                <button type="button" class="icon" :disabled="itemIndex === 0" @click="moveItem(itemIndex, -1)">↑</button>
                <button type="button" class="icon" :disabled="itemIndex === active.itemIds.length - 1" @click="moveItem(itemIndex, 1)">↓</button>
                <button type="button" class="text-btn danger" @click="removeItemFromSegment(itemId)">Remove</button>
              </span>
            </li>
          </ul>
        </div>

        <div class="block">
          <div class="card-head tight">
            <h3>Library</h3>
            <NuxtLink class="text-btn" :to="`/admin/o/${orgSlug}/items`">Manage items</NuxtLink>
          </div>
          <ul class="library">
            <li v-for="item in attachableItems" :key="item.id">
              <button
                type="button"
                class="lib-row"
                :class="{ on: active.itemIds.includes(item.id) }"
                @click="toggleItem(item.id)"
              >
                <span class="kind">{{ item.kind }}</span>
                <span class="copy">
                  <strong>{{ item.title }}</strong>
                  <span class="meta">{{ item.meta || '—' }}</span>
                </span>
                <span class="mark">{{ active.itemIds.includes(item.id) ? '✓' : '+' }}</span>
              </button>
              <button
                v-if="!active.itemIds.includes(item.id)"
                type="button"
                class="text-btn"
                @click="addItemAtEnd(item.id)"
              >
                Add
              </button>
            </li>
          </ul>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.admin {
  width: min(1100px, 100%);
  margin: 0 auto;
  padding: 2rem 1.1rem 4rem;
}

.top {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.back {
  display: inline-block;
  margin-bottom: 0.55rem;
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
  margin: 0.2rem 0;
}

.lede {
  color: var(--ink-muted);
  max-width: 52ch;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
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
  cursor: pointer;
  text-decoration: none;
}

.btn.sm {
  font-size: 0.8rem;
  padding: 0.4rem 0.65rem;
}

.btn.ghost {
  background: var(--white);
  color: var(--teal-deep);
  border: 1px solid rgba(26, 107, 99, 0.18);
}

.btn:disabled {
  opacity: 0.5;
}

.ok {
  color: var(--teal);
  font-weight: 700;
  margin-bottom: 0.65rem;
}

.error {
  color: #9b3b2e;
  font-weight: 700;
  margin-bottom: 0.65rem;
}

.title-field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  margin-bottom: 0.9rem;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

.title-field input,
.fields input,
.fields select,
.fields textarea {
  font: inherit;
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: none;
  color: var(--ink);
  border: 1px solid rgba(26, 107, 99, 0.16);
  border-radius: 10px;
  padding: 0.6rem 0.7rem;
  background: var(--gray-wash);
}

.split {
  display: grid;
  grid-template-columns: minmax(260px, 0.85fr) minmax(0, 1.25fr);
  gap: 0.9rem;
  align-items: start;
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
  margin-bottom: 0.85rem;
}

.card-head.tight {
  margin-bottom: 0.55rem;
}

.card-head h2,
.card-head h3 {
  font-family: var(--font-display);
  color: var(--teal-deep);
}

.card-head h2 {
  font-size: 1.05rem;
}

.card-head h3 {
  font-size: 0.95rem;
}

.seg-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.seg-li {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.35rem;
}

.seg-row {
  display: flex;
  gap: 0.65rem;
  align-items: center;
  width: 100%;
  text-align: left;
  border: 1px solid rgba(26, 107, 99, 0.1);
  background: var(--gray-wash);
  border-radius: 11px;
  padding: 0.7rem 0.75rem;
  cursor: pointer;
}

.seg-row.selected {
  border-color: rgba(26, 107, 99, 0.35);
  box-shadow: 0 0 0 3px var(--teal-soft);
  background: #fff;
}

.idx {
  font-family: var(--font-display);
  font-size: 0.72rem;
  font-weight: 800;
  color: var(--ink-faint);
}

.copy {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
}

.copy strong {
  color: var(--teal-deep);
}

.meta {
  font-size: 0.75rem;
  color: var(--ink-faint);
  font-weight: 600;
}

.seg-tools,
.picked-tools {
  display: flex;
  gap: 0.2rem;
  align-items: center;
}

.icon {
  width: 1.85rem;
  height: 1.85rem;
  border-radius: 8px;
  border: 1px solid rgba(26, 107, 99, 0.16);
  background: #fff;
  cursor: pointer;
}

.icon.danger,
.text-btn.danger {
  color: #9b3b2e;
}

.icon:disabled {
  opacity: 0.35;
}

.fields {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.fields label {
  display: flex;
  flex-direction: column;
  gap: 0.28rem;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

.block {
  margin-top: 1.1rem;
  padding-top: 0.95rem;
  border-top: 1px solid rgba(26, 107, 99, 0.1);
}

.empty {
  font-size: 0.85rem;
  color: var(--ink-faint);
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.picked,
.library {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.picked > li {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.65rem 0.7rem;
  border-radius: 10px;
  background: var(--gray-wash);
  border: 1px solid rgba(26, 107, 99, 0.08);
}

.library > li {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.35rem;
  align-items: center;
}

.lib-row {
  display: flex;
  gap: 0.55rem;
  align-items: center;
  width: 100%;
  text-align: left;
  border: 1px solid rgba(26, 107, 99, 0.1);
  background: var(--gray-wash);
  border-radius: 10px;
  padding: 0.6rem 0.7rem;
  cursor: pointer;
}

.lib-row.on {
  border-color: rgba(26, 107, 99, 0.35);
  background: var(--teal-soft);
}

.kind {
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--teal);
  background: #fff;
  padding: 0.18rem 0.35rem;
  border-radius: 6px;
}

.mark {
  font-weight: 800;
  color: var(--teal-deep);
}

.text-btn {
  border: none;
  background: none;
  color: var(--teal);
  font-weight: 700;
  cursor: pointer;
  font-size: 0.8rem;
  text-decoration: none;
}

@media (max-width: 900px) {
  .split {
    grid-template-columns: 1fr;
  }
}
</style>
