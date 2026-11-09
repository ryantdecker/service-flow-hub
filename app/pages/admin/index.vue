<script setup lang="ts">
import type { Organization } from '~~/shared/types'

const { data: orgs } = await useFetch<Organization[]>('/api/orgs')
</script>

<template>
  <div class="admin">
    <header>
      <p class="kicker">Client admin</p>
      <h1>Organizations</h1>
    </header>
    <ul class="list">
      <li v-for="org in orgs" :key="org.id">
        <NuxtLink class="row" :to="`/admin/o/${org.slug}`">
          <span>
            <strong>{{ org.name }}</strong>
            <span class="meta">{{ org.vertical }} · {{ org.slug }}</span>
          </span>
          <span aria-hidden="true">→</span>
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.admin {
  width: min(720px, 100%);
  margin: 0 auto;
  padding: 2rem 1.1rem 4rem;
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
  margin: 0.35rem 0 1.25rem;
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
  text-decoration: none;
  box-shadow: var(--shadow);
}

.row strong {
  display: block;
  color: var(--teal-deep);
}

.meta {
  display: block;
  margin-top: 0.15rem;
  font-size: 0.78rem;
  color: var(--ink-faint);
  font-weight: 600;
}
</style>
