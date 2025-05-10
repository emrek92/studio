
"use client";

import * as React from "react";
import { ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { Product } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ProductComboboxProps {
  products: Product[];
  value: string; // Should be product.id
  onChange: (value: string) => void; // Should pass product.id
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
}

export function ProductCombobox({
  products,
  value,
  onChange,
  placeholder = "Ürün seçin...",
  searchPlaceholder = "Ürün kodu veya adı ile ara...",
  disabled,
}: ProductComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");

  const selectedProduct = products.find(
    (product) => product.id === value
  );

  const filteredProducts = React.useMemo(() => {
    if (!searchTerm) return products;
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.productCode.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
          disabled={disabled}
        >
          {selectedProduct
            ? `${selectedProduct.productCode} - ${selectedProduct.name}`
            : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command shouldFilter={false}> {/* Filtering is handled by filteredProducts */}
          <CommandInput
            placeholder={searchPlaceholder}
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
          <CommandEmpty>Ürün bulunamadı.</CommandEmpty>
          <CommandList>
            <ScrollArea className="h-auto max-h-72"> {/* Adjusted height */}
              <CommandGroup>
                {filteredProducts.map((product) => (
                  <CommandItem
                    key={product.id}
                    value={product.id} // Ensure CommandItem value is unique, product.id is good
                    onSelect={(currentValue) => {
                      // currentValue here is product.id based on CommandItem's value prop
                      onChange(currentValue === value ? "" : currentValue);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === product.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                        <span className="font-medium">{product.productCode} - {product.name}</span>
                        <span className="text-xs text-muted-foreground">{product.unit}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </ScrollArea>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
