<script setup lang="ts">
import type {
  EventRecord,
  ItemKind,
  ItemLibrary,
  LibraryItem,
  LibraryScope,
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
const router = useRouter()
const orgSlug = computed(() => String(route.params.org))
const venueSlug = computed(() => String(route.params.venue))
const eventSlug = computed(() => String(route.params.event))

const { data, refresh } = await useFetch<{
  organization: Organization
  venue: Venue
  event: EventRecord
  orgLibrary: ItemLibrary
  venueLibrary: ItemLibrary
  library: ItemLibrary
}>(() => `/api/events/${orgSlug.value}/${venueSlug.value}/${eventSlug.value}`)

const isReadOnly = computed(() => data.value?.event.status === 'ended')
const cloning = ref(false)
/** Mobile slide-over: segment fields or library. Desktop keeps the side panel always visible. */
const mobileSheet = ref<null | 'edit' | 'library'>(null)

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
const systemName = ref(data.value?.event.systemName ?? data.value?.event.title ?? '')
const title = ref(data.value?.event.title ?? '')
const saving = ref(false)
const message = ref('')
const error = ref('')
const selectedRow = ref(0)
const collapsedById = ref<Record<string, boolean>>({})
const libraryScope = ref<LibraryScope>('org')
const libraryKindFilter = ref<'all' | ItemKind>('all')
const librarySearch = ref('')
const showCreate = ref(false)
const creating = ref(false)
const createError = ref('')
const kinds: ItemKind[] = ['link', 'song', 'video', 'cta', 'resource']
const libraryFilterKinds: ItemKind[] = ['link', 'song', 'cta', 'resource']
const createDraft = ref({
  kind: 'link' as ItemKind,
  title: '',
  meta: '',
  href: '#',
  cta: false,
  caption: '',
  embedUrl: '',
})

function applyEventToEditor(event: EventRecord) {
  rows.value = toRows(event)
  systemName.value = event.systemName || event.title
  title.value = event.title
}

// Only re-sync the editor when a different event is loaded — not on every refresh,
// which was wiping in-progress / just-saved item order with stale fetch data.
watch(
  () => data.value?.event?.id,
  (id, prevId) => {
    const event = data.value?.event
    if (!event || !id || id === prevId) return
    applyEventToEditor(event)
  },
)

const orgItems = computed(() => data.value?.orgLibrary?.items ?? data.value?.library?.items ?? [])
const venueItems = computed(() => data.value?.venueLibrary?.items ?? [])
const scopedItems = computed(() =>
  libraryScope.value === 'venue' ? venueItems.value : orgItems.value,
)
const allItems = computed(() => {
  const map = new Map<string, LibraryItem>()
  for (const item of orgItems.value) map.set(item.id, item)
  for (const item of venueItems.value) map.set(item.id, item)
  return [...map.values()]
})
const videoItems = computed(() => allItems.value.filter((item) => item.kind === 'video'))

function matchesLibrarySearch(item: LibraryItem, query: string) {
  if (!query) return true
  return (
    item.title.toLowerCase().includes(query)
    || item.meta.toLowerCase().includes(query)
    || item.kind.includes(query)
    || item.href.toLowerCase().includes(query)
    || (item.tags ?? []).some((tag) => tag.toLowerCase().includes(query))
  )
}

const attachableItems = computed(() => {
  let list = scopedItems.value.filter((item) => item.kind !== 'video')
  if (libraryKindFilter.value !== 'all' && libraryKindFilter.value !== 'video') {
    list = list.filter((item) => item.kind === libraryKindFilter.value)
  }
  const q = librarySearch.value.trim().toLowerCase()
  return q ? list.filter((item) => matchesLibrarySearch(item, q)) : list
})
const manageItemsTo = computed(() =>
  libraryScope.value === 'venue'
    ? `/admin/o/${orgSlug.value}/items?venue=${venueSlug.value}`
    : `/admin/o/${orgSlug.value}/items`,
)

const active = computed(() => rows.value[selectedRow.value] ?? null)

function itemById(id: string): LibraryItem | undefined {
  return allItems.value.find((item) => item.id === id)
}

function resetCreateDraft() {
  createDraft.value = {
    kind: 'link',
    title: '',
    meta: '',
    href: '#',
    cta: false,
    caption: '',
    embedUrl: '',
  }
  createError.value = ''
}

function openCreate() {
  resetCreateDraft()
  showCreate.value = true
}

async function createLibraryItem() {
  if (!createDraft.value.title.trim()) {
    createError.value = 'Title is required'
    return
  }
  creating.value = true
  createError.value = ''
  try {
    const query = libraryScope.value === 'venue' ? `?venue=${venueSlug.value}` : ''
    const library = await $fetch<ItemLibrary>(`/api/orgs/${orgSlug.value}/items${query}`, {
      method: 'POST',
      body: {
        kind: createDraft.value.kind,
        title: createDraft.value.title,
        meta: createDraft.value.meta,
        href: createDraft.value.href,
        cta: createDraft.value.cta || createDraft.value.kind === 'cta',
        caption: createDraft.value.kind === 'video' ? createDraft.value.caption : undefined,
        embedUrl: createDraft.value.kind === 'video' ? createDraft.value.embedUrl : undefined,
      },
    })
    const created = library.items[library.items.length - 1]
    await refresh()
    if (created && created.kind !== 'video') addItemAtEnd(created.id)
    if (created?.kind === 'video' && active.value) active.value.videoItemId = created.id
    showCreate.value = false
    resetCreateDraft()
  } catch (e) {
    createError.value = e instanceof Error ? e.message : 'Create failed'
  } finally {
    creating.value = false
  }
}

function segmentItemCount(row: FlowRow) {
  return row.itemIds.length + (row.videoItemId ? 1 : 0)
}

function isCollapsed(id: string) {
  return Boolean(collapsedById.value[id])
}

const allCollapsed = computed(
  () => rows.value.length > 0 && rows.value.every((row) => isCollapsed(row.id)),
)

function toggleCollapsed(id: string) {
  collapsedById.value = {
    ...collapsedById.value,
    [id]: !collapsedById.value[id],
  }
}

function toggleAllCollapsed() {
  const next = !allCollapsed.value
  const map: Record<string, boolean> = {}
  for (const row of rows.value) map[row.id] = next
  collapsedById.value = map
}

function selectSegment(index: number) {
  selectedRow.value = index
  const row = rows.value[index]
  if (row) {
    collapsedById.value = {
      ...collapsedById.value,
      [row.id]: false,
    }
  }
}

function openMobileEdit(index: number) {
  selectSegment(index)
  mobileSheet.value = 'edit'
}

function openMobileLibrary(index: number) {
  selectSegment(index)
  mobileSheet.value = 'library'
}

async function backFromMobileSheet() {
  if (!isReadOnly.value) {
    await saveFlow()
    if (error.value) return
  }
  mobileSheet.value = null
}

watch(mobileSheet, (sheet) => {
  if (!import.meta.client) return
  document.body.style.overflow = sheet ? 'hidden' : ''
})

onBeforeUnmount(() => {
  if (import.meta.client) document.body.style.overflow = ''
})

function addSegment() {
  const id = `seg_${Date.now().toString(36)}`
  rows.value.push({
    id,
    label: 'New segment',
    desc: '',
    itemIds: [],
    videoItemId: '',
    startTime: rows.value.at(-1)?.startTime ?? '09:00',
  })
  selectedRow.value = rows.value.length - 1
  collapsedById.value = { ...collapsedById.value, [id]: false }
}

function removeSegment(index: number) {
  if (rows.value.length <= 1) return
  rows.value.splice(index, 1)
  selectedRow.value = Math.max(0, Math.min(selectedRow.value, rows.value.length - 1))
}

type DragPayload =
  | { kind: 'library'; itemId: string }
  | { kind: 'outline'; itemId: string; fromSeg: number; fromIndex: number }
  | { kind: 'segment'; fromIndex: number }

const DRAG_MIME = 'application/x-sfh-item'
const dragPayload = ref<DragPayload | null>(null)
const dropHint = ref<{ segIndex: number; insertIndex: number } | null>(null)
const segInsertHint = ref<number | null>(null)

function toggleItem(itemId: string) {
  const row = active.value
  if (!row) return
  const exists = row.itemIds.includes(itemId)
  rows.value[selectedRow.value] = {
    ...row,
    itemIds: exists
      ? row.itemIds.filter((id) => id !== itemId)
      : [...row.itemIds, itemId],
  }
}

function addItemAtEnd(itemId: string) {
  const row = active.value
  if (!row || row.itemIds.includes(itemId)) return
  rows.value[selectedRow.value] = {
    ...row,
    itemIds: [...row.itemIds, itemId],
  }
}

function removeItemFromSegment(segIndex: number, itemId: string) {
  const row = rows.value[segIndex]
  if (!row) return
  rows.value[segIndex] = {
    ...row,
    itemIds: row.itemIds.filter((id) => id !== itemId),
  }
}

function readDragPayload(event: DragEvent): DragPayload | null {
  const raw = event.dataTransfer?.getData(DRAG_MIME) || event.dataTransfer?.getData('text/plain')
  if (!raw) return dragPayload.value
  try {
    return JSON.parse(raw) as DragPayload
  } catch {
    return dragPayload.value
  }
}

function onLibraryDragStart(event: DragEvent, itemId: string) {
  const payload: DragPayload = { kind: 'library', itemId }
  dragPayload.value = payload
  event.dataTransfer?.setData(DRAG_MIME, JSON.stringify(payload))
  event.dataTransfer?.setData('text/plain', JSON.stringify(payload))
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copyMove'
}

function onOutlineDragStart(event: DragEvent, segIndex: number, itemIndex: number, itemId: string) {
  selectedRow.value = segIndex
  const payload: DragPayload = { kind: 'outline', itemId, fromSeg: segIndex, fromIndex: itemIndex }
  dragPayload.value = payload
  segInsertHint.value = null
  event.dataTransfer?.setData(DRAG_MIME, JSON.stringify(payload))
  event.dataTransfer?.setData('text/plain', JSON.stringify(payload))
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

function onSegmentDragStart(event: DragEvent, fromIndex: number) {
  const payload: DragPayload = { kind: 'segment', fromIndex }
  dragPayload.value = payload
  dropHint.value = null
  event.dataTransfer?.setData(DRAG_MIME, JSON.stringify(payload))
  event.dataTransfer?.setData('text/plain', JSON.stringify(payload))
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
  event.stopPropagation()
}

function onDragEnd() {
  dragPayload.value = null
  dropHint.value = null
  segInsertHint.value = null
}

function setDropHint(segIndex: number, insertIndex: number, event: DragEvent) {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = dragPayload.value?.kind === 'library' ? 'copy' : 'move'
  }
  dropHint.value = { segIndex, insertIndex }
  segInsertHint.value = null
}

function onNestedItemDragOver(event: DragEvent, segIndex: number, itemIndex: number) {
  if (dragPayload.value?.kind === 'segment') return
  event.stopPropagation()
  const el = event.currentTarget as HTMLElement
  const rect = el.getBoundingClientRect()
  const insertIndex = event.clientY < rect.top + rect.height / 2 ? itemIndex : itemIndex + 1
  setDropHint(segIndex, insertIndex, event)
}

function onNestedListDragOver(event: DragEvent, segIndex: number) {
  if (dragPayload.value?.kind === 'segment') return
  const target = event.target as HTMLElement | null
  // Keep the mid-list insert indicator if we're over an existing drop line.
  if (target?.closest('.drop-line')) {
    event.preventDefault()
    return
  }
  // Nested item handlers own mid-list placement; don't let the list reset to "append".
  if (target?.closest('.nested-item:not(.empty):not(.drop-zone):not(.video)')) return
  if (target?.closest('.nested-item.video')) {
    setDropHint(segIndex, 0, event)
    return
  }
  const row = rows.value[segIndex]
  setDropHint(segIndex, row?.itemIds.length ?? 0, event)
}

function onSegmentDragOver(event: DragEvent, index: number) {
  if (dragPayload.value?.kind !== 'segment') return
  event.preventDefault()
  event.stopPropagation()
  const el = event.currentTarget as HTMLElement
  const rect = el.getBoundingClientRect()
  segInsertHint.value = event.clientY < rect.top + rect.height / 2 ? index : index + 1
  dropHint.value = null
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
}

function reorderSegment(fromIndex: number, insertIndex: number) {
  if (fromIndex === insertIndex || fromIndex + 1 === insertIndex) return
  const copy = [...rows.value]
  const [row] = copy.splice(fromIndex, 1)
  if (!row) return
  let target = insertIndex
  if (fromIndex < target) target -= 1
  target = Math.max(0, Math.min(target, copy.length))
  copy.splice(target, 0, row)
  rows.value = copy
  selectedRow.value = target
}

function onSegmentDrop(event: DragEvent, index: number) {
  const payload = readDragPayload(event)
  if (payload?.kind !== 'segment') return
  event.preventDefault()
  event.stopPropagation()
  const insertIndex = segInsertHint.value
    ?? (() => {
      const el = event.currentTarget as HTMLElement
      const rect = el.getBoundingClientRect()
      return event.clientY < rect.top + rect.height / 2 ? index : index + 1
    })()
  reorderSegment(payload.fromIndex, insertIndex)
  onDragEnd()
}

function onSegLiDragOver(event: DragEvent, index: number) {
  if (dragPayload.value?.kind === 'segment') {
    onSegmentDragOver(event, index)
    return
  }
  const row = rows.value[index]
  if (row && isCollapsed(row.id)) onNestedListDragOver(event, index)
}

function onSegLiDrop(event: DragEvent, index: number) {
  const payload = readDragPayload(event) ?? dragPayload.value
  if (payload?.kind === 'segment') {
    onSegmentDrop(event, index)
    return
  }
  const row = rows.value[index]
  if (row && isCollapsed(row.id)) onNestedDrop(index, event)
}

function isSegDropLine(insertIndex: number) {
  return segInsertHint.value === insertIndex
}

function insertItemAt(segIndex: number, insertIndex: number, itemId: string) {
  const row = rows.value[segIndex]
  if (!row) return
  const next = [...row.itemIds]
  const existing = next.indexOf(itemId)
  let target = insertIndex
  if (existing !== -1) {
    next.splice(existing, 1)
    if (existing < target) target -= 1
  }
  target = Math.max(0, Math.min(target, next.length))
  next.splice(target, 0, itemId)
  // Replace the row so Vue always sees a new itemIds reference.
  rows.value[segIndex] = { ...row, itemIds: next }
}

function applyDrop(segIndex: number, insertIndex: number, event: DragEvent) {
  event.preventDefault()
  const payload = readDragPayload(event)
  dropHint.value = null
  segInsertHint.value = null
  dragPayload.value = null
  if (!payload || payload.kind === 'segment') return

  selectSegment(segIndex)

  if (payload.kind === 'library') {
    insertItemAt(segIndex, insertIndex, payload.itemId)
    return
  }

  const source = rows.value[payload.fromSeg]
  if (!source) return

  if (payload.fromSeg === segIndex) {
    insertItemAt(segIndex, insertIndex, payload.itemId)
    return
  }

  source.itemIds = source.itemIds.filter((id) => id !== payload.itemId)
  insertItemAt(segIndex, insertIndex, payload.itemId)
}

function onNestedDrop(segIndex: number, event: DragEvent) {
  event.stopPropagation()
  const hint = dropHint.value
  const insertIndex = hint?.segIndex === segIndex
    ? hint.insertIndex
    : (rows.value[segIndex]?.itemIds.length ?? 0)
  applyDrop(segIndex, insertIndex, event)
}

function isDropLine(segIndex: number, insertIndex: number) {
  return dropHint.value?.segIndex === segIndex && dropHint.value.insertIndex === insertIndex
}

async function cloneFlow() {
  cloning.value = true
  message.value = ''
  error.value = ''
  try {
    const result = await $fetch<{ event: EventRecord; path: string }>(
      `/api/events/${orgSlug.value}/${venueSlug.value}/${eventSlug.value}/clone`,
      { method: 'POST' },
    )
    await router.push(result.path)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Clone failed'
  } finally {
    cloning.value = false
  }
}

async function saveFlow() {
  if (isReadOnly.value) {
    error.value = 'Past events are read-only. Clone the flow to edit.'
    return
  }
  saving.value = true
  message.value = ''
  error.value = ''
  try {
    const updated = await $fetch<EventRecord>(
      `/api/events/${orgSlug.value}/${venueSlug.value}/${eventSlug.value}/flow`,
      {
        method: 'PUT',
        body: {
          systemName: systemName.value,
          title: title.value,
          segments: rows.value.map((row) => ({
            id: row.id,
            label: row.label,
            desc: row.desc,
            itemIds: [...row.itemIds],
            videoItemId: row.videoItemId || undefined,
            startTime: row.startTime,
          })),
        },
      },
    )
    applyEventToEditor(updated)
    if (data.value) data.value.event = updated
    // Refresh libraries only; avoid clobbering editor rows with a cached event GET.
    await refresh()
    if (data.value) data.value.event = updated
    applyEventToEditor(updated)
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
        <p class="kicker">{{ isReadOnly ? 'Past flow' : 'Flow builder' }}</p>
        <h1>{{ systemName || data.event.systemName }}</h1>
        <p class="lede">
          <template v-if="isReadOnly">
            This past flow is read-only. Clone it to make changes.
          </template>
          <template v-else>
            Group library items into segments and set start times. Guests see the display name below.
          </template>
        </p>
      </div>
      <div class="toolbar">
        <NuxtLink class="btn ghost" :to="`/v/${orgSlug}/${venueSlug}`">Guest view</NuxtLink>
        <button
          type="button"
          class="btn ghost"
          :disabled="cloning"
          @click="cloneFlow"
        >
          {{ cloning ? 'Cloning…' : 'Clone' }}
        </button>
        <button
          v-if="!isReadOnly"
          type="button"
          class="btn"
          :disabled="saving"
          @click="saveFlow"
        >
          Save flow
        </button>
      </div>
    </header>

    <p v-if="isReadOnly" class="readonly-banner">
      Past events stay available for reference and cloning, but can’t be edited.
    </p>
    <p v-if="message" class="ok">{{ message }}</p>
    <p v-if="error" class="error">{{ error }}</p>

    <div class="name-fields">
      <label class="title-field">
        <span>System name</span>
        <input v-model="systemName" type="text" placeholder="City Sun 9:00" :disabled="isReadOnly">
      </label>
      <label class="title-field">
        <span>Guest display name</span>
        <input v-model="title" type="text" placeholder="Sunday 9:00" :disabled="isReadOnly">
      </label>
    </div>

    <div class="split" :class="{ readonly: isReadOnly }">
      <section class="card">
        <div class="card-head">
          <h2>Segments</h2>
          <div class="seg-head-actions">
            <button
              type="button"
              class="text-btn"
              :disabled="!rows.length"
              @click="toggleAllCollapsed"
            >
              {{ allCollapsed ? 'Expand all' : 'Collapse all' }}
            </button>
            <button type="button" class="btn sm" @click="addSegment">Add segment</button>
          </div>
        </div>
        <p class="hint desktop-only">Drag segments or items to reorder. Drag library items onto a segment to add them.</p>
        <p class="hint mobile-only mobile-hint">Edit a section for details, or add items from the library.</p>
        <ul class="seg-list">
          <li v-if="isSegDropLine(0)" class="seg-drop-line" aria-hidden="true" />
          <template v-for="(row, index) in rows" :key="row.id">
          <li
            class="seg-li"
            :class="{
              selected: index === selectedRow,
              collapsed: isCollapsed(row.id),
              dragging: dragPayload?.kind === 'segment' && dragPayload.fromIndex === index,
              'drop-active': dropHint?.segIndex === index,
            }"
            @dragover="onSegLiDragOver($event, index)"
            @drop="onSegLiDrop($event, index)"
          >
            <div class="seg-header">
              <span
                class="drag-handle seg-drag"
                draggable="true"
                title="Drag to reorder segment"
                @dragstart="onSegmentDragStart($event, index)"
                @dragend="onDragEnd"
              >⋮⋮</span>
              <button
                type="button"
                class="collapse-btn"
                :aria-expanded="!isCollapsed(row.id)"
                :aria-label="isCollapsed(row.id) ? 'Expand segment' : 'Collapse segment'"
                @click="toggleCollapsed(row.id)"
              >
                {{ isCollapsed(row.id) ? '▸' : '▾' }}
              </button>
              <button
                type="button"
                class="seg-row"
                @click="selectSegment(index)"
              >
                <span class="idx">{{ String(index + 1).padStart(2, '0') }}</span>
                <span class="copy">
                  <strong>
                    {{ row.label || 'Untitled' }}
                    <span class="count-badge" :title="`${segmentItemCount(row)} items`">
                      {{ segmentItemCount(row) }}
                    </span>
                  </strong>
                  <span class="meta">{{ row.startTime }}</span>
                </span>
              </button>
              <div class="seg-tools">
                <button
                  type="button"
                  class="text-btn mobile-only"
                  :disabled="isReadOnly"
                  @click="openMobileEdit(index)"
                >
                  Edit
                </button>
                <button type="button" class="icon danger" :disabled="rows.length <= 1 || isReadOnly" @click="removeSegment(index)">×</button>
              </div>
            </div>

            <ul
              v-show="!isCollapsed(row.id)"
              class="nested-items"
              @click="selectSegment(index)"
              @dragover="onNestedListDragOver($event, index)"
              @drop="onNestedDrop(index, $event)"
            >
              <li
                v-if="row.videoItemId"
                class="nested-item video"
                @dragover="setDropHint(index, 0, $event)"
                @drop="onNestedDrop(index, $event)"
              >
                <span class="nested-kind">video</span>
                <span class="nested-title">{{ itemById(row.videoItemId)?.title ?? row.videoItemId }}</span>
              </li>

              <li
                v-if="isDropLine(index, 0)"
                class="drop-line"
                aria-hidden="true"
              />

              <template v-for="(itemId, itemIndex) in row.itemIds" :key="itemId">
                <li
                  class="nested-item"
                  :class="{ dragging: dragPayload?.kind === 'outline' && dragPayload.itemId === itemId }"
                  draggable="true"
                  @dragstart="onOutlineDragStart($event, index, itemIndex, itemId)"
                  @dragend="onDragEnd"
                  @dragover.prevent="onNestedItemDragOver($event, index, itemIndex)"
                  @drop.prevent="onNestedDrop(index, $event)"
                >
                  <span class="drag-handle" aria-hidden="true">⋮⋮</span>
                  <span class="nested-kind">{{ itemById(itemId)?.kind ?? 'item' }}</span>
                  <span class="nested-title">{{ itemById(itemId)?.title ?? itemId }}</span>
                  <button
                    type="button"
                    class="icon danger nested-remove"
                    @click.stop="removeItemFromSegment(index, itemId)"
                  >
                    ×
                  </button>
                </li>
                <li
                  v-if="isDropLine(index, itemIndex + 1)"
                  class="drop-line"
                  aria-hidden="true"
                />
              </template>

              <li
                v-if="!row.itemIds.length && !row.videoItemId"
                class="nested-item empty drop-zone"
              >
                Drop items here
              </li>
            </ul>

            <div
              v-show="!isCollapsed(row.id)"
              class="seg-footer mobile-only"
            >
              <button
                type="button"
                class="btn ghost sm add-item-btn"
                :disabled="isReadOnly"
                @click="openMobileLibrary(index)"
              >
                Add item
              </button>
            </div>
          </li>
          <li
            v-if="isSegDropLine(index + 1)"
            class="seg-drop-line"
            aria-hidden="true"
          />
          </template>
        </ul>
      </section>

      <div class="side" :class="{ open: Boolean(mobileSheet) }">
        <div class="sheet-bar mobile-only">
          <button type="button" class="btn ghost sm" :disabled="saving" @click="backFromMobileSheet">
            {{ saving ? 'Saving…' : '← Back' }}
          </button>
          <h2>
            <template v-if="mobileSheet === 'edit'">Edit segment</template>
            <template v-else-if="mobileSheet === 'library'">Add item</template>
          </h2>
        </div>

        <section v-if="active && mobileSheet !== 'library'" class="card editor">
          <div class="card-head desktop-only">
            <h2>Edit segment</h2>
          </div>
          <div class="fields">
            <label>
              <span>Label</span>
              <input v-model="active.label" type="text" :disabled="isReadOnly">
            </label>
            <label>
              <span>Start time</span>
              <input v-model="active.startTime" type="time" :disabled="isReadOnly">
            </label>
            <label>
              <span>Description</span>
              <textarea v-model="active.desc" rows="3" :disabled="isReadOnly" />
            </label>
            <label>
              <span>Video item (optional)</span>
              <select v-model="active.videoItemId" :disabled="isReadOnly">
                <option value="">None</option>
                <option v-for="item in videoItems" :key="item.id" :value="item.id">
                  {{ item.title }}
                </option>
              </select>
            </label>
          </div>
        </section>

        <section v-if="mobileSheet !== 'edit'" class="card library-card">
          <div class="card-head">
            <h2 class="desktop-only">Library</h2>
            <div class="lib-actions">
              <button type="button" class="text-btn" :disabled="isReadOnly" @click="openCreate">Create new</button>
              <NuxtLink class="text-btn" :to="manageItemsTo">Manage items</NuxtLink>
            </div>
          </div>

          <div class="lib-filters">
            <label class="scope-field">
              <span>Show items from</span>
              <select v-model="libraryScope">
                <option value="org">Organization shared</option>
                <option value="venue">{{ data.venue.name }} campus</option>
              </select>
            </label>
            <label class="scope-field">
              <span>Type</span>
              <select v-model="libraryKindFilter">
                <option value="all">All types</option>
                <option v-for="kind in libraryFilterKinds" :key="kind" :value="kind">
                  {{ kind }}
                </option>
              </select>
            </label>
            <label class="scope-field lib-search-field">
              <span>Search</span>
              <input
                v-model="librarySearch"
                type="search"
                placeholder="Search title, meta, tags…"
              >
            </label>
          </div>

          <div v-if="showCreate" class="create-panel">
            <div class="card-head tight">
              <h3>New {{ libraryScope === 'venue' ? 'campus' : 'shared' }} item</h3>
              <button type="button" class="text-btn" @click="showCreate = false">Cancel</button>
            </div>
            <p v-if="createError" class="error">{{ createError }}</p>
            <div class="create-fields">
              <label>
                <span>Kind</span>
                <select v-model="createDraft.kind">
                  <option v-for="kind in kinds" :key="kind" :value="kind">{{ kind }}</option>
                </select>
              </label>
              <label>
                <span>Title</span>
                <input v-model="createDraft.title" type="text" placeholder="Item title">
              </label>
              <label>
                <span>Meta</span>
                <input v-model="createDraft.meta" type="text" placeholder="Subtitle / writer">
              </label>
              <label>
                <span>URL</span>
                <input v-model="createDraft.href" type="text" placeholder="#">
              </label>
              <label class="check">
                <input v-model="createDraft.cta" type="checkbox">
                <span>Primary CTA</span>
              </label>
              <template v-if="createDraft.kind === 'video'">
                <label>
                  <span>Caption</span>
                  <input v-model="createDraft.caption" type="text">
                </label>
                <label>
                  <span>Embed URL</span>
                  <input v-model="createDraft.embedUrl" type="text">
                </label>
              </template>
              <button type="button" class="btn sm" :disabled="creating" @click="createLibraryItem">
                {{ creating ? 'Creating…' : 'Create & add' }}
              </button>
            </div>
          </div>

          <p class="hint desktop-only">Drag an item onto a segment in the outline.</p>
          <p class="hint mobile-only mobile-hint">
            Tap an item to add it to
            <strong>{{ active?.label || 'this segment' }}</strong>.
          </p>
          <p v-if="!attachableItems.length" class="empty">
            {{ librarySearch.trim()
              ? 'No items match your search.'
              : `No ${libraryScope === 'venue' ? 'campus' : 'shared'}${libraryKindFilter === 'all' ? '' : ` ${libraryKindFilter}`} items yet.` }}
          </p>
          <ul class="library">
            <li
              v-for="item in attachableItems"
              :key="item.id"
              draggable="true"
              @dragstart="onLibraryDragStart($event, item.id)"
              @dragend="onDragEnd"
            >
              <button
                type="button"
                class="lib-row"
                :class="{ on: active?.itemIds.includes(item.id) }"
                @click="toggleItem(item.id)"
              >
                <span class="drag-handle" aria-hidden="true">⋮⋮</span>
                <span class="kind">{{ item.kind }}</span>
                <span class="copy">
                  <strong>{{ item.title }}</strong>
                  <span class="meta">{{ item.meta || '—' }}</span>
                </span>
                <span class="mark">{{ active?.itemIds.includes(item.id) ? '✓' : '+' }}</span>
              </button>
            </li>
          </ul>
        </section>
      </div>
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

.readonly-banner {
  margin: 0 0 0.75rem;
  padding: 0.7rem 0.85rem;
  border-radius: 10px;
  background: var(--teal-soft);
  color: var(--teal-deep);
  font-size: 0.88rem;
  font-weight: 600;
}

.title-field input:disabled {
  opacity: 0.75;
  cursor: not-allowed;
}

.name-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.65rem;
  margin-bottom: 0.9rem;
}

.title-field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  margin-bottom: 0;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

@media (max-width: 700px) {
  .name-fields {
    grid-template-columns: 1fr;
  }
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
  grid-template-columns: minmax(300px, 1.15fr) minmax(280px, 0.95fr);
  gap: 0.9rem;
  align-items: start;
}

.split.readonly {
  pointer-events: none;
  opacity: 0.82;
}

.split.readonly .seg-toggle {
  pointer-events: auto;
}

.side {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.hint {
  margin: -0.35rem 0 0.75rem;
  font-size: 0.8rem;
  color: var(--ink-faint);
  font-weight: 600;
}

.lib-filters {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.55rem;
  margin-bottom: 0.35rem;
}

.lib-filters .scope-field {
  margin-bottom: 0;
}

.lib-search-field {
  grid-column: 1 / -1;
}

.scope-field input[type='search'] {
  font: inherit;
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: none;
  color: var(--ink);
  border: 1px solid rgba(26, 107, 99, 0.16);
  border-radius: 10px;
  padding: 0.55rem 0.65rem;
  background: var(--gray-wash);
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

.seg-head-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.seg-head-actions .text-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.card-head h3 {
  font-size: 0.95rem;
}

.lib-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.scope-field {
  display: flex;
  flex-direction: column;
  gap: 0.28rem;
  margin-bottom: 0.75rem;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

.scope-field select,
.create-fields input,
.create-fields select {
  font: inherit;
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: none;
  color: var(--ink);
  border: 1px solid rgba(26, 107, 99, 0.16);
  border-radius: 10px;
  padding: 0.55rem 0.65rem;
  background: var(--gray-wash);
}

.create-panel {
  margin-bottom: 0.85rem;
  padding: 0.75rem;
  border-radius: 12px;
  background: var(--gray-wash);
  border: 1px solid rgba(26, 107, 99, 0.12);
}

.create-fields {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.create-fields label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

.create-fields .check {
  flex-direction: row;
  align-items: center;
  gap: 0.45rem;
  text-transform: none;
  letter-spacing: 0;
  font-size: 0.85rem;
  color: var(--ink);
}

.seg-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.seg-li {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.55rem 0.55rem 0.6rem;
  border: 1px solid rgba(26, 107, 99, 0.1);
  background: var(--gray-wash);
  border-radius: 12px;
}

.seg-li.selected {
  border-color: rgba(26, 107, 99, 0.35);
  box-shadow: 0 0 0 3px var(--teal-soft);
  background: #fff;
}

.seg-header {
  display: grid;
  grid-template-columns: auto auto 1fr auto;
  gap: 0.25rem;
  align-items: center;
}

.seg-drag {
  cursor: grab;
  padding: 0.2rem 0.15rem;
}

.seg-li.dragging {
  opacity: 0.45;
}

.seg-drop-line {
  height: 3px;
  margin: 0.05rem 0;
  border-radius: 999px;
  background: var(--teal);
  list-style: none;
}

.collapse-btn {
  width: 1.7rem;
  height: 1.7rem;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--ink-faint);
  font-size: 0.85rem;
  line-height: 1;
  cursor: pointer;
}

.collapse-btn:hover {
  background: rgba(26, 107, 99, 0.08);
  color: var(--teal-deep);
}

.seg-row {
  display: flex;
  gap: 0.65rem;
  align-items: center;
  width: 100%;
  text-align: left;
  border: none;
  background: transparent;
  padding: 0.2rem 0.2rem;
  cursor: pointer;
  min-width: 0;
}

.seg-row strong {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 0;
}

.count-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.25rem;
  height: 1.25rem;
  padding: 0 0.35rem;
  border-radius: 999px;
  background: var(--teal-soft);
  color: var(--teal-deep);
  font-family: var(--font-sans, inherit);
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0;
  line-height: 1;
}

.nested-items {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.28rem;
  margin: 0 0 0 1.85rem;
  padding: 0;
}

.seg-li.drop-active {
  border-color: rgba(26, 107, 99, 0.45);
  background: rgba(26, 107, 99, 0.04);
}

.nested-item {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.28rem 0.4rem 0.28rem 0.5rem;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(26, 107, 99, 0.08);
  cursor: grab;
}

.nested-item.dragging {
  opacity: 0.45;
}

.nested-item.video {
  background: rgba(13, 63, 60, 0.06);
  cursor: default;
}

.nested-item.empty,
.nested-item.drop-zone {
  color: var(--ink-faint);
  font-size: 0.75rem;
  font-weight: 600;
  border-style: dashed;
  cursor: copy;
  justify-content: center;
}

.drop-line {
  height: 3px;
  margin: 0.05rem 0;
  border-radius: 999px;
  background: var(--teal);
  list-style: none;
}

.drag-handle {
  color: var(--ink-faint);
  font-size: 0.7rem;
  letter-spacing: -0.08em;
  user-select: none;
  flex: 0 0 auto;
}

.nested-remove {
  margin-left: auto;
  width: 1.55rem;
  height: 1.55rem;
  font-size: 0.72rem;
}

.nested-kind {
  flex: 0 0 auto;
  font-size: 0.58rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--teal);
  background: var(--teal-soft);
  padding: 0.14rem 0.32rem;
  border-radius: 5px;
}

.nested-title {
  flex: 1;
  font-size: 0.82rem;
  font-weight: 650;
  color: var(--ink);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

.seg-tools {
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

.empty {
  font-size: 0.85rem;
  color: var(--ink-faint);
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.library {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.library > li {
  cursor: grab;
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

.mobile-only {
  display: none;
}

.sheet-bar {
  display: none;
}

.seg-footer {
  padding: 0.55rem 0.65rem 0.15rem;
}

.add-item-btn {
  width: 100%;
}

@media (max-width: 900px) {
  .split {
    grid-template-columns: 1fr;
  }

  .lib-filters {
    grid-template-columns: 1fr;
  }

  .desktop-only {
    display: none !important;
  }

  .mobile-only {
    display: revert;
  }

  .seg-footer.mobile-only {
    display: block;
  }

  .seg-tools .mobile-only {
    display: inline-flex;
    align-items: center;
  }

  /* Keep edit/library out of the main mobile scroll — only the slide-over. */
  .side:not(.open) {
    display: none !important;
  }

  .side.open {
    position: fixed;
    inset: 0;
    z-index: 60;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin: 0;
    padding: 0.85rem 1rem 1.5rem;
    background: var(--gray-wash);
    overflow: auto;
    animation: sheet-in 0.28s var(--ease);
  }

  @keyframes sheet-in {
    from {
      transform: translateX(100%);
    }
    to {
      transform: translateX(0);
    }
  }

  .sheet-bar {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    position: sticky;
    top: 0;
    z-index: 2;
    margin: -0.85rem -1rem 0;
    padding: 0.75rem 1rem;
    background: var(--white);
    border-bottom: 1px solid rgba(26, 107, 99, 0.12);
  }

  .sheet-bar h2 {
    margin: 0;
    font-family: var(--font-display);
    font-size: 1.05rem;
    color: var(--teal-deep);
  }

  .mobile-hint {
    display: block;
  }
}
</style>
