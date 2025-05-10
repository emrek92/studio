"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { UploadCloud, Download, FileText } from "lucide-react";

interface ExcelImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityName: string; // e.g., "Ürünler", "Ürün Reçeteleri"
  templateGenerator: () => void; // Function to trigger template download
  onImport: (file: File) => Promise<void>; // Async function to handle file import
  templateFileName?: string; // Optional specific template file name
}

export function ExcelImportDialog({
  open,
  onOpenChange,
  entityName,
  templateGenerator,
  onImport,
  templateFileName
}: ExcelImportDialogProps) {
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [isImporting, setIsImporting] = React.useState(false);
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || file.type === "application/vnd.ms-excel") {
        setSelectedFile(file);
      } else {
        toast({
          title: "Geçersiz Dosya Türü",
          description: "Lütfen bir Excel dosyası (.xlsx veya .xls) seçin.",
          variant: "destructive",
        });
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = ""; // Reset file input
        }
      }
    }
  };

  const handleImportClick = async () => {
    if (!selectedFile) {
      toast({
        title: "Dosya Seçilmedi",
        description: "Lütfen içe aktarmak için bir Excel dosyası seçin.",
        variant: "destructive",
      });
      return;
    }
    setIsImporting(true);
    try {
      await onImport(selectedFile);
      // Success toast is handled by the onImport implementation
      // onOpenChange(false); // Keep dialog open to see results, or close if preferred
      // setSelectedFile(null); // Reset file
      // if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error: any) {
      toast({
        title: "İçe Aktarma Hatası",
        description: error.message || "Dosya içe aktarılırken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  React.useEffect(() => {
    if (!open) {
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setIsImporting(false);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{entityName} için Excel'den İçe Aktar</DialogTitle>
          <DialogDescription>
            Verileri toplu olarak içe aktarmak için bir Excel dosyası yükleyin. Öncelikle doğru format için şablonu indirmeniz önerilir.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div>
            <Button onClick={templateGenerator} variant="outline" className="w-full">
              <Download className="mr-2 h-4 w-4" /> Şablonu İndir ({templateFileName || `${entityName}_Sablonu.xlsx`})
            </Button>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="excelFile" className="text-sm font-medium">Excel Dosyası Seçin</label>
            <Input 
              id="excelFile" 
              type="file" 
              ref={fileInputRef}
              accept=".xlsx, .xls" 
              onChange={handleFileChange} 
              className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
            />
            {selectedFile && (
              <div className="text-sm text-muted-foreground flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                <FileText className="h-5 w-5 text-primary" />
                <span>Seçilen dosya: {selectedFile.name}</span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">İptal Et</Button>
          </DialogClose>
          <Button onClick={handleImportClick} disabled={!selectedFile || isImporting}>
            {isImporting ? (
              <><UploadCloud className="mr-2 h-4 w-4 animate-spin" /> İçe Aktarılıyor...</>
            ) : (
              <><UploadCloud className="mr-2 h-4 w-4" /> İçe Aktar</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
