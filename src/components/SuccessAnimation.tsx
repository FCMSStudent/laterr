import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface SuccessAnimationProps {
  className?: string;
  show?: boolean;
}

export const SuccessAnimation = ({ className, show = true }: SuccessAnimationProps) => {
  if (!show) return null;

  return (
    <div
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-green-500 text-white animate-in zoom-in-50 duration-300",
        className
      )}
    >
      <Check className="h-full w-full p-1" strokeWidth={3} />
    </div>
  );
};
