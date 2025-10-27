import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FloatingActionButtonProps {
  onClick: () => void;
}

export const FloatingActionButton = ({ onClick }: FloatingActionButtonProps) => {
  return (
    <Button
      onClick={onClick}
      size="lg"
      className="fixed bottom-8 right-8 h-16 w-16 rounded-full shadow-lg animate-float glass-card border-2 hover:scale-110 transition-transform duration-300 bg-gradient-to-br from-primary to-accent"
    >
      <Plus className="h-8 w-8 text-white" />
    </Button>
  );
};