
"use client";

import * as React from "react";
import { StockCountForm } from "./components/StockCountForm";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import type { Product } from "@/types";
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
import { Button } from "@/components/ui/button";

interface CountItem {
  productId: string;
  quantity: number;
}

export default function StockCountsPage() {
  const { products, applyStockCount, getProductById } = useStore();
  const { toast } = useToast();
  const [isMounted, setIsMounted] = React.useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = React.useState(false);
  const [pendingCounts, setPendingCounts] = React.useState<CountItem[] | null>(null);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleSaveCount = (counts: CountItem[]) => {
    setPendingCounts(counts);
    setIsConfirmDialogOpen(true);
  };

  const confirmApplyCount = () => {
    if (pendingCounts) {
      try {
        applyStockCount(pendingCounts);
        toast({
          title: "Stok Sayımı Uygulandı",
          description: "Tüm ürün stokları başarıyla güncellendi.",
        });
      } catch (error: any) {
        toast({
          title: "Hata",
          description: error.message || "Stok sayımı uygulanırken bir hata oluştu.",
          variant: "destructive",
        });
      }
    }
    setIsConfirmDialogOpen(false);
    setPendingCounts(null);
  };

  if (!isMounted) {
    return <div className="flex items-center justify-center h-full"><p>Yükleniyor...</p></div>;
  }
  
  // Prepare initial values for the form, ensuring all products are included.
  const initialFormValues = products.map(p => ({
    productId: p.id,
    countedQuantity: p.stock, // Pre-fill with current stock
  }));

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Stok Sayımı</h1>
      </div>
      <StockCountForm
        initialProducts={products}
        onSubmit={handleSaveCount}
        getProductById={getProductById}
      />
      <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Stok Sayımını Onayla</AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlem tüm ürünlerin stok miktarlarını girilen sayım değerlerine göre güncelleyecektir. Bu işlem geri alınamaz. Devam etmek istediğinize emin misiniz?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingCounts(null)}>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmApplyCount}>Onayla ve Uygula</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
