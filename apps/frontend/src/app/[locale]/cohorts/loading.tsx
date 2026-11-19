'use client';

import { useTranslations } from 'next-intl';
import { ListSkeleton } from '@/components/ui/SharedSkeletons';

export default function CohortsLoading() {
  const t = useTranslations('cohorts.loading');

  return (
    <div role="status" aria-live="polite" aria-label={t('ariaLabel')}>
      <span className="sr-only">{t('message')}</span>
      <ListSkeleton />
    </div>
  );
}