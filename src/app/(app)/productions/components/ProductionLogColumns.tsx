
"use client";

import type { ProductionLog } from "@/types";
import { useStore, getProductNameById, getProductCodeById } from "@/lib/store";
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

interface ProductionLogColumnsProps {
  onEdit: (log: ProductionLog) => void;
  onDelete: (logId: string) => void;
}

export const getProductionLogColumns = ({ onEdit, onDelete }: ProductionLogColumnsProps) => [
  {
    accessorKey: "productInfo",
    header: "Üretilen Ürün", 
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
  {
    id: "actions",
    header: "İşlemler",
    cell: ({ row }: { row: ProductionLog }) => {
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
