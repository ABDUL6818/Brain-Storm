'use client';

import { useTranslations } from 'next-intl';
import { CourseListSkeleton } from '@/components/ui/Skeleton';

export default function CoursesLoading() {
  const t = useTranslations('courses.loading');

  return (
    <div className="max-w-5xl mx-auto p-8 space-y-6">
      <div className="space-y-2 animate-pulse">
        <div
          className="h-8 w-48 rounded bg-gray-200 dark:bg-gray-700"
          role="status"
          aria-live="polite"
          aria-label={t('title')}
        />
      </div>
      <div className="space-y-4 animate-pulse">
        <div
          className="h-10 w-full rounded-lg bg-gray-200 dark:bg-gray-700"
          aria-label={t('searchPlaceholder')}
        />
        <div className="flex gap-2">
          <div
            className="h-10 w-24 rounded-lg bg-gray-200 dark:bg-gray-700"
            aria-label={t('filterLabel')}
          />
          <div
            className="h-10 w-32 rounded-lg bg-gray-200 dark:bg-gray-700"
            aria-label={t('sortLabel')}
          />
        </div>
      </div>
      <CourseListSkeleton count={9} />
    </div>
  );
}