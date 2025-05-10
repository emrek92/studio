"use client";

import type { BOM } from "@/types";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, List, MoreHorizontal } from "lucide-react"; 
import { getProductNameById, getProductCodeById } from "@/lib/store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"


interface BomColumnsProps {
  onEdit: (bom: BOM) => void;
  onDelete: (bomId: string) => void;
}

export const getBomColumns = ({ onEdit, onDelete }: BomColumnsProps) => [
  {
    accessorKey: "name",
    header: "Ürün Reçetesi Adı",
    cell: ({ row }: { row: BOM }) => <div className="font-medium">{row.name}</div>,
  },
  {
    accessorKey: "mainProductInfo",
    header: "Ana Ürün (Kod - Ad)",
    cell: ({ row }: { row: BOM }) => {
        const code = getProductCodeById(row.productId);
        const name = getProductNameById(row.productId);
        return code ? `${code} - ${name}` : name;
    }
  },
  {
    accessorKey: "componentCount",
    header: "Bileşen Sayısı",
    cell: ({ row }: { row: BOM }) => {
      const count = row.components.length;
      
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 cursor-default">
                <List className="h-4 w-4 text-muted-foreground" /> 
                {count}
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs whitespace-pre-line text-sm bg-popover text-popover-foreground p-2 rounded-md shadow-lg border">
              <p className="font-semibold mb-1">Bileşenler:</p>
              {row.components.map(c => {
                const componentCode = getProductCodeById(c.productId);
                const componentName = getProductNameById(c.productId);
                return (
                  <div key={c.productId} className="text-xs">
                    {componentCode ? `${componentCode} - ` : ''}{componentName}: {c.quantity}
                  </div>
                )
              })}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
  },
  {
    id: "actions",
    header: "İşlemler",
    cell: ({ row }: { row: BOM }) => {
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
