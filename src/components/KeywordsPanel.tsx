import { useState } from 'react';
import { ChevronDown, ChevronRight, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface KeywordsPanelProps {
  keywords: { word: string; count: number }[];
  onKeywordClick: (word: string) => void;
}

export function KeywordsPanel({ keywords, onKeywordClick }: KeywordsPanelProps) {
  const [isOpen, setIsOpen] = useState(true);

  if (keywords.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-4">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 p-2 h-auto">
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <Hash className="h-4 w-4" />
          <span className="font-medium">Keywords ({keywords.length})</span>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg">
          {keywords.map(({ word, count }) => (
            <Badge
              key={word}
              variant="secondary"
              className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
              onClick={() => onKeywordClick(word)}
            >
              {word}
              <span className="ml-1 text-xs opacity-70">({count})</span>
            </Badge>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
