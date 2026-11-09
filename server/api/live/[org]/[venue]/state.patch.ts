export default defineEventHandler(async (event) => {
  const orgSlug = getRouterParam(event, 'org')
  const venueSlug = getRouterParam(event, 'venue')
  if (!orgSlug || !venueSlug) {
    throw createError({ statusCode: 400, statusMessage: 'Missing org or venue' })
  }

  const body = await readBody<{
    eventSlug?: string
    currentSegmentId?: string
    mode?: 'scheduled' | 'override'
  }>(event)
  if (!body?.eventSlug || !body?.currentSegmentId) {
    throw createError({ statusCode: 400, statusMessage: 'eventSlug and currentSegmentId required' })
  }

  const updated = await updateEventLiveState(
    orgSlug,
    venueSlug,
    body.eventSlug,
    body.currentSegmentId,
    body.mode ?? 'override',
  )
  if (!updated) throw createError({ statusCode: 404, statusMessage: 'Event or segment not found' })
  return updated.liveState
})
