'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MultiSelect } from '@/components/ui/multi-select';
import { Slider } from '@/components/ui/slider';
import { X } from 'lucide-react';

interface DiscoverFiltersProps {
  allTechs: string[];
  allSkills: string[];
  experienceRange: [number, number];
  setExperienceRange: (value: [number, number]) => void;
  selectedTechs: string[];
  setSelectedTechs: React.Dispatch<React.SetStateAction<string[]>>;
  selectedSkills: string[];
  setSelectedSkills: React.Dispatch<React.SetStateAction<string[]>>;
  resetFilters: () => void;
  onHide: () => void;
}

export function DiscoverFilters({
  allTechs,
  allSkills,
  experienceRange,
  setExperienceRange,
  selectedTechs,
  setSelectedTechs,
  selectedSkills,
  setSelectedSkills,
  resetFilters,
  onHide,
}: DiscoverFiltersProps) {
  return (
    <Card className="relative">
      <Button
        onClick={onHide}
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2"
      >
        <X className="h-4 w-4" />
      </Button>
      <CardHeader>
        <CardTitle>Filter Results</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Tech Stack</label>
          <MultiSelect
            options={allTechs.map(t => ({ label: t, value: t }))}
            selected={selectedTechs}
            onChange={setSelectedTechs}
            placeholder="Select technologies..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Skills</label>
          <MultiSelect
            options={allSkills.map(s => ({ label: s, value: s }))}
            selected={selectedSkills}
            onChange={setSelectedSkills}
            placeholder="Select skills..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-4">
            Years of Experience: {experienceRange[0]} - {experienceRange[1]} years
          </label>
          <Slider
            min={0}
            max={20}
            step={1}
            value={experienceRange}
            onValueChange={(value) => setExperienceRange(value as [number, number])}
            className="w-full"
          />
        </div>

        <Button onClick={resetFilters} variant="ghost" className="w-full">
          <X className="mr-2 h-4 w-4" />
          Reset Filters
        </Button>
      </CardContent>
    </Card>
  );
}
