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
      className="fixed bottom-8 right-8 h-14 w-14 rounded-full shadow-lg animate-float glass-card hover:scale-105 smooth-transition bg-primary hover:bg-primary/90 border-0"
    >
      <Plus className="h-6 w-6 text-white" />
    </Button>
  );
};