import { EnhancedInput } from "@/components/ui/input";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export const SearchBar = ({ value, onChange }: SearchBarProps) => {
  return (
    <EnhancedInput
      type="search"
      placeholder="Search your space..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="glass-input h-10 md:h-11 text-base font-medium rounded-2xl shadow-md focus:shadow-lg min-h-[44px] w-full"
      prefixIcon="search"
      data-search-input
      showClearButton={true}
      onClear={() => onChange("")}
      aria-label="Search items by title, summary, or notes"
    />
  );
};
