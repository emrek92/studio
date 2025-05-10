
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
import { useStore, getProductNameById, getProductCodeById } from "@/lib/store";
import type { BOM } from "@/types";
import { DialogFooter, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { PlusCircle, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { ProductCombobox } from "@/components/ProductCombobox";

const bomComponentSchema = z.object({
  productId: z.string().min(1, "Bileşen seçilmelidir."),
  quantity: z.coerce.number().positive("Miktar pozitif olmalıdır."),
});

const bomFormSchema = z.object({
  productId: z.string().min(1, "Ana ürün seçilmelidir."),
  components: z.array(bomComponentSchema).min(1, "En az bir bileşen eklenmelidir."),
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
    defaultValues: bom 
      ? { productId: bom.productId, components: bom.components } 
      : {
          productId: "",
          components: [{ productId: "", quantity: 1 }],
        },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "components",
  });

  function onSubmit(data: BomFormValues) {
    try {
      const mainProduct = products.find(p => p.id === data.productId);
      if (!mainProduct) {
          toast({ title: "Hata", description: "Ana ürün bulunamadı.", variant: "destructive" });
          return;
      }
      const bomName = `${mainProduct.productCode} - ${mainProduct.name} Reçetesi`;

      if (bom) {
        updateBom({ ...bom, ...data, name: bomName });
        toast({ title: "Ürün Reçetesi (BOM) Güncellendi", description: `${bomName} adlı Ürün Reçetesi (BOM) başarıyla güncellendi.` });
      } else {
        const newBom: BOM = {
          id: crypto.randomUUID(),
          ...data,
          name: bomName, 
        };
        addBom(newBom);
        toast({ title: "Ürün Reçetesi (BOM) Eklendi", description: `${bomName} adlı Ürün Reçetesi (BOM) başarıyla eklendi.` });
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
          <DialogTitle>{bom ? "Ürün Reçetesini (BOM) Düzenle" : "Yeni Ürün Reçetesi (BOM) Oluştur"}</DialogTitle>
          <DialogDescription>
            {bom ? `${bom.name} adlı Ürün Reçetesinin (BOM) bilgilerini değiştirin.` : "Yeni Ürün Reçetesi (BOM) için bilgileri girin."}
          </DialogDescription>
        </DialogHeader>

        <FormField
          control={form.control}
          name="productId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ana Ürün (Mamul)</FormLabel>
              <ProductCombobox
                products={finishedProducts}
                value={field.value}
                onChange={field.onChange}
                placeholder="Mamul seçin"
              />
              <FormMessage />
            </FormItem>
          )}
        />

        <div>
          <FormLabel>Bileşenler</FormLabel>
          {fields.map((field, index) => (
            <div key={field.id} className="mt-2 space-y-2 p-3 border rounded-md relative">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name={`components.${index}.productId`}
                  render={({ field: componentField }) => (
                    <FormItem>
                      <FormLabel>Bileşen Ürünü</FormLabel>
                       <ProductCombobox
                        products={componentProducts}
                        value={componentField.value}
                        onChange={componentField.onChange}
                        placeholder="Bileşen seçin"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`components.${index}.quantity`}
                  render={({ field: componentField }) => (
                    <FormItem>
                      <FormLabel>Miktar ({getProductUnitById(form.getValues(`components.${index}.productId`)) || 'Birim'})</FormLabel>
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
           {form.formState.errors.components && typeof form.formState.errors.components !== 'string' && !Array.isArray(form.formState.errors.components) && (
            <p className="text-sm font-medium text-destructive">{form.formState.errors.components.message}</p>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => append({ productId: "", quantity: 1 })}
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Bileşen Ekle
          </Button>
        </div>
        
        <Separator />

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">İptal Et</Button>
          </DialogClose>
          <Button type="submit">{bom ? "Kaydet" : "Oluştur"}</Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

