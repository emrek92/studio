import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, Package, ListChecks, Truck, Factory, Warehouse, Settings } from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  disabled?: boolean;
}

export interface NavItemGroup {
  title?: string;
  items: NavItem[];
}

export const siteConfig = {
  name: "StokTakip",
  description: "Hammadde, Yarı Mamul, Mamul ve Yardımcı Malzeme Stok Takip Sistemi",
  sidebarNav: [
    {
      items: [
        { title: "Panel", href: "/dashboard", icon: LayoutDashboard },
      ],
    },
    {
      title: "Stok Yönetimi",
      items: [
        { title: "Məhsullar", href: "/products", icon: Package },
        { title: "Stok Səviyyələri", href: "/inventory", icon: Warehouse },
      ],
    },
    {
      title: "İstehsalat",
      items: [
        { title: "BOM Siyahıları", href: "/boms", icon: ListChecks },
        { title: "Xammal Girişi", href: "/raw-material-entries", icon: Truck },
        { title: "İstehsalat Qeydi", href: "/productions", icon: Factory },
      ],
    },
    // {
    //   title: "Ayarlar",
    //   items: [
    //     { title: "Ümumi Ayarlar", href: "/settings", icon: Settings },
    //   ],
    // }
  ] as NavItemGroup[],
};
