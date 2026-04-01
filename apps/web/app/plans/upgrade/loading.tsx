import { SkeletonShell, PlansUpgradeLoadingContent } from '@/components/ui/LoadingSkeleton'

export default function Loading() {
  return (
    <SkeletonShell>
      <div className="app-page">
        <PlansUpgradeLoadingContent />
      </div>
    </SkeletonShell>
  )
}
