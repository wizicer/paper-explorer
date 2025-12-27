import { useState, useEffect, useCallback, useMemo } from 'react';
import { BookOpen } from 'lucide-react';
import type { Paper, Category, CCFVenue, RankFilter, PaperFile } from '@/types';
import { loadCategories, loadCCFVenues } from '@/lib/csv';
import { decodePaperBin, augmentPapers, extractKeywords } from '@/lib/papers';
import { getPaperFiles, getLatestPaperFile } from '@/lib/db';
import { loadSearchState, saveSearchState } from '@/lib/storage';
import { FileDropZone } from '@/components/FileDropZone';
import { PapersTable } from '@/components/PapersTable';
import { KeywordsPanel } from '@/components/KeywordsPanel';
import { Footer } from '@/components/Footer';

function App() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [ccfVenues, setCcfVenues] = useState<CCFVenue[]>([]);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [paperFiles, setPaperFiles] = useState<PaperFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | undefined>();
  const [stats, setStats] = useState<Record<string, number> | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  // Filter state
  const [titleFilter, setTitleFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [rankFilter, setRankFilter] = useState<RankFilter>('Any');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [perPage, setPerPage] = useState(20);

  // Load initial data
  useEffect(() => {
    async function init() {
      try {
        // Load CSV data
        const [cats, venues] = await Promise.all([
          loadCategories(),
          loadCCFVenues(),
        ]);
        setCategories(cats);
        setCcfVenues(venues);

        // Load saved search state
        const savedState = loadSearchState();
        setPerPage(savedState.perPage);
        for (const filter of savedState.filters) {
          if (filter.field === 'title') setTitleFilter(String(filter.filter));
          if (filter.field === 'year') setYearFilter(String(filter.filter));
          if (filter.field === 'rank') setRankFilter(filter.filter as RankFilter);
          if (filter.field === 'category') setCategoryFilter(String(filter.filter));
        }

        // Load paper files from IndexedDB
        const files = await getPaperFiles();
        setPaperFiles(files);

        // Load latest paper file if available
        const latestFile = await getLatestPaperFile();
        if (latestFile) {
          setSelectedFileId(latestFile.id);
          const decoded = await decodePaperBin(latestFile.data);
          const augmented = augmentPapers(decoded.papers, venues);
          setPapers(augmented);
          setFilename(decoded.filename);
          setStats(decoded.stats);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  // Save search state when filters change
  useEffect(() => {
    const filters: { field: string; filter: string | number }[] = [];
    if (titleFilter) filters.push({ field: 'title', filter: titleFilter });
    if (yearFilter) filters.push({ field: 'year', filter: yearFilter });
    if (rankFilter !== 'Any') filters.push({ field: 'rank', filter: rankFilter });
    if (categoryFilter) filters.push({ field: 'category', filter: categoryFilter });
    saveSearchState({ perPage, filters });
  }, [titleFilter, yearFilter, rankFilter, categoryFilter, perPage]);

  const handleFileLoaded = useCallback(async (data: ArrayBuffer) => {
    try {
      const decoded = await decodePaperBin(data);
      const augmented = augmentPapers(decoded.papers, ccfVenues);
      setPapers(augmented);
      setFilename(decoded.filename);
      setStats(decoded.stats);
    } catch (error) {
      console.error('Error decoding paper.bin:', error);
      alert('Error decoding paper.bin file');
    }
  }, [ccfVenues]);

  const refreshPaperFiles = useCallback(async () => {
    const files = await getPaperFiles();
    setPaperFiles(files);
  }, []);

  // Filter papers for keywords extraction
  const filteredPapers = useMemo(() => {
    const positiveTokens = titleFilter.toLowerCase().split(/\s+/).filter(t => t && !t.startsWith('-'));
    const negativeTokens = titleFilter.toLowerCase().split(/\s+/).filter(t => t.startsWith('-')).map(t => t.slice(1)).filter(Boolean);

    return papers.filter(paper => {
      const titleLower = paper.title.toLowerCase();
      if (positiveTokens.length > 0 && !positiveTokens.every(t => titleLower.includes(t))) return false;
      if (negativeTokens.some(t => titleLower.includes(t))) return false;
      if (yearFilter && paper.year !== parseInt(yearFilter, 10)) return false;
      if (rankFilter !== 'Any') {
        if (rankFilter === 'ABC' && !['A', 'B', 'C'].includes(paper.rank || '')) return false;
        if (rankFilter === 'NotABC' && ['A', 'B', 'C'].includes(paper.rank || '')) return false;
        if (['A', 'B', 'C'].includes(rankFilter) && paper.rank !== rankFilter) return false;
      }
      if (categoryFilter && paper.category !== parseInt(categoryFilter, 10)) return false;
      return true;
    });
  }, [papers, titleFilter, yearFilter, rankFilter, categoryFilter]);

  const keywords = useMemo(() => extractKeywords(filteredPapers), [filteredPapers]);

  const handleKeywordClick = useCallback((word: string) => {
    setTitleFilter(word);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <header className="mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Blockchain Survey</h1>
                <p className="text-sm text-muted-foreground">
                  Browse and filter academic papers
                </p>
              </div>
            </div>
            <FileDropZone
              onFileLoaded={handleFileLoaded}
              paperFiles={paperFiles}
              selectedFileId={selectedFileId}
              onFileSelect={setSelectedFileId}
              onFilesChange={refreshPaperFiles}
            />
          </div>
        </header>

        {/* Main content */}
        {papers.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h2 className="text-xl font-medium mb-2">No papers loaded</h2>
            <p className="text-muted-foreground">
              Drag and drop a <code className="bg-muted px-1 rounded">paper.bin</code> file to get started
            </p>
          </div>
        ) : (
          <>
            <KeywordsPanel keywords={keywords} onKeywordClick={handleKeywordClick} />
            <PapersTable
              papers={papers}
              categories={categories}
              titleFilter={titleFilter}
              onTitleFilterChange={setTitleFilter}
              yearFilter={yearFilter}
              onYearFilterChange={setYearFilter}
              rankFilter={rankFilter}
              onRankFilterChange={setRankFilter}
              categoryFilter={categoryFilter}
              onCategoryFilterChange={setCategoryFilter}
              perPage={perPage}
              onPerPageChange={setPerPage}
            />
            <Footer filename={filename} stats={stats} />
          </>
        )}
      </div>
    </div>
  );
}

export default App;
