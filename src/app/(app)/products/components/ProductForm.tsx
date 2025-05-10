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
import { useStore } from "@/lib/store";
import type { Product, ProductType } from "@/types";
import { DialogFooter, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const productTypes: { value: ProductType; label: string }[] = [
  { value: "hammadde", label: "Hammadde" },
  { value: "yari_mamul", label: "Yarı Mamul" },
  { value: "mamul", label: "Mamul" },
  { value: "yardimci_malzeme", label: "Yardımcı Malzeme" },
];

const productFormSchema = z.object({
  name: z.string().min(2, { message: "Ürün adı en az 2 karakter olmalıdır." }),
  type: z.enum(["hammadde", "yari_mamul", "mamul", "yardimci_malzeme"], {
    required_error: "Ürün türü seçilmelidir.",
  }),
  unit: z.string().min(1, { message: "Ölçü birimi girilmelidir (örn: kg, adet, lt)." }),
  stock: z.coerce.number().min(0, { message: "Stok miktarı negatif olamaz." }).default(0),
  description: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

interface ProductFormProps {
  product?: Product;
  onSuccess: () => void;
}

export function ProductForm({ product, onSuccess }: ProductFormProps) {
  const addProduct = useStore((state) => state.addProduct);
  const updateProduct = useStore((state) => state.updateProduct);
  const { toast } = useToast();

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: product
      ? { ...product, stock: product.stock || 0 }
      : {
          name: "",
          type: undefined,
          unit: "",
          stock: 0,
          description: "",
        },
  });

  function onSubmit(data: ProductFormValues) {
    try {
      if (product) {
        updateProduct({ ...product, ...data });
        toast({ title: "Ürün Güncellendi", description: `${data.name} ürünü başarıyla güncellendi.` });
      } else {
        const newProduct: Product = {
          id: crypto.randomUUID(),
          ...data,
        };
        addProduct(newProduct);
        toast({ title: "Ürün Eklendi", description: `${data.name} ürünü başarıyla eklendi.` });
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
          <DialogTitle>{product ? "Ürünü Düzenle" : "Yeni Ürün Ekle"}</DialogTitle>
          <DialogDescription>
            {product ? `${product.name} ürününün bilgilerini değiştirin.` : "Yeni ürün için bilgileri girin."}
          </DialogDescription>
        </DialogHeader>
        
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ürün Adı</FormLabel>
              <FormControl>
                <Input placeholder="Örn: Kırmızı Boya" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ürün Türü</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Tür seçin" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {productTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
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
          name="unit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ölçü Birimi</FormLabel>
              <FormControl>
                <Input placeholder="kg, adet, lt, mt..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="stock"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Başlangıç Stok Miktarı</FormLabel>
              <FormControl>
                <Input type="number" placeholder="0" {...field} disabled={!!product} />
              </FormControl>
              {!!product && <p className="text-xs text-muted-foreground">Stok miktarı hammadde girişi ve üretim ile yönetilir.</p>}
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Açıklama (İsteğe Bağlı)</FormLabel>
              <FormControl>
                <Textarea placeholder="Ürün hakkında ek bilgi" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">İptal Et</Button>
          </DialogClose>
          <Button type="submit">{product ? "Kaydet" : "Ekle"}</Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
