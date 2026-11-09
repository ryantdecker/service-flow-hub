export default defineEventHandler(async (event) => {
  const orgSlug = getRouterParam(event, 'org')
  const venueSlug = getRouterParam(event, 'venue')
  if (!orgSlug || !venueSlug) {
    throw createError({ statusCode: 400, statusMessage: 'Missing org or venue' })
  }

  const payload = await resolveVenueLive(orgSlug, venueSlug)
  if (!payload?.event) {
    throw createError({ statusCode: 404, statusMessage: 'No event for venue' })
  }

  return {
    eventId: payload.event.id,
    status: payload.event.status,
    liveState: payload.event.liveState,
    serverTime: new Date().toISOString(),
  }
})
