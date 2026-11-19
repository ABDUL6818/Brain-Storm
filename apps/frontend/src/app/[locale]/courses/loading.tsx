import { Skeleton, CourseListSkeleton } from '@/components/ui/Skeleton';

export default function CoursesLoading() {
  const t = useTranslations('courses.loading');

  return (
    <div className="max-w-5xl mx-auto p-8 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-10 w-full rounded-lg" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24 rounded-lg" />
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
      </div>
      <CourseListSkeleton count={9} />
    </div>
  );
}