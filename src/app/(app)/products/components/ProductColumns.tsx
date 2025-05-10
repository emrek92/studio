"use client";

import type { Product, ProductType } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DotsHorizontalIcon } from "@radix-ui/react-icons";

const productTypeLabels: Record<ProductType, string> = {
  hammadde: "Xammal",
  yari_mamul: "Yarım Məhsul",
  mamul: "Məhsul",
  yardimci_malzeme: "Köməkçi Material",
};

interface ProductColumnsProps {
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
}

export const getProductColumns = ({ onEdit, onDelete }: ProductColumnsProps) => [
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
        row.type === 'yari_mamul' ? 'outline' : 'default' // Adjust as needed
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
    header: () => <div className="text-right">Stok Miqdarı</div>,
    cell: ({ row }: { row: Product }) => {
      const stock = parseFloat(row.stock.toString()); // Ensure it's a number
      const formattedStock = new Intl.NumberFormat("az-AZ").format(stock); // Format for Azerbaijan
      return <div className="text-right font-medium">{formattedStock}</div>;
    },
  },
  {
    id: "actions",
    header: "Əməliyyatlar",
    cell: ({ row }: { row: Product }) => {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Menyu aç</span>
              <DotsHorizontalIcon className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Əməliyyatlar</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onEdit(row)}>
              <Edit className="mr-2 h-4 w-4" /> Redaktə Et
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
