"use client";

import type { Product, ProductType } from "@/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const productTypeLabels: Record<ProductType, string> = {
  hammadde: "Hammadde",
  yari_mamul: "Yarı Mamul",
  mamul: "Mamul",
  yardimci_malzeme: "Yardımcı Malzeme",
};

export const inventoryColumns = [
  {
    accessorKey: "productCode",
    header: "Ürün Kodu",
    cell: ({ row }: { row: Product }) => <div className="font-mono">{row.productCode}</div>,
  },
  {
    accessorKey: "name",
    header: "Ürün Adı",
    cell: ({ row }: { row: Product }) => <div className="font-medium">{row.name}</div>,
  },
  {
    accessorKey: "type",
    header: "Türü",
    cell: ({ row }: { row: Product }) => (
      <Badge variant={
        row.type === 'mamul' ? 'default' : 
        row.type === 'hammadde' ? 'secondary' :
        row.type === 'yari_mamul' ? 'outline' : 'default'
      }>
        {productTypeLabels[row.type]}
      </Badge>
    ),
  },
  {
    accessorKey: "unit",
    header: "Ölçü Birimi",
    cell: ({ row }: { row: Product }) => row.unit,
  },
  {
    accessorKey: "stock",
    header: () => <div className="text-right">Mevcut Stok</div>,
    cell: ({ row }: { row: Product }) => {
      const stock = parseFloat(row.stock.toString());
      const formattedStock = new Intl.NumberFormat("tr-TR").format(stock);
      return (
        <div className={cn(
          "text-right font-semibold",
          stock === 0 ? "text-destructive" : stock < 10 ? "text-orange-500" : "text-accent-foreground" 
        )}>
          {formattedStock}
        </div>
      );
    },
  },
  {
    accessorKey: "description",
    header: "Açıklama",
    cell: ({ row }: { row: Product }) => <div className="text-sm text-muted-foreground truncate max-w-xs">{row.description || "-"}</div>,
  },
];
