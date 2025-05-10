"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ProductForm } from "./components/ProductForm";
import { getProductColumns } from "./components/ProductColumns";
import { useStore } from "@/lib/store";
import type { Product } from "@/types";
import { DataTable } from "@/components/DataTable";
import { PlusCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ProductsPage() {
  const { products, deleteProduct } = useStore();
  const [isMounted, setIsMounted] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingProduct, setEditingProduct] = React.useState<Product | undefined>(undefined);
  const [productToDelete, setProductToDelete] = React.useState<string | null>(null);
  const { toast } = useToast();

  React.useEffect(() => {
    setIsMounted(true);
  }, []);
  
  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  const handleDeleteConfirm = (productId: string) => {
    setProductToDelete(productId);
  };

  const handleDelete = () => {
    if (productToDelete) {
      // Check if product is used in BOMs (optional, for better UX)
      const isUsedInBom = useStore.getState().boms.some(bom => bom.components.some(c => c.productId === productToDelete));
      if (isUsedInBom) {
        toast({
          title: "Silme Hatası",
          description: "Bu ürün bir veya daha fazla Ürün Reçetesinde (BOM) kullanılmaktadır. Lütfen önce Ürün Reçetelerinden kaldırın.",
          variant: "destructive",
        });
        setProductToDelete(null);
        return;
      }
      
      deleteProduct(productToDelete);
      toast({ title: "Ürün Silindi", description: "Ürün başarıyla silindi." });
      setProductToDelete(null);
    }
  };

  const columns = React.useMemo(() => getProductColumns({ onEdit: handleEdit, onDelete: handleDeleteConfirm }), [handleEdit, handleDeleteConfirm]);

  if (!isMounted) {
    // To prevent hydration mismatch with zustand persisted state
    return <div className="flex items-center justify-center h-full"><p>Yükleniyor...</p></div>;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Ürünler</h1>
        <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
            setIsFormOpen(isOpen);
            if (!isOpen) setEditingProduct(undefined);
        }}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Yeni Ürün Ekle
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <ProductForm
              product={editingProduct}
              onSuccess={() => {
                setIsFormOpen(false);
                setEditingProduct(undefined);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
      <DataTable columns={columns} data={products} />

      {productToDelete && (
        <AlertDialog open={!!productToDelete} onOpenChange={() => setProductToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Ürünü Silmek İstediğinize Emin Misiniz?</AlertDialogTitle>
              <AlertDialogDescription>
                Bu işlem geri alınamaz. Bu ürün veritabanından kalıcı olarak silinecektir.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setProductToDelete(null)}>İptal Et</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                Sil
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
