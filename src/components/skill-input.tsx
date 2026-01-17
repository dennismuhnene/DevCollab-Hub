'use client';

import * as React from 'react';
import { X, ChevronsUpDown, Check } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface SkillInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  professionalSkills: string[];
  maxSkills: number;
}

export function SkillInput({
  value, // This is the array of selected skill strings
  onChange,
  professionalSkills, // This is the array of predefined skill strings
  maxSkills,
}: SkillInputProps) {
  const { toast } = useToast();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isPopoverOpen, setPopoverOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState('');

  const handleUnselect = (skillToUnselect: string) => {
    onChange(value.filter((s) => s !== skillToUnselect));
  };

  const handleToggleSelect = (skill: string) => {
    if (value.includes(skill)) {
      handleUnselect(skill);
    } else {
      if (value.length >= maxSkills) {
        toast({
          variant: 'destructive',
          title: 'Skill limit reached',
          description: `You can only add up to ${maxSkills} skills.`,
        });
        return;
      }
      onChange([...value, skill]);
    }
  };
  
  const handleCreate = (newSkill: string) => {
     if (value.length >= maxSkills) {
        toast({
            variant: 'destructive',
            title: 'Skill limit reached',
            description: `You can only add up to ${maxSkills} skills.`,
        });
        return;
    }
    if (newSkill && !value.includes(newSkill)) {
        onChange([...value, newSkill]);
    }
     setInputValue(''); 
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === 'Tab') && inputValue.trim()) {
      e.preventDefault();
      handleCreate(inputValue.trim());
    }
  };

  const filteredSkills = professionalSkills.filter((skill) =>
    skill.toLowerCase().includes(inputValue.toLowerCase())
  );

  return (
    <Popover open={isPopoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={isPopoverOpen}
          className="w-full justify-between h-auto min-h-[40px]"
          onClick={() => setPopoverOpen(!isPopoverOpen)}
        >
          <div className="flex flex-wrap gap-1">
            {value.length > 0 ? (
              value.map((skill) => (
                <Badge
                  key={skill}
                  variant="secondary"
                  className="mr-1"
                  onClick={(e) => {
                    e.stopPropagation(); 
                    handleUnselect(skill);
                  }}
                >
                  {skill}
                  <X className="ml-1 h-3 w-3 cursor-pointer" />
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground">{`Select up to ${maxSkills} skills...`}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput
            ref={inputRef}
            placeholder="Search or create a skill..."
            value={inputValue}
            onValueChange={setInputValue}
            onKeyDown={handleKeyDown}
          />
          <CommandList>
            <CommandEmpty>
              {inputValue.trim() ? (
                 <CommandItem
                  onSelect={() => handleCreate(inputValue.trim())}
                  className="cursor-pointer"
                >
                  Create "{inputValue.trim()}"
                </CommandItem>
              ) : (
                "No skill found."
              )}
            </CommandEmpty>
            <CommandGroup>
              {filteredSkills.map((skill) => (
                <CommandItem
                  key={skill}
                  value={skill}
                  onSelect={() => {
                    handleToggleSelect(skill);
                  }}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value.includes(skill) ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {skill}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
