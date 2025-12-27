import { useState, useMemo, useCallback } from 'react';
import {
  ExternalLink,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronRight,
  Download,
} from 'lucide-react';
import type { Paper, Category, RankFilter, SortConfig } from '@/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface PapersTableProps {
  papers: Paper[];
  categories: Category[];
  titleFilter: string;
  onTitleFilterChange: (value: string) => void;
  yearFilter: string;
  onYearFilterChange: (value: string) => void;
  rankFilter: RankFilter;
  onRankFilterChange: (value: RankFilter) => void;
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  perPage: number;
  onPerPageChange: (value: number) => void;
}

const PER_PAGE_OPTIONS = [10, 20, 50, 90];
const RANK_OPTIONS: RankFilter[] = ['Any', 'ABC', 'A', 'B', 'C', 'NotABC'];

function highlightText(text: string, tokens: string[]): React.ReactNode {
  if (tokens.length === 0) return text;

  const regex = new RegExp(`(${tokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  const parts = text.split(regex);

  return parts.map((part, i) => {
    const isMatch = tokens.some(t => part.toLowerCase() === t.toLowerCase());
    return isMatch ? <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded">{part}</mark> : part;
  });
}

export function PapersTable({
  papers,
  categories,
  titleFilter,
  onTitleFilterChange,
  yearFilter,
  onYearFilterChange,
  rankFilter,
  onRankFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  perPage,
  onPerPageChange,
}: PapersTableProps) {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortConfig>({ field: null, direction: 'asc' });
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Parse title filter tokens
  const { positiveTokens, negativeTokens } = useMemo(() => {
    const tokens = titleFilter.toLowerCase().split(/\s+/).filter(Boolean);
    const positive = tokens.filter(t => !t.startsWith('-'));
    const negative = tokens.filter(t => t.startsWith('-')).map(t => t.slice(1)).filter(Boolean);
    return { positiveTokens: positive, negativeTokens: negative };
  }, [titleFilter]);

  // Get unique years
  const years = useMemo(() => {
    const uniqueYears = [...new Set(papers.map(p => p.year))].filter(Boolean);
    return uniqueYears.sort((a, b) => b - a);
  }, [papers]);

  // Filter papers
  const filteredPapers = useMemo(() => {
    return papers.filter(paper => {
      // Title filter
      const titleLower = paper.title.toLowerCase();
      if (positiveTokens.length > 0 && !positiveTokens.every(t => titleLower.includes(t))) {
        return false;
      }
      if (negativeTokens.some(t => titleLower.includes(t))) {
        return false;
      }

      // Year filter
      if (yearFilter && paper.year !== parseInt(yearFilter, 10)) {
        return false;
      }

      // Rank filter
      if (rankFilter !== 'Any') {
        if (rankFilter === 'ABC') {
          if (!['A', 'B', 'C'].includes(paper.rank || '')) return false;
        } else if (rankFilter === 'NotABC') {
          if (['A', 'B', 'C'].includes(paper.rank || '')) return false;
        } else {
          if (paper.rank !== rankFilter) return false;
        }
      }

      // Category filter
      if (categoryFilter && paper.category !== parseInt(categoryFilter, 10)) {
        return false;
      }

      return true;
    });
  }, [papers, positiveTokens, negativeTokens, yearFilter, rankFilter, categoryFilter]);

  // Sort papers
  const sortedPapers = useMemo(() => {
    if (!sort.field) return filteredPapers;

    return [...filteredPapers].sort((a, b) => {
      const aVal = a[sort.field!];
      const bVal = b[sort.field!];

      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;

      let comparison = 0;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        comparison = aVal.localeCompare(bVal);
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      }

      return sort.direction === 'asc' ? comparison : -comparison;
    });
  }, [filteredPapers, sort]);

  // Paginate - clamp page to valid range
  const totalPages = Math.max(1, Math.ceil(sortedPapers.length / perPage));
  const paginatedPapers = useMemo(() => {
    const clampedPage = Math.min(page, Math.max(1, Math.ceil(sortedPapers.length / perPage)));
    const start = (clampedPage - 1) * perPage;
    return sortedPapers.slice(start, start + perPage);
  }, [sortedPapers, page, perPage]);

  const toggleSort = useCallback((field: keyof Paper) => {
    setSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  const toggleRow = useCallback((doi: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(doi)) {
        next.delete(doi);
      } else {
        next.add(doi);
      }
      return next;
    });
  }, []);

  const getCategoryInfo = useCallback((categoryId?: number) => {
    if (!categoryId) return null;
    return categories.find(c => c.id === categoryId);
  }, [categories]);

  const handleExport = useCallback(() => {
    const exportData = filteredPapers.map(p => ({
      id: p.doi.replace(/^https?:\/\/doi\.org\//, ''),
      title: p.title,
      year: p.year,
      pub: p.pub,
    }));
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'papers-export.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredPapers]);

  const renderSortIcon = (field: keyof Paper) => {
    if (sort.field !== field) return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    return sort.direction === 'asc' 
      ? <ArrowUp className="h-4 w-4 ml-1" />
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm font-medium mb-1 block">Title</label>
            <Input
              placeholder="Search titles... (use -word to exclude)"
              value={titleFilter}
              onChange={(e) => onTitleFilterChange(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="w-[120px]">
            <label className="text-sm font-medium mb-1 block">Year</label>
            <Select value={yearFilter || "any"} onValueChange={(v) => onYearFilterChange(v === "any" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                {years.map(year => (
                  <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-[120px]">
            <label className="text-sm font-medium mb-1 block">Rank</label>
            <Select value={rankFilter} onValueChange={(v) => onRankFilterChange(v as RankFilter)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RANK_OPTIONS.map(rank => (
                  <SelectItem key={rank} value={rank}>{rank}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-[180px]">
            <label className="text-sm font-medium mb-1 block">Category</label>
            <Select value={categoryFilter || "any"} onValueChange={(v) => onCategoryFilterChange(v === "any" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={String(cat.id)}>
                    {cat.icon} {cat.title.slice(0, 15)}...
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>

        {/* Results info */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {paginatedPapers.length} of {filteredPapers.length} papers
            {filteredPapers.length !== papers.length && ` (${papers.length} total)`}
          </span>
          <div className="flex items-center gap-2">
            <span>Per page:</span>
            <Select value={String(perPage)} onValueChange={(v) => onPerPageChange(parseInt(v, 10))}>
              <SelectTrigger className="w-[70px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PER_PAGE_OPTIONS.map(n => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead 
                  className="cursor-pointer select-none"
                  onClick={() => toggleSort('title')}
                >
                  <div className="flex items-center">
                    Title
                    {renderSortIcon('title')}
                  </div>
                </TableHead>
                <TableHead 
                  className="w-[80px] cursor-pointer select-none"
                  onClick={() => toggleSort('year')}
                >
                  <div className="flex items-center">
                    Year
                    {renderSortIcon('year')}
                  </div>
                </TableHead>
                <TableHead 
                  className="w-[60px] cursor-pointer select-none"
                  onClick={() => toggleSort('rank')}
                >
                  <div className="flex items-center">
                    Rank
                    {renderSortIcon('rank')}
                  </div>
                </TableHead>
                <TableHead 
                  className="w-[80px] cursor-pointer select-none"
                  onClick={() => toggleSort('category')}
                >
                  <div className="flex items-center">
                    Cat
                    {renderSortIcon('category')}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedPapers.map((paper) => {
                const isExpanded = expandedRows.has(paper.doi);
                const categoryInfo = getCategoryInfo(paper.category);

                return (
                  <>
                    <TableRow key={paper.doi} className="group">
                      <TableCell className="p-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => toggleRow(paper.doi)}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-start gap-2">
                          <div className="flex gap-1 shrink-0 mt-0.5">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <a
                                  href={paper.doi}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:text-primary/80"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </TooltipTrigger>
                              <TooltipContent>Open DOI</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <a
                                  href={`https://dblp.org/search?q=${encodeURIComponent(paper.title)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-muted-foreground hover:text-foreground"
                                >
                                  <Search className="h-4 w-4" />
                                </a>
                              </TooltipTrigger>
                              <TooltipContent>Search on DBLP</TooltipContent>
                            </Tooltip>
                          </div>
                          <div className="flex-1">
                            <span className="leading-tight">
                              {highlightText(paper.title, positiveTokens)}
                            </span>
                            {paper.pub && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className="ml-2 text-xs">
                                    {paper.pub}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>{paper.publisher}</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{paper.year}</TableCell>
                      <TableCell className="text-center">
                        {paper.rank && (
                          <Badge
                            variant={paper.rank === 'A' ? 'default' : 'secondary'}
                            className={cn(
                              paper.rank === 'A' && 'bg-green-600',
                              paper.rank === 'B' && 'bg-blue-500',
                              paper.rank === 'C' && 'bg-orange-500'
                            )}
                          >
                            {paper.rank}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {categoryInfo && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <a
                                href={categoryInfo.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-lg hover:opacity-80"
                              >
                                {categoryInfo.icon}
                              </a>
                            </TooltipTrigger>
                            <TooltipContent>{categoryInfo.title}</TooltipContent>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow key={`${paper.doi}-details`}>
                        <TableCell colSpan={5} className="bg-muted/30 py-3">
                          <div className="pl-10 space-y-2">
                            <div className="text-sm">
                              <span className="font-medium">Year:</span> {paper.year}
                            </div>
                            <div className="text-sm">
                              <span className="font-medium">Authors:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {paper.authors?.map((author, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {author}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
              {paginatedPapers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No papers found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground px-4">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
