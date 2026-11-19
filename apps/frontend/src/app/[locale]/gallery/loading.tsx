'use client';

import { useTranslations } from 'next-intl';
import { GridSkeleton } from '@/components/ui/SharedSkeletons';

export default function GalleryLoading() {
  const t = useTranslations('Gallery.loading');

  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{t('message')}</span>
      <GridSkeleton />
    </div>
  );
}