export default defineEventHandler(async (event) => {
  const orgSlug = getRouterParam(event, 'org')
  if (!orgSlug) throw createError({ statusCode: 400, statusMessage: 'Missing org' })

  const query = getQuery(event)
  const venueSlug = typeof query.venue === 'string' && query.venue ? query.venue : undefined

  const org = await getOrganization(orgSlug)
  if (!org) throw createError({ statusCode: 404, statusMessage: 'Organization not found' })

  let venue = null
  if (venueSlug) {
    venue = await getVenue(orgSlug, venueSlug)
    if (!venue) throw createError({ statusCode: 404, statusMessage: 'Venue not found' })
  }

  const library = await getItemLibrary(orgSlug, venueSlug)
  if (!library) throw createError({ statusCode: 404, statusMessage: 'Library not found' })

  return {
    organization: org,
    venue,
    scope: venueSlug ? 'venue' : 'org',
    library,
  }
})
