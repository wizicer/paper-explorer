import { useCallback, useState } from 'react';
import { Upload, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { savePaperFile, getPaperFiles } from '@/lib/db';
import type { PaperFile } from '@/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface FileDropZoneProps {
  onFileLoaded: (data: ArrayBuffer) => void;
  paperFiles: PaperFile[];
  selectedFileId: string | null;
  onFileSelect: (id: string) => void;
  onFilesChange: () => void;
}

export function FileDropZone({
  onFileLoaded,
  paperFiles,
  selectedFileId,
  onFileSelect,
  onFilesChange,
}: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.bin')) {
      alert('Please drop a .bin file');
      return;
    }

    setIsLoading(true);
    try {
      const data = await file.arrayBuffer();
      const savedFile = await savePaperFile(file.name, data);
      onFilesChange();
      onFileSelect(savedFile.id);
      onFileLoaded(data);
    } catch (error) {
      console.error('Error loading file:', error);
      alert('Error loading file');
    } finally {
      setIsLoading(false);
    }
  }, [onFileLoaded, onFileSelect, onFilesChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleSelectChange = useCallback(async (id: string) => {
    const files = await getPaperFiles();
    const file = files.find(f => f.id === id);
    if (file) {
      onFileSelect(id);
      onFileLoaded(file.data);
    }
  }, [onFileLoaded, onFileSelect]);

  const getDisplayName = (name: string) => {
    return name.replace(/\.bin$/i, '');
  };

  return (
    <div className="flex items-center gap-4">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "flex items-center gap-2 px-4 py-2 border-2 border-dashed rounded-lg transition-colors cursor-pointer",
          isDragging
            ? "border-primary bg-primary/10"
            : "border-muted-foreground/25 hover:border-primary/50",
          isLoading && "opacity-50 pointer-events-none"
        )}
      >
        <Upload className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          {isLoading ? 'Loading...' : 'Drop paper.bin here'}
        </span>
      </div>

      {paperFiles.length > 0 && (
        <Select value={selectedFileId || 'none'} onValueChange={handleSelectChange}>
          <SelectTrigger className="w-[200px]">
            <FileText className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Select a file" />
          </SelectTrigger>
          <SelectContent>
            {paperFiles.map((file) => (
              <SelectItem key={file.id} value={file.id}>
                {getDisplayName(file.name)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
