
"use client";

import type { CustomerOrder } from "@/types"; // OrderStatus removed
import { useStore, getProductNameById, getProductCodeById, getProductUnitById } from "@/lib/store";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
// Badge removed as status is removed
import { Edit, Trash2, MoreHorizontal, PackageOpen } from "lucide-react";
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
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface CustomerOrderColumnsProps {
  onEdit: (order: CustomerOrder) => void;
  onDelete: (orderId: string) => void;
}

// orderStatusLabels and orderStatusColors removed

export const getCustomerOrderColumns = ({ onEdit, onDelete }: CustomerOrderColumnsProps) => [
  // orderReference column removed
  {
    accessorKey: "customerName",
    header: "Müşteri Adı",
    cell: ({ row }: { row: CustomerOrder }) => <div className="font-medium">{row.customerName}</div>,
  },
  {
    accessorKey: "orderDate",
    header: "Sipariş Tarihi",
    cell: ({ row }: { row: CustomerOrder }) => format(new Date(row.orderDate), "dd/MM/yyyy", { locale: tr }),
  },
  {
    accessorKey: "items",
    header: "Ürünler",
    cell: ({ row }: { row: CustomerOrder }) => {
      const itemCount = row.items.length;
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 cursor-default">
                <PackageOpen className="h-4 w-4 text-muted-foreground" /> 
                {itemCount} çeşit ürün
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-md whitespace-pre-line text-sm bg-popover text-popover-foreground p-3 rounded-md shadow-lg border">
              <p className="font-semibold mb-2 text-base">Sipariş İçeriği:</p>
              {row.items.map((item, index) => {
                const productName = getProductNameById(item.productId);
                const productCode = getProductCodeById(item.productId);
                const productUnit = getProductUnitById(item.productId);
                return (
                  <div key={index} className="text-xs mb-1 border-b border-border/50 pb-1 last:border-b-0 last:pb-0">
                    {productCode && <span className="font-mono bg-muted text-muted-foreground px-1 py-0.5 rounded text-[10px]">{productCode}</span>}
                    <span className={cn("font-medium", productCode ? "ml-1" : "")}>{productName}</span>
                    <div className="text-muted-foreground">
                        Miktar: {item.quantity} {productUnit || ''}
                        {/* Unit price removed */}
                    </div>
                  </div>
                )
              })}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
  },
  // totalAmount column removed
  // status column removed
  {
    id: "actions",
    header: "İşlemler",
    cell: ({ row }: { row: CustomerOrder }) => {
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

