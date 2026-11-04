export type SegmentLink = {
  title: string
  meta: string
  href: string
}

export type Segment = {
  id: string
  label: string
  time: string
  desc: string
  links: SegmentLink[]
}

export const SEGMENTS: Segment[] = [
  {
    id: 'welcome',
    label: 'Welcome',
    time: '9:00',
    desc: "Glad you're here—find kids check-in, Wi‑Fi, and today's welcome card.",
    links: [
      { title: 'New here? Welcome card', meta: 'Church Center · 2 min', href: '#' },
      { title: 'Kids check-in', meta: 'Lobby · North doors', href: '#' },
      { title: 'Guest Wi‑Fi', meta: 'Network: Riverside Guest', href: '#' },
    ],
  },
  {
    id: 'worship',
    label: 'Worship',
    time: '9:08',
    desc: "Lyrics and chord charts for this morning's set.",
    links: [
      { title: 'Song lyrics', meta: 'Projection companion', href: '#' },
      { title: 'Chord charts (band)', meta: "PDF · today's set", href: '#' },
    ],
  },
  {
    id: 'announcements',
    label: 'Announcements',
    time: '9:28',
    desc: "What's next at Riverside—sign up while it's fresh.",
    links: [
      { title: 'Fall Family Picnic', meta: 'Sat Nov 15 · RSVP', href: '#' },
      { title: 'Serve on Sundays', meta: 'Volunteer teams', href: '#' },
      { title: "This week's events", meta: 'Church Center', href: '#' },
    ],
  },
  {
    id: 'giving',
    label: 'Giving',
    time: '9:35',
    desc: 'Participate in the offering—online or text-to-give.',
    links: [
      { title: 'Give online', meta: 'Pushpay · Riverside CC', href: '#' },
      { title: 'Text to give', meta: 'Text RIVERSIDE to 77977', href: '#' },
    ],
  },
  {
    id: 'sermon',
    label: 'Sermon notes',
    time: '9:40',
    desc: "Follow along with Pastor Elena's message from Luke 15.",
    links: [
      { title: 'Sermon notes PDF', meta: '“Lost & Found” · Luke 15', href: '#' },
      { title: 'Scripture reading', meta: 'Luke 15:1–32 · ESV', href: '#' },
      { title: 'Discussion guide', meta: 'For groups this week', href: '#' },
    ],
  },
  {
    id: 'post',
    label: 'Post service',
    time: '10:25',
    desc: 'After the blessing—coffee, parking, and next steps.',
    links: [
      { title: 'Coffee & connect', meta: 'Courtyard café', href: '#' },
      { title: 'Parking & exits', meta: 'North lot map', href: '#' },
      { title: 'Prayer request', meta: 'Care team form', href: '#' },
    ],
  },
]

/** Mid-service default so the “Now” highlight is obvious on first open */
export const DEFAULT_CURRENT_INDEX = 2
