import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckSquare, 
  Square, 
  Mail, 
  X
} from "lucide-react";

interface BulkSelectBarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBulkApply: () => void;
  isAllSelected: boolean;
}

export const BulkSelectBar = ({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
  onBulkApply,
  isAllSelected
}: BulkSelectBarProps) => {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-3 px-4 py-3 bg-background/95 backdrop-blur-lg border-2 border-primary/20 rounded-2xl shadow-2xl">
        {/* Selection Info */}
        <Badge variant="secondary" className="text-sm font-semibold px-3 py-1">
          {selectedCount} selected
        </Badge>

        <div className="w-px h-6 bg-border" />

        {/* Select All / Clear */}
        <Button
          variant="ghost"
          size="sm"
          onClick={isAllSelected ? onClearSelection : onSelectAll}
          className="gap-2"
        >
          {isAllSelected ? (
            <>
              <Square className="h-4 w-4" />
              Clear All
            </>
          ) : (
            <>
              <CheckSquare className="h-4 w-4" />
              Select All ({totalCount})
            </>
          )}
        </Button>

        <div className="w-px h-6 bg-border" />

        {/* Bulk Actions */}
        <Button
          onClick={onBulkApply}
          size="sm"
          className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg"
        >
          <Mail className="h-4 w-4" />
          Bulk Apply
        </Button>

        {/* Close Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClearSelection}
          className="h-8 w-8 ml-1"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
