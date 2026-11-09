export default defineEventHandler(async (event) => {
  const orgSlug = getRouterParam(event, 'org')
  if (!orgSlug) throw createError({ statusCode: 400, statusMessage: 'Missing org' })

  const org = await getOrganization(orgSlug)
  const library = await getItemLibrary(orgSlug)
  if (!org || !library) throw createError({ statusCode: 404, statusMessage: 'Organization not found' })

  return { organization: org, library }
})
