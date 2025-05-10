
"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
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

interface ProductComboboxProps {
  products: Product[];
  value: string; // productId
  onChange: (value: string) => void; // passes productId
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
}

export function ProductCombobox({
  products,
  value,
  onChange,
  placeholder = "Ürün seçin...",
  searchPlaceholder = "Ürün kodu veya adı ara...",
  emptyText = "Ürün bulunamadı.",
  disabled,
  className,
}: ProductComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const selectedProduct = products.find((p) => p.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal", className)}
          disabled={disabled}
        >
          {selectedProduct ? (
            <div className="flex flex-col items-start text-left overflow-hidden">
              <span className="text-sm truncate " title={selectedProduct.name}>{selectedProduct.name}</span>
              {selectedProduct.productCode && (
                <span className="text-xs text-muted-foreground font-mono">
                  {selectedProduct.productCode}
                </span>
              )}
            </div>
          ) : (
            <span className="truncate">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command
          filter={(itemValue, search) => {
            // itemValue is product.id in this case
            const product = products.find(p => p.id === itemValue);
            if (!product) return 0;
            const lowerSearch = search.toLowerCase().trim();
            if (!lowerSearch) return 1; // Show all if search is empty
            
            const nameMatch = product.name.toLowerCase().includes(lowerSearch);
            const codeMatch = product.productCode.toLowerCase().includes(lowerSearch);
            
            // Prioritize code match if search term looks like a code (e.g., starts with letters then numbers)
            // This is a simple heuristic, can be improved
            if (codeMatch && /^[a-zA-Z]+[0-9-]*/.test(lowerSearch)) return 1;
            if (nameMatch) return 1;
            if (codeMatch) return 1;
            
            return 0;
          }}
        >
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {products.map((product) => (
                <CommandItem
                  key={product.id}
                  value={product.id} // Use product.id as the value for cmdk
                  onSelect={(currentValue) => { // currentValue is product.id
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
                    <span>{product.name}</span>
                    {product.productCode && (
                        <span className="text-xs text-muted-foreground font-mono">
                        {product.productCode}
                        </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
