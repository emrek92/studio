"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { BomForm } from "./components/BomForm";
import { getBomColumns } from "./components/BomColumns";
import { useStore } from "@/lib/store";
import type { BOM } from "@/types";
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

export default function BomsPage() {
  const { boms, deleteBom } = useStore();
  const [isMounted, setIsMounted] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingBom, setEditingBom] = React.useState<BOM | undefined>(undefined);
  const [bomToDelete, setBomToDelete] = React.useState<string | null>(null);
  const { toast } = useToast();

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleEdit = (bom: BOM) => {
    setEditingBom(bom);
    setIsFormOpen(true);
  };

  const handleDeleteConfirm = (bomId: string) => {
    setBomToDelete(bomId);
  };

  const handleDelete = () => {
    if (bomToDelete) {
      const isUsedInProduction = useStore.getState().productionLogs.some(log => log.bomId === bomToDelete);
      if (isUsedInProduction) {
         toast({
          title: "Silme Hatası",
          description: "Bu Ürün Reçetesi (BOM) bir veya daha fazla üretim kaydında kullanılıyor. Lütfen önce üretim kayıtlarını silin/değiştirin.",
          variant: "destructive",
        });
        setBomToDelete(null);
        return;
      }

      deleteBom(bomToDelete);
      toast({ title: "Ürün Reçetesi (BOM) Silindi", description: "Ürün Reçetesi (BOM) başarıyla silindi." });
      setBomToDelete(null);
    }
  };

  const columns = React.useMemo(() => getBomColumns({ onEdit: handleEdit, onDelete: handleDeleteConfirm }), [handleEdit, handleDeleteConfirm]);

  if (!isMounted) {
    return <div className="flex items-center justify-center h-full"><p>Yükleniyor...</p></div>;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Ürün Reçeteleri (BOM)</h1>
        <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
            setIsFormOpen(isOpen);
            if (!isOpen) setEditingBom(undefined);
        }}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Yeni Ürün Reçetesi Oluştur
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <BomForm
              bom={editingBom}
              onSuccess={() => {
                setIsFormOpen(false);
                setEditingBom(undefined);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
      <DataTable columns={columns} data={boms} />

       {bomToDelete && (
        <AlertDialog open={!!bomToDelete} onOpenChange={() => setBomToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Ürün Reçetesini (BOM) Silmek İstediğinize Emin Misiniz?</AlertDialogTitle>
              <AlertDialogDescription>
                Bu işlem geri alınamaz. Bu Ürün Reçetesi (BOM) veritabanından kalıcı olarak silinecektir.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setBomToDelete(null)}>İptal Et</AlertDialogCancel>
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
