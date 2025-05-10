
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Package, ListChecks, Truck, Factory, Warehouse, Send, ShoppingCart } from "lucide-react"; // Added Send and ShoppingCart
import Link from "next/link";
import { useStore } from "@/lib/store";
import { useEffect, useState } from "react";

const StatCard = ({ title, value, icon: Icon, link, description }: { title: string, value: string | number, icon: React.ElementType, link: string, description: string }) => (
  <Link href={link} passHref>
    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  </Link>
);

export default function DashboardPage() {
  const { products, boms, rawMaterialEntries, productionLogs, customerOrders, shipmentLogs } = useStore();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <div className="flex items-center justify-center h-full"><p>Yükleniyor...</p></div>; 
  }

  const totalProductTypes = products.length;
  const totalBoms = boms.length;
  const totalRawMaterialEntries = rawMaterialEntries.length;
  const totalProductionLogs = productionLogs.length;
  const totalCustomerOrders = customerOrders.length;
  const totalShipmentLogs = shipmentLogs.length;
  const totalStockItems = products.reduce((sum, p) => sum + p.stock, 0);


  return (
    <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Panel</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"> {/* Adjusted grid for more cards */}
        <StatCard 
          title="Toplam Ürün Çeşidi" 
          value={totalProductTypes} 
          icon={Package} 
          link="/products"
          description="Kayıtlı ürün çeşitleri"
        />
        <StatCard 
          title="Toplam Stok Miktarı" 
          value={totalStockItems} 
          icon={Warehouse} 
          link="/inventory"
          description="Tüm ürünlerin toplam stoku"
        />
        <StatCard 
          title="Ürün Reçeteleri (BOM)" 
          value={totalBoms} 
          icon={ListChecks} 
          link="/boms"
          description="Ürün reçetelerinin sayısı"
        />
        <StatCard 
          title="Hammadde Girişleri" 
          value={totalRawMaterialEntries} 
          icon={Truck} 
          link="/raw-material-entries"
          description="Kaydedilmiş hammadde girişleri"
        />
        <StatCard 
          title="Üretim Kayıtları" 
          value={totalProductionLogs} 
          icon={Factory} 
          link="/productions"
          description="Tamamlanmış üretim işlemleri"
        />
         <StatCard 
          title="Müşteri Siparişleri" 
          value={totalCustomerOrders} 
          icon={ShoppingCart} 
          link="/customer-orders"
          description="Alınan müşteri siparişleri"
        />
        <StatCard 
          title="Sevkiyat Kayıtları" 
          value={totalShipmentLogs} 
          icon={Send} 
          link="/shipments"
          description="Yapılmış sevkiyatlar"
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>StokTakip Sistemine Hoş Geldiniz!</CardTitle>
          <CardDescription>
            Bu sistem aracılığıyla hammadde, yarı mamul, mamul ve yardımcı malzemelerinizi etkin bir şekilde yönetebilirsiniz.
            Navigasyon menüsünden istediğiniz bölüme geçiş yapabilirsiniz.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Temel fonksiyonlar:</p>
          <ul className="list-disc list-inside ml-4 mt-2 space-y-1 text-sm text-muted-foreground">
            <li>Ürün tanımlama ve düzenleme</li>
            <li>Ürün Reçetesi (Malzeme Listesi - BOM) oluşturma ve yönetme</li>
            <li>Hammadde girişlerini kaydetme</li>
            <li>Üretim kayıtları ile stokları otomatik güncelleme</li>
            <li>Müşteri siparişlerini yönetme</li>
            <li>Sevkiyatları kaydetme ve stoktan düşme</li>
            <li>Anlık stok seviyelerini izleme</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
