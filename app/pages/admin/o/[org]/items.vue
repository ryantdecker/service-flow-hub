<script setup lang="ts">
import type { ItemKind, ItemLibrary, LibraryItem, Organization } from '~~/shared/types'

const route = useRoute()
const orgSlug = computed(() => String(route.params.org))

const { data, refresh } = await useFetch<{ organization: Organization; library: ItemLibrary }>(
  () => `/api/orgs/${orgSlug.value}/items`,
)

const kinds: ItemKind[] = ['link', 'song', 'video', 'cta', 'resource']
const filter = ref('')
const editing = ref<LibraryItem | null>(null)
const draft = ref({
  id: '',
  kind: 'link' as ItemKind,
  title: '',
  meta: '',
  href: '#',
  cta: false,
  caption: '',
  embedUrl: '',
  tags: '',
})
const saving = ref(false)
const error = ref('')

const items = computed(() => {
  const list = data.value?.library.items ?? []
  const q = filter.value.trim().toLowerCase()
  if (!q) return list
  return list.filter(
    (item) =>
      item.title.toLowerCase().includes(q)
      || item.meta.toLowerCase().includes(q)
      || item.kind.includes(q)
      || (item.tags ?? []).some((tag) => tag.toLowerCase().includes(q)),
  )
})

function openNew() {
  editing.value = null
  draft.value = {
    id: '',
    kind: 'link',
    title: '',
    meta: '',
    href: '#',
    cta: false,
    caption: '',
    embedUrl: '',
    tags: '',
  }
}

function openEdit(item: LibraryItem) {
  editing.value = item
  draft.value = {
    id: item.id,
    kind: item.kind,
    title: item.title,
    meta: item.meta,
    href: item.href,
    cta: Boolean(item.cta),
    caption: item.caption ?? '',
    embedUrl: item.embedUrl ?? '',
    tags: (item.tags ?? []).join(', '),
  }
}

async function saveItem() {
  if (!draft.value.title.trim()) {
    error.value = 'Title is required'
    return
  }
  saving.value = true
  error.value = ''
  try {
    await $fetch(`/api/orgs/${orgSlug.value}/items`, {
      method: 'POST',
      body: {
        id: draft.value.id || undefined,
        kind: draft.value.kind,
        title: draft.value.title,
        meta: draft.value.meta,
        href: draft.value.href,
        cta: draft.value.cta || draft.value.kind === 'cta',
        caption: draft.value.kind === 'video' ? draft.value.caption : undefined,
        embedUrl: draft.value.kind === 'video' ? draft.value.embedUrl : undefined,
        tags: draft.value.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
      },
    })
    await refresh()
    openNew()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Save failed'
  } finally {
    saving.value = false
  }
}

async function removeItem(item: LibraryItem) {
  if (!confirm(`Delete “${item.title}”?`)) return
  await $fetch(`/api/orgs/${orgSlug.value}/items/${item.id}`, { method: 'DELETE' })
  await refresh()
  if (editing.value?.id === item.id) openNew()
}
</script>

<template>
  <div v-if="data" class="admin">
    <header class="top">
      <div>
        <NuxtLink class="back" :to="`/admin/o/${orgSlug}`">← {{ data.organization.name }}</NuxtLink>
        <p class="kicker">Item library</p>
        <h1>Add & edit items</h1>
        <p class="lede">
          Reusable links, songs, videos, and CTAs. Use them later in the flow builder.
        </p>
      </div>
      <NuxtLink class="btn ghost" :to="`/admin/o/${orgSlug}`">Done</NuxtLink>
    </header>

    <div class="split">
      <section class="card">
        <div class="card-head">
          <h2>{{ editing ? 'Edit item' : 'New item' }}</h2>
          <button v-if="editing" type="button" class="text-btn" @click="openNew">Clear</button>
        </div>
        <p v-if="error" class="error">{{ error }}</p>
        <div class="fields">
          <label>
            <span>Kind</span>
            <select v-model="draft.kind">
              <option v-for="kind in kinds" :key="kind" :value="kind">{{ kind }}</option>
            </select>
          </label>
          <label>
            <span>Title</span>
            <input v-model="draft.title" type="text" placeholder="Campus map">
          </label>
          <label>
            <span>Meta / writer</span>
            <input v-model="draft.meta" type="text" placeholder="City Campus · parking">
          </label>
          <label>
            <span>URL</span>
            <input v-model="draft.href" type="text" placeholder="#">
          </label>
          <label class="check">
            <input v-model="draft.cta" type="checkbox">
            <span>Primary CTA styling</span>
          </label>
          <template v-if="draft.kind === 'video'">
            <label>
              <span>Caption</span>
              <input v-model="draft.caption" type="text" placeholder="Tap play to re-watch">
            </label>
            <label>
              <span>Embed URL</span>
              <input v-model="draft.embedUrl" type="text" placeholder="https://…">
            </label>
          </template>
          <label>
            <span>Tags (comma-separated)</span>
            <input v-model="draft.tags" type="text" placeholder="welcome, city">
          </label>
          <button type="button" class="btn" :disabled="saving" @click="saveItem">
            {{ editing ? 'Update item' : 'Add item' }}
          </button>
        </div>
      </section>

      <section class="card">
        <div class="card-head">
          <h2>{{ items.length }} items</h2>
          <input v-model="filter" class="search" type="search" placeholder="Filter…">
        </div>
        <ul class="item-list">
          <li v-for="item in items" :key="item.id">
            <button type="button" class="item-row" @click="openEdit(item)">
              <span class="kind">{{ item.kind }}</span>
              <span class="copy">
                <strong>{{ item.title }}</strong>
                <span class="meta">{{ item.meta || 'No meta' }}</span>
              </span>
            </button>
            <button type="button" class="text-btn danger" @click="removeItem(item)">Delete</button>
          </li>
        </ul>
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
  margin-bottom: 1.25rem;
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
  max-width: 48ch;
}

.split {
  display: grid;
  grid-template-columns: minmax(280px, 0.9fr) minmax(0, 1.2fr);
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

.card-head h2 {
  font-family: var(--font-display);
  color: var(--teal-deep);
  font-size: 1.05rem;
}

.fields {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

label {
  display: flex;
  flex-direction: column;
  gap: 0.28rem;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

label input,
label select,
.search {
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

.check {
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
  text-transform: none;
  letter-spacing: 0;
  font-size: 0.88rem;
  color: var(--ink);
}

.btn {
  display: inline-flex;
  justify-content: center;
  padding: 0.6rem 0.9rem;
  border: none;
  border-radius: 10px;
  background: var(--teal);
  color: #fff;
  font-weight: 700;
  cursor: pointer;
  text-decoration: none;
}

.btn.ghost {
  background: var(--white);
  color: var(--teal-deep);
  border: 1px solid rgba(26, 107, 99, 0.18);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.text-btn {
  border: none;
  background: none;
  color: var(--teal);
  font-weight: 700;
  cursor: pointer;
  font-size: 0.8rem;
}

.text-btn.danger {
  color: #9b3b2e;
}

.error {
  color: #9b3b2e;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.item-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  max-height: 70vh;
  overflow: auto;
}

.item-list > li {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.4rem;
  align-items: center;
}

.item-row {
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

.kind {
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--teal);
  background: var(--teal-soft);
  padding: 0.2rem 0.4rem;
  border-radius: 6px;
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

@media (max-width: 860px) {
  .split {
    grid-template-columns: 1fr;
  }
}
</style>
