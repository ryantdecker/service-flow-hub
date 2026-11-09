export default defineEventHandler(async (event) => {
  const orgSlug = getRouterParam(event, 'org')
  const venueSlug = getRouterParam(event, 'venue')
  const eventSlug = getRouterParam(event, 'event')
  if (!orgSlug || !venueSlug || !eventSlug) {
    throw createError({ statusCode: 400, statusMessage: 'Missing route params' })
  }

  const body = await readBody<{
    systemName?: string
    title?: string
    slug?: string
  } | null>(event)

  const cloned = await cloneEventFlow(orgSlug, venueSlug, eventSlug, {
    systemName: body?.systemName,
    title: body?.title,
    slug: body?.slug,
  })
  if (!cloned) throw createError({ statusCode: 404, statusMessage: 'Event not found' })

  return {
    event: cloned,
    path: `/admin/o/${orgSlug}/v/${venueSlug}/e/${cloned.slug}/flow`,
  }
})
