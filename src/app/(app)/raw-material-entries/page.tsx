"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RawMaterialEntryForm } from "./components/RawMaterialEntryForm";
import { rawMaterialEntryColumns } from "./components/RawMaterialEntryColumns";
import { useStore } from "@/lib/store";
import { DataTable } from "@/components/DataTable";
import { PlusCircle } from "lucide-react";

export default function RawMaterialEntriesPage() {
  const { rawMaterialEntries } = useStore();
  const [isMounted, setIsMounted] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // const handleEdit = (entry: RawMaterialEntry) => { /* Future enhancement */ };
  // const handleDelete = (entryId: string) => { /* Future enhancement */ };
  // const columns = React.useMemo(() => getRawMaterialEntryColumns({ onEdit: handleEdit, onDelete: handleDelete }), []);
  const columns = rawMaterialEntryColumns;


  if (!isMounted) {
    return <div className="flex items-center justify-center h-full"><p>Yükleniyor...</p></div>;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Hammadde Girişleri</h1>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Yeni Giriş Ekle
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <RawMaterialEntryForm
              onSuccess={() => {
                setIsFormOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
      <DataTable columns={columns} data={rawMaterialEntries.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())} />
    </div>
  );
}
