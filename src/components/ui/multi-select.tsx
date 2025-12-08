'use client';

import * as React from 'react';
import { Command as CommandPrimitive } from 'cmdk';
import { X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Command, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';

export interface Option {
  value: string;
  label: string;
  disable?: boolean;
  [key: string]: string | boolean | undefined;
}

interface MultiSelectProps {
  options: Option[];
  selected: string[];
  onChange: React.Dispatch<React.SetStateAction<string[]>>;
  className?: string;
  placeholder?: string;
}

export function MultiSelect({ options, selected, onChange, className, ...props }: MultiSelectProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState('');

  const handleUnselect = (value: string) => {
    onChange(selected.filter((s) => s !== value));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && inputValue) {
      const exactMatch = options.find(o => o.value.toLowerCase() === inputValue.toLowerCase());

      if (!exactMatch) {
        if (!selected.find(s => s.toLowerCase() === inputValue.toLowerCase())) {
            onChange(prev => [...prev, inputValue]);
        }
        setInputValue('');
        e.preventDefault(); 
      }
    }
  };

  return (
    <CommandPrimitive onKeyDown={handleKeyDown} className={cn('overflow-visible bg-transparent', className)}>
      <div className="group rounded-md border border-input px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
        <div className="flex flex-wrap gap-1">
          {selected.map((value) => {
            const option = options.find((o) => o.value === value);
            return (
              <Badge key={value} variant="secondary" className="rounded-sm px-2 py-1 font-normal">
                {option ? option.label : value}
                <button
                  className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleUnselect(value);
                    }
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={() => handleUnselect(value)}
                >
                  <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                </button>
              </Badge>
            );
          })}
          <CommandPrimitive.Input
            ref={inputRef}
            value={inputValue}
            onValueChange={setInputValue}
            onBlur={() => setOpen(false)}
            onFocus={() => setOpen(true)}
            placeholder={props.placeholder || 'Select items...'}
            className="ml-2 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>
      <div className="relative mt-2">
        {open && options.length > 0 ? (
          <div className="absolute top-0 z-10 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in">
            <CommandList>
              <CommandGroup className="h-full overflow-auto">
                {options.map((option) => {
                  return (
                    <CommandItem
                      key={option.value}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onSelect={() => {
                        onChange(prev => {
                          if (prev.includes(option.value)) {
                            return prev.filter(s => s !== option.value);
                          } else {
                            return [...prev, option.value];
                          }
                        });
                        setInputValue('');
                      }}
                      className={cn('cursor-pointer', selected.includes(option.value) && 'font-bold')}
                    >
                      {option.label}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </div>
        ) : null}
      </div>
    </CommandPrimitive>
  );
}
