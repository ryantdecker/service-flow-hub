export default defineEventHandler(async (event) => {
  const orgSlug = getRouterParam(event, 'org')
  const venueSlug = getRouterParam(event, 'venue')
  const eventSlug = getRouterParam(event, 'event')
  if (!orgSlug || !venueSlug || !eventSlug) {
    throw createError({ statusCode: 400, statusMessage: 'Missing route params' })
  }

  const body = await readBody<{
    systemName?: string
    title?: string
    startsAt?: string
    endsAt?: string
    segments: Array<{
      id: string
      label: string
      desc: string
      itemIds: string[]
      videoItemId?: string
      startTime: string
    }>
  }>(event)

  if (!Array.isArray(body?.segments) || body.segments.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'segments required' })
  }

  const updated = await saveEventFlow(orgSlug, venueSlug, eventSlug, body)
  if (!updated) throw createError({ statusCode: 404, statusMessage: 'Event not found' })
  return updated
})
