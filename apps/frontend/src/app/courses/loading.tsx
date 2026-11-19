import { CourseListSkeleton, Skeleton } from '@/components/ui/Skeleton';

/**
 * Loading skeleton for courses page
 * Displays while course data is being fetched
 */
export default function CoursesLoading() {
  return (
    <div className="max-w-5xl mx-auto p-8 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
      </div>

      {/* Search and filters skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-10 w-full rounded-lg" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24 rounded-lg" />
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
      </div>

      {/* Course list skeleton */}
      <CourseListSkeleton count={9} />
    </div>
  );
}