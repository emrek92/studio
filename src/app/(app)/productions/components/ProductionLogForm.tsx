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
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const productionLogFormSchema = z.object({
  productId: z.string().min(1, "Məhsul seçilməlidir."),
  bomId: z.string().min(1, "BOM seçilməlidir."),
  quantity: z.coerce.number().positive("Miqdar müsbət olmalıdır."),
  date: z.date({ required_error: "Tarix seçilməlidir." }),
  notes: z.string().optional(),
});

type ProductionLogFormValues = z.infer<typeof productionLogFormSchema>;

interface ProductionLogFormProps {
  log?: ProductionLog; // For future edit functionality
  onSuccess: () => void;
}

export function ProductionLogForm({ log, onSuccess }: ProductionLogFormProps) {
  const { products, boms, addProductionLog } = useStore();
  const { toast } = useToast();

  const finishedProducts = products.filter(p => p.type === 'mamul');
  
  const form = useForm<ProductionLogFormValues>({
    resolver: zodResolver(productionLogFormSchema),
    defaultValues: log
      ? { ...log, date: new Date(log.date) }
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
    // Reset BOM if selected product changes and current BOM is not valid for it
    if (selectedProductId && availableBoms.length > 0) {
      const currentBomId = form.getValues("bomId");
      if (!availableBoms.find(b => b.id === currentBomId)) {
        form.setValue("bomId", ""); 
      }
    } else if (selectedProductId && availableBoms.length === 0) {
        form.setValue("bomId", "");
    }
  }, [selectedProductId, availableBoms, form]);


  function onSubmit(data: ProductionLogFormValues) {
    try {
      if (log) {
        // Update logic (future enhancement)
        toast({ title: "İstehsal Qeydi Yeniləndi", description: `Qeyd uğurla yeniləndi.` });
      } else {
        const newLog: ProductionLog = {
          id: crypto.randomUUID(),
          ...data,
          date: data.date.toISOString(),
        };
        addProductionLog(newLog); // This now handles stock checks via alert in store
        // Assuming addProductionLog might not throw an error but uses alert for stock issues
        // Check if a toast message has already been shown by the store (e.g., via a global toast state or a return value)
        // For simplicity, we assume success if no alert was shown and proceed with success toast.
        // A more robust solution would involve the store action returning a status.
        if (!useStore.getState().productionLogs.find(pl => pl.id === newLog.id)) {
          // This implies the log was not added, likely due to stock issue alerted in store.
          // No success toast here.
        } else {
           toast({ title: "İstehsal Qeydi Əlavə Edildi", description: `Yeni istehsal qeydi uğurla əlavə edildi.` });
        }
      }
      onSuccess(); // Close dialog regardless of stock alert, user was notified
    } catch (error: any) {
       toast({ title: "Xəta", description: error.message || "Əməliyyat zamanı xəta baş verdi.", variant: "destructive" });
      console.error(error);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <DialogHeader>
          <DialogTitle>{log ? "İstehsal Qeydini Redaktə Et" : "Yeni İstehsal Qeydi"}</DialogTitle>
          <DialogDescription>
            {log ? `Qeyd məlumatlarını dəyişdirin.` : "Yeni istehsal qeydi üçün məlumatları daxil edin."}
          </DialogDescription>
        </DialogHeader>

        <FormField
          control={form.control}
          name="productId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>İstehsal Olunan Məhsul (Məmul)</FormLabel>
              <Select onValueChange={(value) => { field.onChange(value); form.setValue("bomId", ""); }} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Məmul seçin" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {finishedProducts.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
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
          name="bomId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>İstifadə Olunan BOM</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={!selectedProductId || availableBoms.length === 0}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={!selectedProductId ? "Əvvəlcə məhsul seçin" : availableBoms.length === 0 ? "Bu məhsul üçün BOM yoxdur" : "BOM seçin"} />
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
              <FormLabel>İstehsal Miqdarı</FormLabel>
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
              <FormLabel>İstehsal Tarixi</FormLabel>
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
                        format(field.value, "PPP")
                      ) : (
                        <span>Tarix seçin</span>
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
              <FormLabel>Qeydlər (İstəyə Bağlı)</FormLabel>
              <FormControl>
                <Textarea placeholder="İstehsal haqqında əlavə məlumat" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">Ləğv Et</Button>
          </DialogClose>
          <Button type="submit">{log ? "Yadda Saxla" : "Əlavə Et"}</Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
