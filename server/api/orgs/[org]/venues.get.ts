export default defineEventHandler(async (event) => {
  const orgSlug = getRouterParam(event, 'org')
  if (!orgSlug) throw createError({ statusCode: 400, statusMessage: 'Missing org' })

  const org = await getOrganization(orgSlug)
  if (!org) throw createError({ statusCode: 404, statusMessage: 'Organization not found' })

  const venues = await listVenues(org.id)
  venues.sort((a, b) => a.name.localeCompare(b.name))
  return { organization: org, venues }
})
