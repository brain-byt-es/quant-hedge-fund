"use client";
import React, { useCallback, useState, forwardRef, useEffect } from "react";

// shadcn
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// utils
import { cn } from "@/lib/utils";

// assets
import { ChevronDown, CheckIcon, Globe, X } from "lucide-react";
import { CircleFlag } from "react-circle-flags";

// data
import { countries } from "country-data-list";

export type Country = {
  alpha2: string;
  alpha3: string;
  name: string;
  emoji?: string;
  status: string;
  ioc: string;
};

interface CountryMultiSelectProps {
  defaultValue?: string[];
  onChange?: (values: string[]) => void;
  placeholder?: string;
  className?: string;
}

const CountryMultiSelectComponent = (
  {
    defaultValue = [],
    onChange,
    placeholder = "Select countries...",
    className,
  }: CountryMultiSelectProps,
  ref: React.ForwardedRef<HTMLButtonElement>
) => {
  const [open, setOpen] = useState(false);
  const [selectedValues, setSelectedValues] = useState<string[]>(defaultValue);

  const options = (countries.all as unknown as Country[]).filter(
    (country) =>
      country.emoji && country.status !== "deleted" && country.ioc !== "PRK"
  );

  useEffect(() => {
    setSelectedValues(defaultValue);
  }, [defaultValue]);

  const handleSelect = useCallback(
    (name: string) => {
      const newSelection = selectedValues.includes(name)
        ? selectedValues.filter((v) => v !== name)
        : [...selectedValues, name];

      setSelectedValues(newSelection);
      onChange?.(newSelection);
    },
    [onChange, selectedValues]
  );

  const removeValue = (val: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelection = selectedValues.filter((v) => v !== val);
    setSelectedValues(newSelection);
    onChange?.(newSelection);
  };

  const selectedCountries = options.filter((c) => selectedValues.includes(c.name));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={ref}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "flex h-auto min-h-10 w-full items-center justify-between rounded-md border border-input bg-background/50 px-3 py-2 text-sm shadow-sm hover:bg-accent/50 focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
        >
          <div className="flex flex-wrap gap-1 items-center">
            {selectedCountries.length > 0 ? (
              selectedCountries.map((country) => (
                <Badge
                  key={country.alpha3}
                  variant="secondary"
                  className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 flex items-center gap-1 px-1 pr-0.5 h-6 text-[10px] font-black uppercase tracking-wider"
                >
                  <div className="size-3 overflow-hidden rounded-full flex-shrink-0">
                    <CircleFlag
                      countryCode={country.alpha2.toLowerCase()}
                      height={12}
                    />
                  </div>
                  {country.name}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={(e) => removeValue(country.name, e)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        removeValue(country.name, e as unknown as React.MouseEvent);
                      }
                    }}
                    className="ml-1 rounded-full outline-none focus:ring-1 focus:ring-ring hover:bg-primary/20 p-0.5 cursor-pointer"
                  >
                    <X className="size-2.5" />
                  </div>
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground flex items-center gap-2">
                <Globe className="size-4" /> {placeholder}
              </span>
            )}
          </div>
          <ChevronDown className="size-4 shrink-0 opacity-50 ml-2" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-0 bg-popover/95 backdrop-blur-xl border-border/50"
      >
        <Command className="w-full">
          <CommandInput placeholder="Search country..." className="h-10 text-xs" />
          <CommandList className="max-h-[300px] overflow-y-auto custom-scrollbar">
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.alpha3}
                  value={option.name}
                  onSelect={() => handleSelect(option.name)}
                  className="flex items-center gap-2 py-2 px-3 text-[11px] font-bold uppercase tracking-wider cursor-pointer"
                >
                  <div className="size-4 overflow-hidden rounded-full flex-shrink-0">
                    <CircleFlag
                      countryCode={option.alpha2.toLowerCase()}
                      height={16}
                    />
                  </div>
                  <span className="flex-grow">{option.name}</span>
                  <CheckIcon
                    className={cn(
                      "size-4 text-primary",
                      selectedValues.includes(option.name)
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

CountryMultiSelectComponent.displayName = "CountryMultiSelect";

export const CountryMultiSelect = forwardRef(CountryMultiSelectComponent);
