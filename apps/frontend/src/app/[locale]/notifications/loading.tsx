'use client';

import { useTranslations } from 'next-intl';
import { ListSkeleton } from '@/components/ui/SharedSkeletons';

export default function NotificationsLoading() {
  const t = useTranslations('notifications.loading');

  return (
    <div role="status" aria-live="polite" aria-label={t('ariaLabel')}>
      <ListSkeleton />
    </div>
  );
}