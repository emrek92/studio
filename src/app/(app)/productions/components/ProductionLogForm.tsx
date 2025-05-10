
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as React from "react";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useStore } from "@/lib/store";
import type { ProductionLog, Product, BOM } from "@/types";
import { DialogFooter, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { ProductCombobox } from "@/components/ProductCombobox";

const productionLogFormSchema = z.object({
  productId: z.string().min(1, "Ürün seçilmelidir."),
  bomId: z.string().min(1, "Ürün Reçetesi (BOM) seçilmelidir."),
  quantity: z.coerce.number().positive("Miktar pozitif olmalıdır."),
  date: z.date({ required_error: "Tarih seçilmelidir." }),
  notes: z.string().optional(),
});

type ProductionLogFormValues = z.infer<typeof productionLogFormSchema>;

interface ProductionLogFormProps {
  log?: ProductionLog; 
  onSuccess: () => void;
}

export function ProductionLogForm({ log, onSuccess }: ProductionLogFormProps) {
  const { products, boms, addProductionLog, updateProductionLog } = useStore();
  const { toast } = useToast();

  const finishedProducts = products.filter(p => p.type === 'mamul');
  
  const form = useForm<ProductionLogFormValues>({
    resolver: zodResolver(productionLogFormSchema),
    defaultValues: log
      ? { ...log, date: new Date(log.date), notes: log.notes || "" }
      : {
          productId: "",
          bomId: "",
          quantity: 0,
          date: new Date(),
          notes: "",
        },
  });

  const selectedProductId = form.watch("productId");
  const availableBoms = React.useMemo(() => {
    if (!selectedProductId) return [];
    return boms.filter(b => b.productId === selectedProductId);
  }, [selectedProductId, boms]);

  React.useEffect(() => {
    if (log && log.productId === selectedProductId && availableBoms.find(b => b.id === log.bomId)) {
       // Valid bomId already set
    } else if (selectedProductId) {
      const currentBomId = form.getValues("bomId");
      if (!availableBoms.find(b => b.id === currentBomId)) {
        form.setValue("bomId", ""); // Reset if current BOM is not valid for new product
      }
    } else {
        form.setValue("bomId", ""); // No product selected, no BOM
    }
  }, [selectedProductId, availableBoms, form, log]);


  function onSubmit(data: ProductionLogFormValues) {
    try {
      const logDataWithISOStringDate = {
        ...data,
        date: data.date.toISOString(),
        notes: data.notes || undefined, 
      };

      if (log) {
        updateProductionLog({ ...log, ...logDataWithISOStringDate });
        toast({ title: "Üretim Kaydı Güncellendi", description: `Kayıt başarıyla güncellendi.` });
      } else {
        const newLog: ProductionLog = {
          id: crypto.randomUUID(),
          ...logDataWithISOStringDate,
        };
        addProductionLog(newLog); 
        toast({ title: "Üretim Kaydı Eklendi", description: `Yeni üretim kaydı başarıyla eklendi.` });
      }
      onSuccess();
    } catch (error: any) {
       toast({ title: "Hata", description: error.message || "İşlem sırasında bir hata oluştu.", variant: "destructive" });
      console.error(error);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <DialogHeader>
          <DialogTitle>{log ? "Üretim Kaydını Düzenle" : "Yeni Üretim Kaydı"}</DialogTitle>
          <DialogDescription>
            {log ? `Kayıt bilgilerini değiştirin.` : "Yeni üretim kaydı için bilgileri girin."}
          </DialogDescription>
        </DialogHeader>

        <FormField
          control={form.control}
          name="productId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Üretilen Ürün (Mamul)</FormLabel>
              <ProductCombobox
                products={finishedProducts}
                value={field.value}
                onChange={(productId) => {
                  field.onChange(productId);
                  form.setValue("bomId", ""); // Reset BOM when product changes
                }}
                placeholder="Mamul seçin"
              />
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bomId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Kullanılan Ürün Reçetesi (BOM)</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={!selectedProductId || availableBoms.length === 0}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={!selectedProductId ? "Önce ürün seçin" : availableBoms.length === 0 ? "Bu ürün için Ürün Reçetesi (BOM) yok" : "Ürün Reçetesi (BOM) seçin"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {availableBoms.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Üretim Miktarı</FormLabel>
              <FormControl>
                <Input type="number" placeholder="0" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Üretim Tarihi</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP", { locale: tr })
                      ) : (
                        <span>Tarih seçin</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    initialFocus
                    locale={tr}
                    disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notlar (İsteğe Bağlı)</FormLabel>
              <FormControl>
                <Textarea placeholder="Üretim hakkında ek bilgi" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">İptal Et</Button>
          </DialogClose>
          <Button type="submit">{log ? "Kaydet" : "Ekle"}</Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
