"use client";

import * as React from "react";
import { useStore } from "@/lib/store";
import { DataTable } from "@/components/DataTable";
import { inventoryColumns } from "./components/InventoryColumns";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ProductType } from "@/types";

const productTypesForFilter: { value: ProductType | "all"; label: string }[] = [
  { value: "all", label: "Tüm Türler" },
  { value: "hammadde", label: "Hammadde" },
  { value: "yari_mamul", label: "Yarı Mamul" },
  { value: "mamul", label: "Mamul" },
  { value: "yardimci_malzeme", label: "Yardımcı Malzeme" },
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
    return <div className="flex items-center justify-center h-full"><p>Yükleniyor...</p></div>;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold">Stok Seviyeleri</h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <Input 
            placeholder="Ürün adı ile ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          <Select value={selectedType} onValueChange={(value: ProductType | "all") => setSelectedType(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Türe göre filtrele" />
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
