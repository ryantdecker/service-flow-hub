import { promises as fs } from 'node:fs'
import path from 'node:path'
import type {
  EventRecord,
  FlowSegmentInput,
  ItemLibrary,
  LibraryItem,
  Organization,
  Segment,
  Venue,
} from '../../shared/types'

/**
 * Eagerly bundle JSON seeds into the server build.
 * Required on Vercel: filesystem `data/` is not available in the lambda unless traced.
 */
const organizationModules = import.meta.glob('../../data/organizations/*.json', { eager: true })
const venueModules = import.meta.glob('../../data/venues/*.json', { eager: true })
const eventModules = import.meta.glob('../../data/events/*.json', { eager: true })
const itemModules = import.meta.glob('../../data/items/*.json', { eager: true })

const dataRoot = path.join(process.cwd(), 'data')

/** Ephemeral write overlay for serverless (lost on cold start). Local fs writes still preferred. */
const memoryOverlay = new Map<string, unknown>()

function unwrap<T>(mod: unknown): T {
  if (mod && typeof mod === 'object' && 'default' in mod) {
    return (mod as { default: T }).default
  }
  return mod as T
}

function fileKeyFromGlob(globPath: string) {
  // e.g. ../../data/organizations/river-valley.json -> organizations/river-valley.json
  const marker = '/data/'
  const idx = globPath.replace(/\\/g, '/').lastIndexOf(marker)
  if (idx === -1) return globPath.split('/').slice(-2).join('/')
  return globPath.replace(/\\/g, '/').slice(idx + marker.length)
}

function clone<T>(value: T): T {
  return structuredClone(value)
}

function loadGlobMap<T>(modules: Record<string, unknown>) {
  const map = new Map<string, T>()
  for (const [globPath, mod] of Object.entries(modules)) {
    map.set(fileKeyFromGlob(globPath), unwrap<T>(mod))
  }
  return map
}

const seededOrganizations = loadGlobMap<Organization>(organizationModules)
const seededVenues = loadGlobMap<Venue>(venueModules)
const seededEvents = loadGlobMap<EventRecord>(eventModules)
const seededItems = loadGlobMap<ItemLibrary>(itemModules)

async function readJsonFile<T>(relativeKey: string): Promise<T | null> {
  if (memoryOverlay.has(relativeKey)) {
    return clone(memoryOverlay.get(relativeKey) as T)
  }

  // Local/dev: prefer live filesystem so admin edits persist across reloads
  try {
    const raw = await fs.readFile(path.join(dataRoot, relativeKey), 'utf8')
    return JSON.parse(raw) as T
  } catch {
    // fall through to bundled seed
  }

  const seeded =
    seededOrganizations.get(relativeKey)
    ?? seededVenues.get(relativeKey)
    ?? seededEvents.get(relativeKey)
    ?? seededItems.get(relativeKey)
  return seeded ? clone(seeded as T) : null
}

async function writeJson(relativeKey: string, value: unknown) {
  memoryOverlay.set(relativeKey, clone(value))
  try {
    const filePath = path.join(dataRoot, relativeKey)
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    const tmp = `${filePath}.tmp`
    await fs.writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
    await fs.rename(tmp, filePath)
  } catch {
    // Serverless / read-only FS: memory overlay still serves subsequent reads on this instance
  }
}

async function listJsonKeys(subdir: string): Promise<string[]> {
  const prefix = `${subdir}/`
  const keys = new Set<string>()

  for (const key of memoryOverlay.keys()) {
    if (key.startsWith(prefix) && key.endsWith('.json')) keys.add(key)
  }

  try {
    const entries = await fs.readdir(path.join(dataRoot, subdir))
    for (const name of entries) {
      if (name.endsWith('.json')) keys.add(`${subdir}/${name}`)
    }
  } catch {
    // ignore missing dir on serverless
  }

  const seeded =
    subdir === 'organizations'
      ? seededOrganizations
      : subdir === 'venues'
        ? seededVenues
        : subdir === 'events'
          ? seededEvents
          : subdir === 'items'
            ? seededItems
            : null

  if (seeded) {
    for (const key of seeded.keys()) {
      if (key.startsWith(prefix) && key.endsWith('.json')) keys.add(key)
    }
  }

  return [...keys].sort()
}

function newId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

export async function listOrganizations(): Promise<Organization[]> {
  const keys = await listJsonKeys('organizations')
  const orgs = await Promise.all(keys.map((key) => readJsonFile<Organization>(key)))
  return orgs.filter((org): org is Organization => Boolean(org))
}

export async function getOrganization(slug: string): Promise<Organization | null> {
  return readJsonFile<Organization>(`organizations/${slug}.json`)
}

export async function listVenues(organizationId?: string): Promise<Venue[]> {
  const keys = await listJsonKeys('venues')
  const venues = (await Promise.all(keys.map((key) => readJsonFile<Venue>(key)))).filter(
    (venue): venue is Venue => Boolean(venue),
  )
  return organizationId
    ? venues.filter((venue) => venue.organizationId === organizationId)
    : venues
}

export async function getVenue(orgSlug: string, venueSlug: string): Promise<Venue | null> {
  return readJsonFile<Venue>(`venues/${orgSlug}__${venueSlug}.json`)
}

export async function listEvents(opts?: {
  organizationId?: string
  venueId?: string
}): Promise<EventRecord[]> {
  const keys = await listJsonKeys('events')
  const events = (await Promise.all(keys.map((key) => readJsonFile<EventRecord>(key)))).filter(
    (event): event is EventRecord => Boolean(event),
  )
  return events.filter((event) => {
    if (opts?.organizationId && event.organizationId !== opts.organizationId) return false
    if (opts?.venueId && event.venueId !== opts.venueId) return false
    return true
  })
}

export async function getEventBySlugs(
  orgSlug: string,
  venueSlug: string,
  eventSlug: string,
): Promise<EventRecord | null> {
  return readJsonFile<EventRecord>(`events/${orgSlug}__${venueSlug}__${eventSlug}.json`)
}

export async function getEventFilePath(event: EventRecord, orgSlug: string, venueSlug: string) {
  return `events/${orgSlug}__${venueSlug}__${event.slug}.json`
}

export async function getItemLibrary(orgSlug: string): Promise<ItemLibrary | null> {
  const org = await getOrganization(orgSlug)
  if (!org) return null
  const library = await readJsonFile<ItemLibrary>(`items/${orgSlug}.json`)
  return library ?? { organizationId: org.id, items: [] }
}

export async function saveItemLibrary(orgSlug: string, library: ItemLibrary) {
  await writeJson(`items/${orgSlug}.json`, library)
  return library
}

export async function upsertLibraryItem(orgSlug: string, item: Partial<LibraryItem> & { title: string }) {
  const library = await getItemLibrary(orgSlug)
  if (!library) return null

  if (item.id) {
    const idx = library.items.findIndex((row) => row.id === item.id)
    if (idx === -1) return null
    library.items[idx] = { ...library.items[idx], ...item, id: item.id }
  } else {
    library.items.push({
      id: newId('item'),
      kind: item.kind ?? 'link',
      title: item.title,
      meta: item.meta ?? '',
      href: item.href ?? '#',
      cta: item.cta,
      caption: item.caption,
      embedUrl: item.embedUrl,
      tags: item.tags ?? [],
    })
  }

  await saveItemLibrary(orgSlug, library)
  return library
}

export async function deleteLibraryItem(orgSlug: string, itemId: string) {
  const library = await getItemLibrary(orgSlug)
  if (!library) return null
  library.items = library.items.filter((item) => item.id !== itemId)
  await saveItemLibrary(orgSlug, library)
  return library
}

export function hydrateSegmentFromItems(
  segment: Pick<Segment, 'id' | 'label' | 'desc' | 'itemIds' | 'videoItemId'>,
  itemsById: Map<string, LibraryItem>,
): Segment {
  const itemIds = segment.itemIds ?? []
  const links = itemIds
    .map((id) => itemsById.get(id))
    .filter((item): item is LibraryItem => Boolean(item) && item.kind !== 'video')
    .map((item) => ({
      title: item.title,
      meta: item.meta,
      href: item.href || '#',
      cta: item.cta || item.kind === 'cta',
    }))

  const videoItem = segment.videoItemId ? itemsById.get(segment.videoItemId) : undefined
  const video =
    videoItem && videoItem.kind === 'video'
      ? {
          title: videoItem.title,
          caption: videoItem.caption || 'Tap play to re-watch',
          embedUrl: videoItem.embedUrl || '',
        }
      : undefined

  return {
    id: segment.id,
    label: segment.label,
    desc: segment.desc,
    itemIds,
    videoItemId: segment.videoItemId,
    links,
    video,
  }
}

function combineEventDateAndTime(eventStartsAt: string, hhmm: string) {
  const datePart = eventStartsAt.slice(0, 10)
  const offsetMatch = eventStartsAt.match(/([+-]\d{2}:\d{2}|Z)$/)
  const offset = offsetMatch?.[1] === 'Z' ? '+00:00' : offsetMatch?.[1] || '-06:00'
  const [h = '09', m = '00'] = hhmm.split(':')
  return `${datePart}T${h.padStart(2, '0')}:${m.padStart(2, '0')}:00${offset}`
}

export function extractStartTime(iso: string) {
  const match = iso.match(/T(\d{2}:\d{2})/)
  return match?.[1] ?? '09:00'
}

export async function saveEventFlow(
  orgSlug: string,
  venueSlug: string,
  eventSlug: string,
  input: {
    title?: string
    startsAt?: string
    endsAt?: string
    segments: FlowSegmentInput[]
  },
) {
  const event = await getEventBySlugs(orgSlug, venueSlug, eventSlug)
  const library = await getItemLibrary(orgSlug)
  if (!event || !library) return null

  const itemsById = new Map(library.items.map((item) => [item.id, item]))
  const startsAt = input.startsAt ?? event.startsAt

  const segments = input.segments.map((seg) =>
    hydrateSegmentFromItems(
      {
        id: seg.id || newId('seg'),
        label: seg.label,
        desc: seg.desc,
        itemIds: seg.itemIds,
        videoItemId: seg.videoItemId,
      },
      itemsById,
    ),
  )

  const schedule = input.segments.map((seg, index) => ({
    segmentId: segments[index].id,
    startsAt: combineEventDateAndTime(startsAt, seg.startTime || extractStartTime(startsAt)),
  }))

  const next: EventRecord = {
    ...event,
    title: input.title ?? event.title,
    startsAt,
    endsAt: input.endsAt ?? event.endsAt,
    segments,
    schedule,
  }

  if (!next.segments.some((seg) => seg.id === next.liveState.currentSegmentId)) {
    next.liveState = {
      currentSegmentId: next.segments[0]?.id ?? next.liveState.currentSegmentId,
      mode: next.liveState.mode,
      updatedAt: new Date().toISOString(),
    }
  }

  const filePath = await getEventFilePath(next, orgSlug, venueSlug)
  await writeJson(filePath, next)
  return next
}

export async function resolveVenueLive(orgSlug: string, venueSlug: string) {
  const org = await getOrganization(orgSlug)
  const venue = await getVenue(orgSlug, venueSlug)
  if (!org || !venue) return null

  const events = await listEvents({
    organizationId: org.id,
    venueId: venue.id,
  })

  const live = events.find((event) => event.status === 'live')
  const upcoming = events
    .filter((event) => event.status === 'draft')
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0]
  const ended = events
    .filter((event) => event.status === 'ended')
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt))[0]

  return {
    organization: org,
    venue,
    event: live ?? upcoming ?? ended ?? null,
    events,
  }
}

export async function updateEventLiveState(
  orgSlug: string,
  venueSlug: string,
  eventSlug: string,
  currentSegmentId: string,
  mode: 'scheduled' | 'override' = 'override',
) {
  const event = await getEventBySlugs(orgSlug, venueSlug, eventSlug)
  if (!event) return null
  if (!event.segments.some((segment) => segment.id === currentSegmentId)) return null

  event.liveState = {
    currentSegmentId,
    mode,
    updatedAt: new Date().toISOString(),
  }

  const filePath = await getEventFilePath(event, orgSlug, venueSlug)
  await writeJson(filePath, event)
  return event
}

export { newId }
