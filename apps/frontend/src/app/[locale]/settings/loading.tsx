'use client';

import { useTranslations } from 'next-intl';
import { FormSkeleton } from '@/components/ui/SharedSkeletons';

export default function SettingsLoading() {
  const t = useTranslations('settings.loading');

  return (
    <div aria-busy="true" aria-label={t('ariaLabel')}>
      <FormSkeleton />
    </div>
  );
}