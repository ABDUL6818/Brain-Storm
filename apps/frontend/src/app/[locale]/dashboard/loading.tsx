'use client';

import { useTranslations } from 'next-intl';
import { DashboardSkeleton } from '@/components/ui/Skeleton';

export default function DashboardLoading() {
  const t = useTranslations('dashboard.loading');

  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{t('label')}</span>
      <DashboardSkeleton />
    </div>
  );
}