import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  blankSegment,
  DEFAULT_PLAN,
  type ChurchInfo,
  type Segment,
  type SegmentLink,
  type SegmentVideo,
  type ServicePlan,
} from '../data/segments'

const STORAGE_KEY = 'service-flow-hub:plan'

type ServicePlanContextValue = {
  plan: ServicePlan
  setChurch: (patch: Partial<ChurchInfo>) => void
  setCurrentIndex: (index: number) => void
  updateSegment: (index: number, patch: Partial<Segment>) => void
  setSegmentLinks: (index: number, links: SegmentLink[]) => void
  setSegmentVideo: (index: number, video: SegmentVideo | undefined) => void
  addSegment: () => void
  removeSegment: (index: number) => void
  moveSegment: (index: number, direction: -1 | 1) => void
  resetPlan: () => void
}

const ServicePlanContext = createContext<ServicePlanContextValue | null>(null)

function loadPlan(): ServicePlan {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return structuredClone(DEFAULT_PLAN)
    const parsed = JSON.parse(raw) as ServicePlan
    if (!parsed?.church || !Array.isArray(parsed.segments) || parsed.segments.length === 0) {
      return structuredClone(DEFAULT_PLAN)
    }
    const currentIndex = Math.max(
      0,
      Math.min(parsed.segments.length - 1, Number(parsed.currentIndex) || 0),
    )
    return { ...parsed, currentIndex }
  } catch {
    return structuredClone(DEFAULT_PLAN)
  }
}

export function ServicePlanProvider({ children }: { children: ReactNode }) {
  const [plan, setPlan] = useState<ServicePlan>(() => loadPlan())

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plan))
  }, [plan])

  const setChurch = useCallback((patch: Partial<ChurchInfo>) => {
    setPlan((prev) => ({ ...prev, church: { ...prev.church, ...patch } }))
  }, [])

  const setCurrentIndex = useCallback((index: number) => {
    setPlan((prev) => ({
      ...prev,
      currentIndex: Math.max(0, Math.min(prev.segments.length - 1, index)),
    }))
  }, [])

  const updateSegment = useCallback((index: number, patch: Partial<Segment>) => {
    setPlan((prev) => {
      const segments = prev.segments.map((seg, i) =>
        i === index ? { ...seg, ...patch, id: seg.id } : seg,
      )
      return { ...prev, segments }
    })
  }, [])

  const setSegmentLinks = useCallback((index: number, links: SegmentLink[]) => {
    setPlan((prev) => {
      const segments = prev.segments.map((seg, i) =>
        i === index ? { ...seg, links } : seg,
      )
      return { ...prev, segments }
    })
  }, [])

  const setSegmentVideo = useCallback((index: number, video: SegmentVideo | undefined) => {
    setPlan((prev) => {
      const segments = prev.segments.map((seg, i) => {
        if (i !== index) return seg
        if (!video) {
          const rest = { ...seg }
          delete rest.video
          return rest
        }
        return { ...seg, video }
      })
      return { ...prev, segments }
    })
  }, [])

  const addSegment = useCallback(() => {
    setPlan((prev) => ({
      ...prev,
      segments: [...prev.segments, blankSegment()],
    }))
  }, [])

  const removeSegment = useCallback((index: number) => {
    setPlan((prev) => {
      if (prev.segments.length <= 1) return prev
      const segments = prev.segments.filter((_, i) => i !== index)
      const currentIndex = Math.min(prev.currentIndex, segments.length - 1)
      return { ...prev, segments, currentIndex }
    })
  }, [])

  const moveSegment = useCallback((index: number, direction: -1 | 1) => {
    setPlan((prev) => {
      const target = index + direction
      if (target < 0 || target >= prev.segments.length) return prev
      const segments = [...prev.segments]
      const [item] = segments.splice(index, 1)
      segments.splice(target, 0, item)
      let currentIndex = prev.currentIndex
      if (prev.currentIndex === index) currentIndex = target
      else if (prev.currentIndex === target) currentIndex = index
      return { ...prev, segments, currentIndex }
    })
  }, [])

  const resetPlan = useCallback(() => {
    setPlan(structuredClone(DEFAULT_PLAN))
  }, [])

  const value = useMemo(
    () => ({
      plan,
      setChurch,
      setCurrentIndex,
      updateSegment,
      setSegmentLinks,
      setSegmentVideo,
      addSegment,
      removeSegment,
      moveSegment,
      resetPlan,
    }),
    [
      plan,
      setChurch,
      setCurrentIndex,
      updateSegment,
      setSegmentLinks,
      setSegmentVideo,
      addSegment,
      removeSegment,
      moveSegment,
      resetPlan,
    ],
  )

  return (
    <ServicePlanContext.Provider value={value}>{children}</ServicePlanContext.Provider>
  )
}

export function useServicePlan() {
  const ctx = useContext(ServicePlanContext)
  if (!ctx) throw new Error('useServicePlan must be used within ServicePlanProvider')
  return ctx
}
