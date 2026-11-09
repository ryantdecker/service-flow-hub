export default defineEventHandler(async (event) => {
  const orgSlug = getRouterParam(event, 'org')
  const itemId = getRouterParam(event, 'itemId')
  if (!orgSlug || !itemId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing org or itemId' })
  }

  const library = await deleteLibraryItem(orgSlug, itemId)
  if (!library) throw createError({ statusCode: 404, statusMessage: 'Organization not found' })
  return library
})
