import { SkeletonShell, PlansPageLoadingContent } from '@/components/ui/LoadingSkeleton'

export default function Loading() {
  return (
    <SkeletonShell>
      <div className="app-page">
        <PlansPageLoadingContent />
      </div>
    </SkeletonShell>
  )
}
