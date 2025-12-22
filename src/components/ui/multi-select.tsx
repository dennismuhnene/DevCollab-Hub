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
  const commandRef = React.useRef<HTMLDivElement>(null);
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState('');
  const [isFocused, setIsFocused] = React.useState(false);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (commandRef.current && !commandRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const safeSelected = Array.isArray(selected) ? selected : [];

  const handleUnselect = (value: string) => {
    onChange(safeSelected.filter((s) => s !== value));
  };

  const addValueFromInput = React.useCallback(() => {
    if (inputValue) {
      const valueToAdd = inputValue.trim();
      const exactMatch = options.find(o => o.value.toLowerCase() === valueToAdd.toLowerCase());

      if (!exactMatch) {
        onChange(prev => [...(Array.isArray(prev) ? prev : []), valueToAdd]);
      }
      setInputValue('');
    }
  }, [inputValue, options, onChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      if (inputValue) {
        e.preventDefault();
        addValueFromInput();
      }
    }

    // This specifically handles the 'Tab' key, often triggered by the 'next' button on mobile keyboards.
    if (e.key === 'Tab') {
      if (inputValue) {
        e.preventDefault(); // Prevents focus from moving to the next element.
        addValueFromInput(); // Adds the current input value to the selection.
      }
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    setOpen(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
    // A brief delay to allow other events like onSelect to be handled
    setTimeout(() => {
      if (!isFocused) {
        setOpen(false);
        addValueFromInput();
      }
    }, 150);
  };

  return (
    <CommandPrimitive ref={commandRef} onKeyDown={handleKeyDown} className={cn('overflow-visible bg-transparent', className)}>
      <div className="group rounded-md border border-input px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
        <div className="flex flex-wrap gap-1">
          {safeSelected.map((value) => {
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
            onFocus={handleFocus}
            onBlur={handleBlur}
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
                          const newSelected = Array.isArray(prev) ? prev : [];
                          if (newSelected.includes(option.value)) {
                            return newSelected.filter(s => s !== option.value);
                          } else {
                            return [...newSelected, option.value];
                          }
                        });
                        setInputValue('');
                      }}
                      className={cn('cursor-pointer', safeSelected.includes(option.value) && 'font-bold')}
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
