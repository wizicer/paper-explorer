import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface FooterProps {
  filename?: string;
  stats?: Record<string, number>;
}

export function Footer({ filename, stats }: FooterProps) {
  if (!filename && !stats) return null;

  const statsEntries = stats ? Object.entries(stats).slice(0, 20) : [];

  return (
    <TooltipProvider>
      <footer className="mt-8 pt-4 border-t text-sm text-muted-foreground">
        {filename && (
          <p className="mb-2">
            Data generated from{' '}
            <a
              href={`https://dblp.org/xml/release/${filename}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {filename}
            </a>
          </p>
        )}
        {statsEntries.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {statsEntries.map(([word, count]) => (
              <Tooltip key={word}>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-xs cursor-default">
                    {word}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>Count: {count}</TooltipContent>
              </Tooltip>
            ))}
          </div>
        )}
      </footer>
    </TooltipProvider>
  );
}
