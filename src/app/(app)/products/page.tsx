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
          title: "Silinmə Xətası",
          description: "Bu məhsul bir və ya daha çox BOM siyahısında istifadə olunur. Əvvəlcə BOM-lardan silin.",
          variant: "destructive",
        });
        setProductToDelete(null);
        return;
      }
      
      deleteProduct(productToDelete);
      toast({ title: "Məhsul Silindi", description: "Məhsul uğurla silindi." });
      setProductToDelete(null);
    }
  };

  const columns = React.useMemo(() => getProductColumns({ onEdit: handleEdit, onDelete: handleDeleteConfirm }), [handleEdit, handleDeleteConfirm]);

  if (!isMounted) {
    // To prevent hydration mismatch with zustand persisted state
    return <div className="flex items-center justify-center h-full"><p>Yüklənir...</p></div>;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Məhsullar</h1>
        <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
            setIsFormOpen(isOpen);
            if (!isOpen) setEditingProduct(undefined);
        }}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Yeni Məhsul Əlavə Et
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
              <AlertDialogTitle>Məhsulu Silməyə Əminsiniz?</AlertDialogTitle>
              <AlertDialogDescription>
                Bu əməliyyat geri qaytarıla bilməz. Bu məhsul bazadan həmişəlik silinəcək.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setProductToDelete(null)}>Ləğv Et</AlertDialogCancel>
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
