
"use client";

import type { ProductionLog } from "@/types";
import { useStore, getProductNameById, getProductCodeById } from "@/lib/store";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

export const productionLogColumns = [
  {
    accessorKey: "productInfo",
    header: "Üretilen Ürün", // Changed header
    cell: ({ row }: { row: ProductionLog }) => {
      const name = getProductNameById(row.productId);
      const code = getProductCodeById(row.productId);
      return (
        <div>
          <div className="font-medium">{name}</div>
          {code && <div className="text-xs text-muted-foreground font-mono">{code}</div>}
        </div>
      );
    },
  },
  {
    accessorKey: "bomName",
    header: "Kullanılan Ürün Reçetesi (BOM)",
    cell: ({ row }: { row: ProductionLog }) => {
      const bom = useStore.getState().boms.find(b => b.id === row.bomId);
      return bom ? bom.name : "Bilinmeyen Ürün Reçetesi (BOM)";
    },
  },
  {
    accessorKey: "quantity",
    header: () => <div className="text-right">Miktar</div>,
    cell: ({ row }: { row: ProductionLog }) => {
      const quantity = parseFloat(row.quantity.toString());
      const formattedQuantity = new Intl.NumberFormat("tr-TR").format(quantity);
      return <div className="text-right font-medium">{formattedQuantity}</div>;
    },
  },
  {
    accessorKey: "date",
    header: "Tarih",
    cell: ({ row }: { row: ProductionLog }) => format(new Date(row.date), "dd/MM/yyyy", { locale: tr }),
  },
  {
    accessorKey: "notes",
    header: "Notlar",
    cell: ({ row }: { row: ProductionLog }) => <div className="truncate max-w-xs">{row.notes || "-"}</div>,
  },
  // Actions column (Edit/Delete) can be added later if needed
  // {
  //   id: "actions",
  //   header: "İşlemler",
  //   cell: ({ row }: { row: ProductionLog }) => { /* Action buttons */ }
  // },
];

