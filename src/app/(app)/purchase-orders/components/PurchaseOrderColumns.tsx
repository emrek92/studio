
"use client";

import type { PurchaseOrder, PurchaseOrderItem } from "@/types";
import { useStore, getSupplierNameById, getProductNameById, getProductCodeById, getProductUnitById } from "@/lib/store";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, MoreHorizontal, PackageSearch } from "lucide-react"; 
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
import { cn } from "@/lib/utils";

interface PurchaseOrderColumnsProps {
  onEdit: (order: PurchaseOrder) => void;
  onDelete: (orderId: string) => void;
}

const statusLabels: Record<PurchaseOrder['status'], string> = {
  open: "Açık",
  partially_received: "Kısmen Teslim Alındı",
  closed: "Kapalı",
  cancelled: "İptal Edildi",
};

const statusColors: Record<PurchaseOrder['status'], string> = {
  open: "bg-blue-500 hover:bg-blue-600",
  partially_received: "bg-yellow-500 hover:bg-yellow-600",
  closed: "bg-green-500 hover:bg-green-600",
  cancelled: "bg-red-500 hover:bg-red-600",
};


export const getPurchaseOrderColumns = ({ onEdit, onDelete }: PurchaseOrderColumnsProps) => [
  {
    accessorKey: "orderReference",
    header: "Sipariş Referansı",
    cell: ({ row }: { row: PurchaseOrder }) => <div className="font-medium">{row.orderReference || "-"}</div>,
  },
  {
    accessorKey: "supplierId",
    header: "Tedarikçi",
    cell: ({ row }: { row: PurchaseOrder }) => getSupplierNameById(row.supplierId),
  },
  {
    accessorKey: "orderDate",
    header: "Sipariş Tarihi",
    cell: ({ row }: { row: PurchaseOrder }) => format(new Date(row.orderDate), "dd/MM/yyyy", { locale: tr }),
  },
   {
    accessorKey: "expectedDeliveryDate",
    header: "Bek. Teslim Tarihi",
    cell: ({ row }: { row: PurchaseOrder }) => row.expectedDeliveryDate ? format(new Date(row.expectedDeliveryDate), "dd/MM/yyyy", { locale: tr }) : "-",
  },
  {
    accessorKey: "items",
    header: "Ürünler",
    cell: ({ row }: { row: PurchaseOrder }) => {
      const itemCount = row.items.length;
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 cursor-default">
                <PackageSearch className="h-4 w-4 text-muted-foreground" /> 
                {itemCount} çeşit ürün
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-md whitespace-pre-line text-sm bg-popover text-popover-foreground p-3 rounded-md shadow-lg border">
              <p className="font-semibold mb-2 text-base">Sipariş İçeriği:</p>
              {row.items.map((item: PurchaseOrderItem, index: number) => {
                const productName = getProductNameById(item.productId);
                const productCode = getProductCodeById(item.productId);
                const productUnit = getProductUnitById(item.productId);
                return (
                  <div key={index} className="text-xs mb-1 border-b border-border/50 pb-1 last:border-b-0 last:pb-0">
                    {productCode && <span className="font-mono bg-muted text-muted-foreground px-1 py-0.5 rounded text-[10px]">{productCode}</span>}
                    <span className={cn("font-medium", productCode ? "ml-1" : "")}>{productName}</span>
                    <div className="text-muted-foreground">
                        Sipariş: {item.orderedQuantity} {productUnit || ''}
                    </div>
                    <div className="text-xs text-accent-foreground/80">
                        Teslim Alınan: {item.receivedQuantity} {productUnit || ''}
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
  {
    accessorKey: "status",
    header: "Durum",
    cell: ({ row }: { row: PurchaseOrder }) => (
      <Badge variant="default" className={cn(statusColors[row.status], "text-white")}>
        {statusLabels[row.status]}
      </Badge>
    ),
  },
  {
    id: "actions",
    header: "İşlemler",
    cell: ({ row }: { row: PurchaseOrder }) => {
      const canEditOrDelete = row.status === 'open' || row.status === 'cancelled'; // Example: only allow edit/delete if open or cancelled
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
            <DropdownMenuItem onClick={() => onEdit(row)} disabled={!canEditOrDelete}>
              <Edit className="mr-2 h-4 w-4" /> Düzenle
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete(row.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10" disabled={!canEditOrDelete}>
              <Trash2 className="mr-2 h-4 w-4" /> Sil
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
