import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, Package, ListChecks, Truck, Factory, Warehouse, Settings, ShoppingCart, Send, Users, FileText } from "lucide-react";

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
        { title: "Ürünler", href: "/products", icon: Package },
        { title: "Stok Seviyeleri", href: "/inventory", icon: Warehouse },
      ],
    },
    {
      title: "Tedarik Zinciri",
      items: [
        { title: "Tedarikçiler", href: "/suppliers", icon: Users },
        { title: "Satınalma Siparişleri", href: "/purchase-orders", icon: FileText },
        { title: "Hammadde Girişi", href: "/raw-material-entries", icon: Truck },
      ],
    },
    {
      title: "Üretim",
      items: [
        { title: "Ürün Reçeteleri (BOM)", href: "/boms", icon: ListChecks },
        { title: "Üretim Kaydı", href: "/productions", icon: Factory },
      ],
    },
    {
      title: "Satış ve Lojistik",
      items: [
        { title: "Müşteri Siparişleri", href: "/customer-orders", icon: ShoppingCart },
        { title: "Sevkiyatlar", href: "/shipments", icon: Send },
      ]
    }
    // {
    //   title: "Ayarlar",
    //   items: [
    //     { title: "Genel Ayarlar", href: "/settings", icon: Settings },
    //   ],
    // }
  ] as NavItemGroup[],
};
