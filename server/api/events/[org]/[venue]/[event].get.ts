export default defineEventHandler(async (event) => {
  const orgSlug = getRouterParam(event, 'org')
  const venueSlug = getRouterParam(event, 'venue')
  const eventSlug = getRouterParam(event, 'event')
  if (!orgSlug || !venueSlug || !eventSlug) {
    throw createError({ statusCode: 400, statusMessage: 'Missing route params' })
  }

  const org = await getOrganization(orgSlug)
  const venue = await getVenue(orgSlug, venueSlug)
  const record = await getEventBySlugs(orgSlug, venueSlug, eventSlug)
  const orgLibrary = await getItemLibrary(orgSlug)
  const venueLibrary = await getItemLibrary(orgSlug, venueSlug)
  if (!org || !venue || !record || !orgLibrary || !venueLibrary) {
    throw createError({ statusCode: 404, statusMessage: 'Event not found' })
  }

  return {
    organization: org,
    venue,
    event: record,
    orgLibrary,
    venueLibrary,
    /** @deprecated prefer orgLibrary; kept for older clients */
    library: orgLibrary,
  }
})
