<script setup lang="ts">
import type { Organization } from '~~/shared/types'

const { data: orgs } = await useFetch<Organization[]>('/api/orgs')
</script>

<template>
  <div class="home">
    <header class="home-hero">
      <p class="kicker">Service Flow Hub</p>
      <h1>Live venue companions</h1>
      <p class="lede">
        Guest live URLs and client admin — Phase 0 JSON scaffold.
      </p>
      <NuxtLink class="btn" to="/admin">Open admin</NuxtLink>
    </header>

    <section class="card">
      <h2>Organizations</h2>
      <ul>
        <li v-for="org in orgs" :key="org.id">
          <NuxtLink :to="`/admin/o/${org.slug}`">{{ org.name }}</NuxtLink>
          <span class="meta">{{ org.vertical }}</span>
        </li>
      </ul>
    </section>

    <section class="card">
      <h2>Try a guest live URL</h2>
      <p>
        <NuxtLink to="/v/river-valley/city">/v/river-valley/city</NuxtLink>
        — City Campus Sunday 9:00 demo
      </p>
    </section>
  </div>
</template>

<style scoped>
.home {
  width: min(720px, 100%);
  margin: 0 auto;
  padding: 2rem 1.1rem 4rem;
}

.home-hero {
  margin-bottom: 1.5rem;
}

.kicker {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--teal);
  margin-bottom: 0.4rem;
}

h1 {
  font-family: var(--font-display);
  font-size: clamp(1.8rem, 4vw, 2.4rem);
  color: var(--teal-deep);
  letter-spacing: -0.03em;
}

.lede {
  margin: 0.5rem 0 1rem;
  color: var(--ink-muted);
}

.btn {
  display: inline-flex;
  padding: 0.55rem 0.9rem;
  background: var(--teal);
  color: #fff;
  border-radius: 10px;
  text-decoration: none;
  font-weight: 700;
}

.card {
  background: var(--white);
  border: 1px solid rgba(26, 107, 99, 0.12);
  border-radius: var(--radius);
  padding: 1rem 1.1rem;
  margin-bottom: 0.9rem;
  box-shadow: var(--shadow);
}

.card h2 {
  font-family: var(--font-display);
  font-size: 1.05rem;
  color: var(--teal-deep);
  margin-bottom: 0.65rem;
}

ul {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

li {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

a {
  color: var(--teal-deep);
  font-weight: 700;
}

.meta {
  color: var(--ink-faint);
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
</style>
