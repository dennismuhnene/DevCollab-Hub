'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface TagInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
}

export function TagInput({ value, onChange, placeholder }: TagInputProps) {
  const [inputValue, setInputValue] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === 'Tab') && inputValue.trim() !== '') {
      e.preventDefault();
      const newValues = [...value, inputValue.trim()];
      onChange(newValues);
      setInputValue('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    const newValues = value.filter((tag) => tag !== tagToRemove);
    onChange(newValues);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {value.map((tag) => (
          <Badge key={tag} variant="secondary">
            {tag}
            <button
              type="button"
              className="ml-2 rounded-full outline-none hover:bg-muted-foreground/20"
              onClick={() => removeTag(tag)}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <Input
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleInputKeyDown}
        placeholder={placeholder}
      />
    </div>
  );
}
