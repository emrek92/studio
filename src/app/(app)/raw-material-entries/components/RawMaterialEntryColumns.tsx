"use client";

import type { RawMaterialEntry } from "@/types";
import { getProductNameById } from "@/lib/store";
import { format } from "date-fns";
// import { Button } from "@/components/ui/button";
// import { Edit, Trash2 } from "lucide-react";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuLabel,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
// import { DotsHorizontalIcon } from "@radix-ui/react-icons";

// Interface for future edit/delete actions
// interface RawMaterialEntryColumnsProps {
//   onEdit: (entry: RawMaterialEntry) => void;
//   onDelete: (entryId: string) => void;
// }

// export const getRawMaterialEntryColumns = ({ onEdit, onDelete }: RawMaterialEntryColumnsProps) => [
export const rawMaterialEntryColumns = [
  {
    accessorKey: "productName",
    header: "Xammal Adı",
    cell: ({ row }: { row: RawMaterialEntry }) => <div className="font-medium">{getProductNameById(row.productId)}</div>,
  },
  {
    accessorKey: "quantity",
    header: () => <div className="text-right">Miqdar</div>,
    cell: ({ row }: { row: RawMaterialEntry }) => {
      const quantity = parseFloat(row.quantity.toString());
      const formattedQuantity = new Intl.NumberFormat("az-AZ").format(quantity);
      return <div className="text-right font-medium">{formattedQuantity}</div>;
    },
  },
  {
    accessorKey: "date",
    header: "Tarix",
    cell: ({ row }: { row: RawMaterialEntry }) => format(new Date(row.date), "dd/MM/yyyy"),
  },
  {
    accessorKey: "supplier",
    header: "Təchizatçı",
    cell: ({ row }: { row: RawMaterialEntry }) => row.supplier || "-",
  },
  {
    accessorKey: "notes",
    header: "Qeydlər",
    cell: ({ row }: { row: RawMaterialEntry }) => <div className="truncate max-w-xs">{row.notes || "-"}</div>,
  },
  // { // Actions column for future enhancements
  //   id: "actions",
  //   header: "Əməliyyatlar",
  //   cell: ({ row }: { row: RawMaterialEntry }) => { /* Action buttons */ }
  // },
];
