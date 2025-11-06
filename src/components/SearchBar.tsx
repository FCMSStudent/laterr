import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export const SearchBar = ({ value, onChange }: SearchBarProps) => {
  return (
    <div className="relative group">
      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary smooth-transition" aria-hidden="true" />
      <Input
        type="search"
        placeholder="Search your garden..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-12 pr-12 glass-input h-14 text-base font-medium rounded-2xl shadow-md focus:shadow-lg smooth-transition"
        aria-label="Search items by title, summary, or notes"
      />
      {value && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-muted/80 rounded-lg smooth-transition"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      )}
    </div>
  );
};
