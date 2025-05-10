import { BarChart3 } from 'lucide-react';
import { siteConfig } from '@/config/site';

export function AppLogo() {
  return (
    <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
      <BarChart3 className="h-6 w-6 text-primary group-data-[collapsible=icon]:h-7 group-data-[collapsible=icon]:w-7" />
      <span className="font-semibold text-lg group-data-[collapsible=icon]:hidden">
        {siteConfig.name}
      </span>
    </div>
  );
}
