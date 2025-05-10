"use client";

import type { RawMaterialEntry } from "@/types";
import { getProductNameById } from "@/lib/store";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

export const rawMaterialEntryColumns = [
  {
    accessorKey: "productName",
    header: "Hammadde Adı",
    cell: ({ row }: { row: RawMaterialEntry }) => <div className="font-medium">{getProductNameById(row.productId)}</div>,
  },
  {
    accessorKey: "quantity",
    header: () => <div className="text-right">Miktar</div>,
    cell: ({ row }: { row: RawMaterialEntry }) => {
      const quantity = parseFloat(row.quantity.toString());
      const formattedQuantity = new Intl.NumberFormat("tr-TR").format(quantity);
      return <div className="text-right font-medium">{formattedQuantity}</div>;
    },
  },
  {
    accessorKey: "date",
    header: "Tarih",
    cell: ({ row }: { row: RawMaterialEntry }) => format(new Date(row.date), "dd/MM/yyyy", { locale: tr }),
  },
  {
    accessorKey: "supplier",
    header: "Tedarikçi",
    cell: ({ row }: { row: RawMaterialEntry }) => row.supplier || "-",
  },
  {
    accessorKey: "notes",
    header: "Notlar",
    cell: ({ row }: { row: RawMaterialEntry }) => <div className="truncate max-w-xs">{row.notes || "-"}</div>,
  },
  // { // Actions column for future enhancements
  //   id: "actions",
  //   header: "İşlemler",
  //   cell: ({ row }: { row: RawMaterialEntry }) => { /* Action buttons */ }
  // },
];
