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

const rawMaterialEntryFormSchema = z.object({
  productId: z.string().min(1, "Xammal seçilməlidir."),
  quantity: z.coerce.number().positive("Miqdar müsbət olmalıdır."),
  date: z.date({ required_error: "Tarix seçilməlidir." }),
  supplier: z.string().optional(),
  notes: z.string().optional(),
});

type RawMaterialEntryFormValues = z.infer<typeof rawMaterialEntryFormSchema>;

interface RawMaterialEntryFormProps {
  entry?: RawMaterialEntry; // For future edit functionality
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
        toast({ title: "Giriş Yeniləndi", description: `Giriş uğurla yeniləndi.` });
      } else {
        const newEntry: RawMaterialEntry = {
          id: crypto.randomUUID(),
          ...data,
          date: data.date.toISOString(),
        };
        addRawMaterialEntry(newEntry);
        toast({ title: "Xammal Girişi Əlavə Edildi", description: `Yeni xammal girişi uğurla əlavə edildi.` });
      }
      onSuccess();
    } catch (error) {
       toast({ title: "Xəta", description: "Əməliyyat zamanı xəta baş verdi.", variant: "destructive" });
      console.error(error);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <DialogHeader>
          <DialogTitle>{entry ? "Girişi Redaktə Et" : "Yeni Xammal Girişi"}</DialogTitle>
          <DialogDescription>
            {entry ? `Giriş məlumatlarını dəyişdirin.` : "Yeni xammal girişi üçün məlumatları daxil edin."}
          </DialogDescription>
        </DialogHeader>

        <FormField
          control={form.control}
          name="productId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Xammal</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Xammal seçin" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {rawMaterials.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.unit})
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
              <FormLabel>Miqdar</FormLabel>
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
              <FormLabel>Tarix</FormLabel>
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
          name="supplier"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Təchizatçı (İstəyə Bağlı)</FormLabel>
              <FormControl>
                <Input placeholder="Təchizatçı adı" {...field} />
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
              <FormLabel>Qeydlər (İstəyə Bağlı)</FormLabel>
              <FormControl>
                <Textarea placeholder="Giriş haqqında əlavə məlumat" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">Ləğv Et</Button>
          </DialogClose>
          <Button type="submit">{entry ? "Yadda Saxla" : "Əlavə Et"}</Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
