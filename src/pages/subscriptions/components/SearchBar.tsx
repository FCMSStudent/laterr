import { EnhancedInput } from "@/shared/components/ui/input";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export const SearchBar = ({ value, onChange }: SearchBarProps) => {
  return (
    <EnhancedInput
      type="search"
      placeholder="Search subscriptions..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="glass-input h-11 text-base font-medium rounded-2xl shadow-md focus:shadow-lg"
      prefixIcon="search"
      showClearButton={true}
      onClear={() => onChange("")}
      aria-label="Search subscriptions by name or category"
    />
  );
};
