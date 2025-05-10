"use client";

import * as React from "react";
import { useStore } from "@/lib/store";
import { DataTable } from "@/components/DataTable";
import { inventoryColumns } from "./components/InventoryColumns";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ProductType } from "@/types";

const productTypesForFilter: { value: ProductType | "all"; label: string }[] = [
  { value: "all", label: "Bütün Növlər" },
  { value: "hammadde", label: "Xammal" },
  { value: "yari_mamul", label: "Yarım Məhsul" },
  { value: "mamul", label: "Məhsul" },
  { value: "yardimci_malzeme", label: "Köməkçi Material" },
];

export default function InventoryPage() {
  const { products } = useStore();
  const [isMounted, setIsMounted] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedType, setSelectedType] = React.useState<ProductType | "all">("all");

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const filteredProducts = React.useMemo(() => {
    return products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = selectedType === "all" || product.type === selectedType;
      return matchesSearch && matchesType;
    });
  }, [products, searchTerm, selectedType]);

  if (!isMounted) {
    return <div className="flex items-center justify-center h-full"><p>Yüklənir...</p></div>;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold">Stok Səviyyələri</h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <Input 
            placeholder="Məhsul adı ilə axtar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          <Select value={selectedType} onValueChange={(value: ProductType | "all") => setSelectedType(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Növə görə filtrələ" />
            </SelectTrigger>
            <SelectContent>
              {productTypesForFilter.map(type => (
                <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <DataTable columns={inventoryColumns} data={filteredProducts} />
    </div>
  );
}
