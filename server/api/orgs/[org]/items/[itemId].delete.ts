export default defineEventHandler(async (event) => {
  const orgSlug = getRouterParam(event, 'org')
  const itemId = getRouterParam(event, 'itemId')
  if (!orgSlug || !itemId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing org or itemId' })
  }

  const query = getQuery(event)
  const venueSlug = typeof query.venue === 'string' && query.venue ? query.venue : undefined

  const library = await deleteLibraryItem(orgSlug, itemId, venueSlug)
  if (!library) throw createError({ statusCode: 404, statusMessage: 'Organization or venue not found' })
  return library
})
