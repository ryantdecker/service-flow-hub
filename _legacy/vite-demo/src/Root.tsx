import { useEffect, useState } from 'react'
import App from './App'
import Builder from './Builder'
import { ServicePlanProvider } from './state/ServicePlanContext'

function routeFromHash() {
  const hash = window.location.hash.replace(/^#/, '') || '/'
  return hash.startsWith('/builder') ? 'builder' : 'guest'
}

function Root() {
  const [route, setRoute] = useState<'guest' | 'builder'>(() => routeFromHash())

  useEffect(() => {
    const onHash = () => setRoute(routeFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  return (
    <ServicePlanProvider>
      {route === 'builder' ? <Builder /> : <App />}
    </ServicePlanProvider>
  )
}

export default Root
