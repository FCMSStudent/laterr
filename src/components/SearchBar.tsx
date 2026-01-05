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
      className="glass-input h-11 text-base font-medium rounded-2xl shadow-md focus:shadow-lg"
      prefixIcon="search"
      showClearButton={true}
      onClear={() => onChange("")}
      aria-label="Search items by title, summary, or notes"
    />
  );
};
