"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ProductionLogForm } from "./components/ProductionLogForm";
import { productionLogColumns } from "./components/ProductionLogColumns";
import { useStore } from "@/lib/store";
import { DataTable } from "@/components/DataTable";
import { PlusCircle } from "lucide-react";

export default function ProductionLogsPage() {
  const { productionLogs } = useStore();
  const [isMounted, setIsMounted] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const columns = productionLogColumns;

  if (!isMounted) {
    return <div className="flex items-center justify-center h-full"><p>Yükleniyor...</p></div>;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Üretim Kayıtları</h1>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Yeni Üretim Kaydı
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <ProductionLogForm
              onSuccess={() => {
                setIsFormOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
      <DataTable columns={columns} data={productionLogs.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())} />
    </div>
  );
}
