
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import type { RawMaterialEntry } from "@/types";
import { DialogFooter, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { tr } from "date-fns/locale";

const rawMaterialEntryFormSchema = z.object({
  productId: z.string().min(1, "Hammadde seçilmelidir."),
  quantity: z.coerce.number().positive("Miktar pozitif olmalıdır."),
  date: z.date({ required_error: "Tarih seçilmelidir." }),
  supplier: z.string().optional(),
  notes: z.string().optional(),
});

type RawMaterialEntryFormValues = z.infer<typeof rawMaterialEntryFormSchema>;

interface RawMaterialEntryFormProps {
  entry?: RawMaterialEntry; 
  onSuccess: () => void;
}

export function RawMaterialEntryForm({ entry, onSuccess }: RawMaterialEntryFormProps) {
  const { products, addRawMaterialEntry } = useStore();
  const { toast } = useToast();

  const rawMaterials = products.filter(p => p.type === 'hammadde' || p.type === 'yardimci_malzeme');

  const form = useForm<RawMaterialEntryFormValues>({
    resolver: zodResolver(rawMaterialEntryFormSchema),
    defaultValues: entry
      ? { ...entry, date: new Date(entry.date) }
      : {
          productId: "",
          quantity: 0,
          date: new Date(),
          supplier: "",
          notes: "",
        },
  });

  function onSubmit(data: RawMaterialEntryFormValues) {
    try {
      if (entry) {
        // Update logic (future enhancement)
        // updateRawMaterialEntry({ ...entry, ...data, date: data.date.toISOString() });
        toast({ title: "Giriş Güncellendi", description: `Giriş başarıyla güncellendi.` });
      } else {
        const newEntry: RawMaterialEntry = {
          id: crypto.randomUUID(),
          ...data,
          date: data.date.toISOString(),
        };
        addRawMaterialEntry(newEntry);
        toast({ title: "Hammadde Girişi Eklendi", description: `Yeni hammadde girişi başarıyla eklendi.` });
      }
      onSuccess();
    } catch (error) {
       toast({ title: "Hata", description: "İşlem sırasında bir hata oluştu.", variant: "destructive" });
      console.error(error);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <DialogHeader>
          <DialogTitle>{entry ? "Girişi Düzenle" : "Yeni Hammadde Girişi"}</DialogTitle>
          <DialogDescription>
            {entry ? `Giriş bilgilerini değiştirin.` : "Yeni hammadde girişi için bilgileri girin."}
          </DialogDescription>
        </DialogHeader>

        <FormField
          control={form.control}
          name="productId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Hammadde/Yardımcı Malzeme</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Hammadde/Yardımcı Malzeme seçin" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {rawMaterials.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{p.name} ({p.unit})</span>
                        {p.productCode && <span className="text-xs text-muted-foreground font-mono">{p.productCode}</span>}
                      </div>
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
              <FormLabel>Miktar</FormLabel>
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
              <FormLabel>Tarih</FormLabel>
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
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="supplier"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tedarikçi (İsteğe Bağlı)</FormLabel>
              <FormControl>
                <Input placeholder="Tedarikçi adı" {...field} />
              </FormControl>
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
                <Textarea placeholder="Giriş hakkında ek bilgi" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">İptal Et</Button>
          </DialogClose>
          <Button type="submit">{entry ? "Kaydet" : "Ekle"}</Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

