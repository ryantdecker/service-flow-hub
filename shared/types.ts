export type Vertical = 'church' | 'events'

export type ServiceTime = {
  day: 'Saturday' | 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday'
  time: string
  label?: string
  notes?: string
}

export type Organization = {
  id: string
  slug: string
  name: string
  vertical: Vertical
  pastor?: string
  givingPlatform?: string
  website?: string
  branding: {
    logoUrl?: string
    primaryColor?: string
  }
}

export type Venue = {
  id: string
  organizationId: string
  slug: string
  name: string
  address?: {
    line1: string
    line2?: string
    city: string
    region: string
    postalCode: string
    country: string
  }
  phone?: string
  email?: string
  timezone: string
  serviceTimes: ServiceTime[]
  notes?: string
  locationUrl?: string
}

/** Reusable content units managed in the Items library */
export type ItemKind = 'link' | 'song' | 'video' | 'cta' | 'resource'

export type LibraryItem = {
  id: string
  kind: ItemKind
  title: string
  meta: string
  href: string
  cta?: boolean
  /** Video-only fields */
  caption?: string
  embedUrl?: string
  tags?: string[]
}

export type ItemLibrary = {
  organizationId: string
  items: LibraryItem[]
}

export type SegmentLink = {
  title: string
  meta: string
  href: string
  cta?: boolean
}

export type SegmentVideo = {
  title: string
  caption: string
  embedUrl: string
}

/**
 * Flow segment (group). `itemIds` are the source of truth in the builder;
 * `links` / `video` are resolved snapshots for the guest UI.
 */
export type Segment = {
  id: string
  label: string
  desc: string
  itemIds?: string[]
  videoItemId?: string
  video?: SegmentVideo
  links: SegmentLink[]
}

export type ScheduleBeat = {
  segmentId: string
  /** Absolute ISO start for this segment */
  startsAt: string
}

export type LiveState = {
  currentSegmentId: string
  mode: 'scheduled' | 'override'
  updatedAt: string
}

export type EventStatus = 'draft' | 'live' | 'ended'

export type EventRecord = {
  id: string
  organizationId: string
  venueId: string
  slug: string
  title: string
  startsAt: string
  endsAt?: string
  status: EventStatus
  segments: Segment[]
  schedule: ScheduleBeat[]
  liveState: LiveState
}

export type FlowSegmentInput = {
  id: string
  label: string
  desc: string
  itemIds: string[]
  videoItemId?: string
  /** Local time HH:MM on the event date */
  startTime: string
}
