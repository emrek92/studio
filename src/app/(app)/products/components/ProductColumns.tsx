"use client";

import type { Product, ProductType } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const productTypeLabels: Record<ProductType, string> = {
  hammadde: "Hammadde",
  yari_mamul: "Yarı Mamul",
  mamul: "Mamul",
  yardimci_malzeme: "Yardımcı Malzeme",
};

interface ProductColumnsProps {
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
}

export const getProductColumns = ({ onEdit, onDelete }: ProductColumnsProps) => [
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
    header: () => <div className="text-right">Stok Miktarı</div>,
    cell: ({ row }: { row: Product }) => {
      const stock = parseFloat(row.stock.toString()); 
      const formattedStock = new Intl.NumberFormat("tr-TR").format(stock); 
      return <div className="text-right font-medium">{formattedStock}</div>;
    },
  },
  {
    id: "actions",
    header: "İşlemler",
    cell: ({ row }: { row: Product }) => {
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
