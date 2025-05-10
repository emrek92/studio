"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
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
import { useStore, getProductNameById } from "@/lib/store";
import type { BOM, BomComponent, Product } from "@/types";
import { DialogFooter, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { PlusCircle, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

const bomComponentSchema = z.object({
  productId: z.string().min(1, "Komponent seçilməlidir."),
  quantity: z.coerce.number().positive("Miqdar müsbət olmalıdır."),
});

const bomFormSchema = z.object({
  productId: z.string().min(1, "Əsas məhsul seçilməlidir."),
  name: z.string().min(2, "BOM adı ən azı 2 simvol olmalıdır."),
  components: z.array(bomComponentSchema).min(1, "Ən azı bir komponent əlavə edilməlidir."),
});

type BomFormValues = z.infer<typeof bomFormSchema>;

interface BomFormProps {
  bom?: BOM;
  onSuccess: () => void;
}

export function BomForm({ bom, onSuccess }: BomFormProps) {
  const { products, addBom, updateBom } = useStore();
  const { toast } = useToast();

  const finishedProducts = products.filter(p => p.type === 'mamul');
  const componentProducts = products.filter(p => p.type === 'hammadde' || p.type === 'yari_mamul');

  const form = useForm<BomFormValues>({
    resolver: zodResolver(bomFormSchema),
    defaultValues: bom || {
      productId: "",
      name: "",
      components: [{ productId: "", quantity: 1 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "components",
  });

  function onSubmit(data: BomFormValues) {
    try {
      if (bom) {
        updateBom({ ...bom, ...data });
        toast({ title: "BOM Yeniləndi", description: `${data.name} BOM-u uğurla yeniləndi.` });
      } else {
        const newBom: BOM = {
          id: crypto.randomUUID(),
          ...data,
        };
        addBom(newBom);
        toast({ title: "BOM Əlavə Edildi", description: `${data.name} BOM-u uğurla əlavə edildi.` });
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
          <DialogTitle>{bom ? "BOM Redaktə Et" : "Yeni BOM Yarat"}</DialogTitle>
          <DialogDescription>
            {bom ? `${bom.name} BOM-unun məlumatlarını dəyişdirin.` : "Yeni BOM üçün məlumatları daxil edin."}
          </DialogDescription>
        </DialogHeader>

        <FormField
          control={form.control}
          name="productId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Əsas Məhsul (Məmul)</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
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
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>BOM Adı</FormLabel>
              <FormControl>
                <Input placeholder="Məs: Standart Məhsul A Resepti" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div>
          <FormLabel>Komponentlər</FormLabel>
          {fields.map((field, index) => (
            <div key={field.id} className="mt-2 space-y-2 p-3 border rounded-md relative">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name={`components.${index}.productId`}
                  render={({ field: componentField }) => (
                    <FormItem>
                      <FormLabel>Komponent Məhsulu</FormLabel>
                      <Select onValueChange={componentField.onChange} defaultValue={componentField.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Komponent seçin" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {componentProducts.map((p) => (
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
                  name={`components.${index}.quantity`}
                  render={({ field: componentField }) => (
                    <FormItem>
                      <FormLabel>Miqdar</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="1" {...componentField} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {fields.length > 1 && (
                 <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-1 right-1 text-destructive hover:bg-destructive/10"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
              )}
            </div>
          ))}
           {form.formState.errors.components && typeof form.formState.errors.components !== 'string' && !form.formState.errors.components.length && (
            <p className="text-sm font-medium text-destructive">{form.formState.errors.components.message}</p>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => append({ productId: "", quantity: 1 })}
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Komponent Əlavə Et
          </Button>
        </div>
        
        <Separator />

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">Ləğv Et</Button>
          </DialogClose>
          <Button type="submit">{bom ? "Yadda Saxla" : "Yarat"}</Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
