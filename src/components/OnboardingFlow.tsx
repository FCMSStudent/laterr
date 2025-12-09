import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Sparkles, Plus, Search, TrendingUp, Check } from 'lucide-react';

interface OnboardingFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
  onAddFirstItem?: () => void;
}

const ONBOARDING_STEPS = [
  {
    id: 1,
    title: 'Welcome to Laterr',
    description: 'Your personal knowledge space where ideas, links, and files come together.',
    icon: Sparkles,
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground text-sm">
          Laterr helps you save, organize, and rediscover everything that matters to you.
        </p>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
            <span>Save links, notes, and files in one place</span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
            <span>AI-powered summaries and organization</span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
            <span>Find anything with smart search</span>
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: 2,
    title: 'Add Your First Item',
    description: 'Start building your knowledge base by adding links, notes, or files.',
    icon: Plus,
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground text-sm">
          Click the <strong>"Add Item"</strong> button to save:
        </p>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-primary">1</span>
            </div>
            <span><strong>URLs:</strong> Articles, videos, or any web page</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-primary">2</span>
            </div>
            <span><strong>Notes:</strong> Quick thoughts or detailed text</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-primary">3</span>
            </div>
            <span><strong>Files:</strong> PDFs, documents, and images</span>
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: 3,
    title: 'Search & Discover',
    description: 'Find what you need instantly with powerful search and smart filtering.',
    icon: Search,
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground text-sm">
          Use the search bar and filters to quickly find your saved items:
        </p>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <Search className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
            <span><strong>Search:</strong> Find items by title, tags, or content</span>
          </li>
          <li className="flex items-start gap-2">
            <TrendingUp className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
            <span><strong>Sort & Filter:</strong> Organize by date, type, or tags</span>
          </li>
        </ul>
      </div>
    ),
  },
];

export const OnboardingFlow = ({ open, onOpenChange, onComplete, onAddFirstItem }: OnboardingFlowProps) => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Reset to first step when dialog opens
    if (open) {
      setCurrentStep(0);
    }
  }, [open]);

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    // Mark onboarding as complete in localStorage
    localStorage.setItem('onboardingCompleted', 'true');
    onComplete();
    onOpenChange(false);
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleAddFirstItem = () => {
    handleComplete();
    if (onAddFirstItem) {
      onAddFirstItem();
    }
  };

  const step = ONBOARDING_STEPS[currentStep];
  const StepIcon = step.icon;
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] glass-card">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <StepIcon className="w-8 h-8 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl">{step.title}</DialogTitle>
          <DialogDescription className="text-center">{step.description}</DialogDescription>
        </DialogHeader>

        <div className="py-6">{step.content}</div>

        {/* Progress indicators */}
        <div className="flex justify-center gap-2 mb-4">
          {ONBOARDING_STEPS.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all ${
                index === currentStep
                  ? 'w-8 bg-primary'
                  : index < currentStep
                  ? 'w-2 bg-primary/50'
                  : 'w-2 bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          {currentStep > 0 && (
            <Button variant="outline" onClick={handlePrevious} className="flex-1">
              Previous
            </Button>
          )}
          
          {!isLastStep && (
            <Button variant="ghost" onClick={handleSkip} className="flex-1">
              Skip Tour
            </Button>
          )}
          
          {isLastStep ? (
            <>
              <Button onClick={handleSkip} variant="outline" className="flex-1">
                Skip for Now
              </Button>
              <Button onClick={handleAddFirstItem} className="flex-1 bg-primary hover:bg-primary/90">
                Add First Item
              </Button>
            </>
          ) : (
            <Button onClick={handleNext} className="flex-1 bg-primary hover:bg-primary/90">
              Next
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Helper function to check if user has completed onboarding
export const hasCompletedOnboarding = (): boolean => {
  return localStorage.getItem('onboardingCompleted') === 'true';
};
