export default defineEventHandler(async (event) => {
  const orgSlug = getRouterParam(event, 'org')
  const venueSlug = getRouterParam(event, 'venue')
  if (!orgSlug || !venueSlug) {
    throw createError({ statusCode: 400, statusMessage: 'Missing org or venue' })
  }

  const payload = await resolveVenueLive(orgSlug, venueSlug)
  if (!payload) throw createError({ statusCode: 404, statusMessage: 'Venue not found' })
  return payload
})
