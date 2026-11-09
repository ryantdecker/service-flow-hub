export default defineEventHandler(async (event) => {
  const orgSlug = getRouterParam(event, 'org')
  if (!orgSlug) throw createError({ statusCode: 400, statusMessage: 'Missing org' })

  const query = getQuery(event)
  const venueSlug = typeof query.venue === 'string' && query.venue ? query.venue : undefined

  const body = await readBody<{
    id?: string
    kind?: 'link' | 'song' | 'video' | 'cta' | 'resource'
    title?: string
    meta?: string
    href?: string
    cta?: boolean
    caption?: string
    embedUrl?: string
    tags?: string[]
    venue?: string
  }>(event)

  const scopeVenue = venueSlug || (typeof body?.venue === 'string' ? body.venue : undefined)

  if (!body?.title?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'title is required' })
  }

  const library = await upsertLibraryItem(
    orgSlug,
    {
      id: body.id,
      kind: body.kind,
      title: body.title.trim(),
      meta: body.meta,
      href: body.href,
      cta: body.cta,
      caption: body.caption,
      embedUrl: body.embedUrl,
      tags: body.tags,
    },
    scopeVenue,
  )
  if (!library) throw createError({ statusCode: 404, statusMessage: 'Organization or venue not found' })
  return library
})
