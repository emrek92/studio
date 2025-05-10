
"use client";

import type { RawMaterialEntry } from "@/types";
import { getProductNameById, getProductCodeById, getSupplierNameById, getPurchaseOrderReferenceById } from "@/lib/store";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface RawMaterialEntryColumnsProps {
  onEdit: (entry: RawMaterialEntry) => void;
  onDelete: (entryId: string) => void;
}

export const getRawMaterialEntryColumns = ({ onEdit, onDelete }: RawMaterialEntryColumnsProps) => [
  {
    accessorKey: "productInfo",
    header: "Hammadde/Yardımcı Mlz.", 
    cell: ({ row }: { row: RawMaterialEntry }) => {
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
    accessorKey: "supplierId",
    header: "Tedarikçi",
    cell: ({ row }: { row: RawMaterialEntry }) => getSupplierNameById(row.supplierId) || "-",
  },
  {
    accessorKey: "purchaseOrderId",
    header: "Satınalma Siparişi",
    cell: ({ row }: { row: RawMaterialEntry }) => getPurchaseOrderReferenceById(row.purchaseOrderId) || "-",
  },
  {
    accessorKey: "notes",
    header: "Notlar",
    cell: ({ row }: { row: RawMaterialEntry }) => <div className="truncate max-w-xs">{row.notes || "-"}</div>,
  },
  {
    id: "actions",
    header: "İşlemler",
    cell: ({ row }: { row: RawMaterialEntry }) => {
      return (
         <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Menüyü aç</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>İşlemler</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onEdit(row)}>
              <Edit className="mr-2 h-4 w-4" /> Düzenle
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete(row.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
              <Trash2 className="mr-2 h-4 w-4" /> Sil
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
