export type SegmentLink = {
  title: string
  meta: string
  href: string
  /** Primary call-to-action styling */
  cta?: boolean
}

export type SegmentVideo = {
  title: string
  caption: string
  /** YouTube (or similar) embed URL — swap from backend when live */
  embedUrl: string
}

export type Segment = {
  id: string
  label: string
  time: string
  desc: string
  video?: SegmentVideo
  links: SegmentLink[]
}

export type ChurchInfo = {
  name: string
  campus: string
  service: string
  dateLabel: string
  pastor: string
  givingPlatform: string
}

export type ServicePlan = {
  church: ChurchInfo
  segments: Segment[]
  currentIndex: number
}

export const DEFAULT_CHURCH: ChurchInfo = {
  name: 'River Valley Church',
  campus: 'City Campus',
  service: 'Sunday 9:00',
  dateLabel: 'November 9, 2026',
  pastor: 'Pastor Rob Ketterling',
  givingPlatform: 'Tithe.ly',
}

/** @deprecated Prefer plan.church from ServicePlanProvider */
export const CHURCH = DEFAULT_CHURCH

/**
 * Guest rundown defaults. Backend / builder sets “now”;
 * demo default is Giving so mid-service highlight is obvious.
 */
export const DEFAULT_SEGMENTS: Segment[] = [
  {
    id: 'welcome',
    label: 'Welcome',
    time: 'Until 9:00',
    desc: 'Glad you’re here at City Campus—find your way, check in the kids & youth, and say hello.',
    links: [
      { title: 'Campus map', meta: 'City Campus · parking & entrances', href: '#' },
      { title: 'Kids', meta: 'Check-in · ages & rooms', href: '#' },
      { title: 'Youth', meta: 'Middle & high school', href: '#' },
      { title: 'Connect card', meta: 'New here? Tell us hello', href: '#' },
    ],
  },
  {
    id: 'worship',
    label: 'Worship',
    time: '9:00',
    desc: 'This morning’s set—listen or download each song.',
    links: [
      { title: 'Praise', meta: 'Elevation Worship · listen / download', href: '#' },
      { title: 'Goodness of God', meta: 'Jenn Johnson · listen / download', href: '#' },
      { title: 'Graves Into Gardens', meta: 'Brandon Lake · listen / download', href: '#' },
      { title: 'Holy Forever', meta: 'Chris Tomlin · listen / download', href: '#' },
    ],
  },
  {
    id: 'announcements',
    label: 'Announcements',
    time: '9:25',
    desc: 'What’s next at River Valley—sign up while it’s fresh.',
    links: [
      { title: 'This week’s events', meta: 'River Valley app', href: '#' },
      { title: 'Serve on Sundays', meta: 'Volunteer teams', href: '#' },
      { title: 'Upcoming gatherings', meta: 'City Campus', href: '#' },
    ],
  },
  {
    id: 'special-video',
    label: 'Special video',
    time: '9:30',
    desc: 'Re-watch Miracle Offering, then take a next step.',
    video: {
      title: 'Miracle Offering',
      caption: 'Tap play to re-watch',
      embedUrl: '',
    },
    links: [
      {
        title: 'How to get Involved',
        meta: 'Miracle Offering · next steps',
        href: '#',
        cta: true,
      },
    ],
  },
  {
    id: 'giving',
    label: 'Giving',
    time: '9:35',
    desc: 'Participate in the offering through Tithe.ly.',
    links: [
      { title: 'Give online', meta: 'Tithe.ly · River Valley Church', href: '#' },
      { title: 'Text to give', meta: 'Tithe.ly · City Campus', href: '#' },
    ],
  },
  {
    id: 'sermon',
    label: 'Sermon notes',
    time: '9:38',
    desc: `Follow along with ${DEFAULT_CHURCH.pastor}'s message.`,
    links: [
      { title: 'Sermon notes', meta: 'Pastor Rob Ketterling', href: '#' },
      { title: 'Scripture reading', meta: 'Today’s passage', href: '#' },
      { title: 'Discussion guide', meta: 'For groups this week', href: '#' },
    ],
  },
  {
    id: 'post',
    label: 'Thanks for coming!',
    time: '10:20',
    desc: 'After the blessing—next steps and a smooth exit.',
    links: [
      { title: 'Get connected', meta: 'Groups, serve & next steps', href: '#' },
      { title: 'Parking validation', meta: 'Scan or show at exit', href: '#' },
    ],
  },
]

/** @deprecated Prefer plan.segments from ServicePlanProvider */
export const SEGMENTS = DEFAULT_SEGMENTS

/** Demo default — builder / backend sets “now” in production. */
export const DEFAULT_CURRENT_INDEX = 4

export const DEFAULT_PLAN: ServicePlan = {
  church: DEFAULT_CHURCH,
  segments: DEFAULT_SEGMENTS,
  currentIndex: DEFAULT_CURRENT_INDEX,
}

export function createSegmentId() {
  return `seg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export function blankSegment(): Segment {
  return {
    id: createSegmentId(),
    label: 'New segment',
    time: '',
    desc: '',
    links: [],
  }
}
