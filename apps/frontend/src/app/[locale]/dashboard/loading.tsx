'use client';

import { useTranslations } from 'next-intl';
import { DashboardSkeleton } from '@/components/ui/Skeleton';

export default function DashboardLoading() {
  return <DashboardSkeleton />;
}