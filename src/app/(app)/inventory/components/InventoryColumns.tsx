"use client";

import type { Product, ProductType } from "@/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const productTypeLabels: Record<ProductType, string> = {
  hammadde: "Xammal",
  yari_mamul: "Yarım Məhsul",
  mamul: "Məhsul",
  yardimci_malzeme: "Köməkçi Material",
};

export const inventoryColumns = [
  {
    accessorKey: "name",
    header: "Məhsul Adı",
    cell: ({ row }: { row: Product }) => <div className="font-medium">{row.name}</div>,
  },
  {
    accessorKey: "type",
    header: "Növü",
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
    header: "Ölçü Vahidi",
    cell: ({ row }: { row: Product }) => row.unit,
  },
  {
    accessorKey: "stock",
    header: () => <div className="text-right">Mövcud Stok</div>,
    cell: ({ row }: { row: Product }) => {
      const stock = parseFloat(row.stock.toString());
      const formattedStock = new Intl.NumberFormat("az-AZ").format(stock);
      return (
        <div className={cn(
          "text-right font-semibold",
          stock === 0 ? "text-destructive" : stock < 10 ? "text-orange-500" : "text-accent-foreground" // Using direct color here due to conditional styling, ideally use theme vars
        )}>
          {formattedStock}
        </div>
      );
    },
  },
  {
    accessorKey: "description",
    header: "Açıqlama",
    cell: ({ row }: { row: Product }) => <div className="text-sm text-muted-foreground truncate max-w-xs">{row.description || "-"}</div>,
  },
];
