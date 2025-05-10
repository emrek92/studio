"use client";

import type { ProductionLog } from "@/types";
import { useStore, getProductNameById } from "@/lib/store";
import { format } from "date-fns";
// Import other necessary components like Button, DropdownMenu etc. if actions are needed

export const productionLogColumns = [
  {
    accessorKey: "productName",
    header: "İstehsal Olunan Məhsul",
    cell: ({ row }: { row: ProductionLog }) => <div className="font-medium">{getProductNameById(row.productId)}</div>,
  },
  {
    accessorKey: "bomName",
    header: "İstifadə Olunan BOM",
    cell: ({ row }: { row: ProductionLog }) => {
      const bom = useStore.getState().boms.find(b => b.id === row.bomId);
      return bom ? bom.name : "Bilinməyən BOM";
    },
  },
  {
    accessorKey: "quantity",
    header: () => <div className="text-right">Miqdar</div>,
    cell: ({ row }: { row: ProductionLog }) => {
      const quantity = parseFloat(row.quantity.toString());
      const formattedQuantity = new Intl.NumberFormat("az-AZ").format(quantity);
      return <div className="text-right font-medium">{formattedQuantity}</div>;
    },
  },
  {
    accessorKey: "date",
    header: "Tarix",
    cell: ({ row }: { row: ProductionLog }) => format(new Date(row.date), "dd/MM/yyyy"),
  },
  {
    accessorKey: "notes",
    header: "Qeydlər",
    cell: ({ row }: { row: ProductionLog }) => <div className="truncate max-w-xs">{row.notes || "-"}</div>,
  },
  // Actions column (Edit/Delete) can be added later if needed
  // {
  //   id: "actions",
  //   header: "Əməliyyatlar",
  //   cell: ({ row }: { row: ProductionLog }) => { /* Action buttons */ }
  // },
];
