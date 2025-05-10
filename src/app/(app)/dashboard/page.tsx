"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Package, ListChecks, Truck, Factory, Warehouse } from "lucide-react";
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
  const { products, boms, rawMaterialEntries, productionLogs } = useStore();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <div className="flex items-center justify-center h-full"><p>Yüklənir...</p></div>; // Or a proper loader
  }

  const totalProductTypes = products.length;
  const totalBoms = boms.length;
  const totalRawMaterialEntries = rawMaterialEntries.length;
  const totalProductionLogs = productionLogs.length;
  const totalStockItems = products.reduce((sum, p) => sum + p.stock, 0);


  return (
    <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Panel</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard 
          title="Ümumi Məhsul Növləri" 
          value={totalProductTypes} 
          icon={Package} 
          link="/products"
          description="Qeydiyyatdan keçmiş məhsul çeşidləri"
        />
        <StatCard 
          title="Ümumi Stok Miqdarı" 
          value={totalStockItems} 
          icon={Warehouse} 
          link="/inventory"
          description="Bütün məhsulların cəmi stoku"
        />
        <StatCard 
          title="BOM Siyahıları" 
          value={totalBoms} 
          icon={ListChecks} 
          link="/boms"
          description="Məhsul reseptlərinin sayı"
        />
        <StatCard 
          title="Xammal Girişləri" 
          value={totalRawMaterialEntries} 
          icon={Truck} 
          link="/raw-material-entries"
          description="Qeydə alınmış xammal daxilolmaları"
        />
        <StatCard 
          title="İstehsalat Qeydləri" 
          value={totalProductionLogs} 
          icon={Factory} 
          link="/productions"
          description="Tamamlanmış istehsal əməliyyatları"
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>StokTakip Sistemine Xoş Gəlmisiniz!</CardTitle>
          <CardDescription>
            Bu sistem vasitəsilə xammal, yarımməmul, məmul və köməkçi materiallarınızı effektiv şəkildə idarə edə bilərsiniz.
            Naviqasiya menyusundan istədiyiniz bölməyə keçid edə bilərsiniz.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Əsas funksiyalar:</p>
          <ul className="list-disc list-inside ml-4 mt-2 space-y-1 text-sm text-muted-foreground">
            <li>Məhsul tanımlama və redaktə etmə</li>
            <li>BOM (Material Siyahısı) yaratma və idarə etmə</li>
            <li>Xammal girişlərini qeyd etmə</li>
            <li>İstehsalat qeydləri ilə stokları avtomatik yeniləmə</li>
            <li>Anlık stok səviyyələrini izləmə</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
