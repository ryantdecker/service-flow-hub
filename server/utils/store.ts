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

const dataRoot = path.join(process.cwd(), 'data')

async function readJson<T>(filePath: string): Promise<T> {
  const raw = await fs.readFile(filePath, 'utf8')
  return JSON.parse(raw) as T
}

async function writeJson(filePath: string, value: unknown) {
  const tmp = `${filePath}.tmp`
  await fs.writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  await fs.rename(tmp, filePath)
}

async function listJsonFiles(dir: string) {
  try {
    const entries = await fs.readdir(dir)
    return entries.filter((name) => name.endsWith('.json')).map((name) => path.join(dir, name))
  } catch {
    return []
  }
}

function newId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

export async function listOrganizations(): Promise<Organization[]> {
  const files = await listJsonFiles(path.join(dataRoot, 'organizations'))
  return Promise.all(files.map((file) => readJson<Organization>(file)))
}

export async function getOrganization(slug: string): Promise<Organization | null> {
  try {
    return await readJson<Organization>(path.join(dataRoot, 'organizations', `${slug}.json`))
  } catch {
    return null
  }
}

export async function listVenues(organizationId?: string): Promise<Venue[]> {
  const files = await listJsonFiles(path.join(dataRoot, 'venues'))
  const venues = await Promise.all(files.map((file) => readJson<Venue>(file)))
  return organizationId
    ? venues.filter((venue) => venue.organizationId === organizationId)
    : venues
}

export async function getVenue(orgSlug: string, venueSlug: string): Promise<Venue | null> {
  try {
    return await readJson<Venue>(
      path.join(dataRoot, 'venues', `${orgSlug}__${venueSlug}.json`),
    )
  } catch {
    return null
  }
}

export async function listEvents(opts?: {
  organizationId?: string
  venueId?: string
}): Promise<EventRecord[]> {
  const files = await listJsonFiles(path.join(dataRoot, 'events'))
  const events = await Promise.all(files.map((file) => readJson<EventRecord>(file)))
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
  try {
    return await readJson<EventRecord>(
      path.join(dataRoot, 'events', `${orgSlug}__${venueSlug}__${eventSlug}.json`),
    )
  } catch {
    return null
  }
}

export async function getEventFilePath(event: EventRecord, orgSlug: string, venueSlug: string) {
  return path.join(dataRoot, 'events', `${orgSlug}__${venueSlug}__${event.slug}.json`)
}

function itemsPath(orgSlug: string) {
  return path.join(dataRoot, 'items', `${orgSlug}.json`)
}

export async function getItemLibrary(orgSlug: string): Promise<ItemLibrary | null> {
  const org = await getOrganization(orgSlug)
  if (!org) return null
  try {
    return await readJson<ItemLibrary>(itemsPath(orgSlug))
  } catch {
    return { organizationId: org.id, items: [] }
  }
}

export async function saveItemLibrary(orgSlug: string, library: ItemLibrary) {
  await fs.mkdir(path.join(dataRoot, 'items'), { recursive: true })
  await writeJson(itemsPath(orgSlug), library)
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
