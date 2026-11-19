'use client';

import { useTranslations } from 'next-intl';
import { GridSkeleton } from '@/components/ui/SharedSkeletons';

export default function CredentialsLoading() {
  const t = useTranslations('credentials.loading');

  return (
    <div aria-busy="true" aria-label={t('ariaLabel')}>
      <GridSkeleton />
    </div>
  );
}