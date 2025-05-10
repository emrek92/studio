
"use client";

import type { Supplier } from "@/types";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, MoreHorizontal, Mail, Phone, User } from "lucide-react"; 
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

interface SupplierColumnsProps {
  onEdit: (supplier: Supplier) => void;
  onDelete: (supplierId: string) => void;
}

export const getSupplierColumns = ({ onEdit, onDelete }: SupplierColumnsProps) => [
  {
    accessorKey: "name",
    header: "Tedarikçi Adı",
    cell: ({ row }: { row: Supplier }) => <div className="font-medium">{row.name}</div>,
  },
  {
    accessorKey: "contactPerson",
    header: "Yetkili Kişi",
    cell: ({ row }: { row: Supplier }) => row.contactPerson || "-",
  },
  {
    accessorKey: "email",
    header: "E-posta",
    cell: ({ row }: { row: Supplier }) => row.email ? (
      <a href={`mailto:${row.email}`} className="text-primary hover:underline flex items-center gap-1">
        <Mail className="h-3 w-3"/> {row.email}
      </a>
    ) : "-",
  },
  {
    accessorKey: "phone",
    header: "Telefon",
    cell: ({ row }: { row: Supplier }) => row.phone || "-",
  },
  {
    accessorKey: "address",
    header: "Adres",
    cell: ({ row }: { row: Supplier }) => (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="truncate max-w-xs cursor-default">{row.address || "-"}</div>
                </TooltipTrigger>
                {row.address && (
                    <TooltipContent className="max-w-xs">
                        <p>{row.address}</p>
                    </TooltipContent>
                )}
            </Tooltip>
        </TooltipProvider>
    )
  },
  {
    id: "actions",
    header: "İşlemler",
    cell: ({ row }: { row: Supplier }) => {
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
