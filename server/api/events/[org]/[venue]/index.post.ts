export default defineEventHandler(async (event) => {
  const orgSlug = getRouterParam(event, 'org')
  const venueSlug = getRouterParam(event, 'venue')
  if (!orgSlug || !venueSlug) {
    throw createError({ statusCode: 400, statusMessage: 'Missing route params' })
  }

  const body = await readBody<{
    systemName?: string
    title?: string
    startsAt?: string
    slug?: string
  } | null>(event)
  if (!body?.systemName?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'systemName is required' })
  }

  const created = await createEventFlow(orgSlug, venueSlug, {
    systemName: body.systemName,
    title: body.title,
    startsAt: body.startsAt,
    slug: body.slug,
  })
  if (!created) {
    throw createError({ statusCode: 404, statusMessage: 'Organization or venue not found' })
  }

  return {
    event: created,
    path: `/admin/o/${orgSlug}/v/${venueSlug}/e/${created.slug}/flow`,
  }
})
