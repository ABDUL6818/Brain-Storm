'use client';

import { useTranslations } from 'next-intl';
import { TableSkeleton } from '@/components/ui/SharedSkeletons';

export default function LeaderboardLoading() {
  const t = useTranslations('leaderboard.loading');

  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{t('loading')}</span>
      <TableSkeleton />
    </div>
  );
}