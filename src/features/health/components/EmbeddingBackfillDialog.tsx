import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui";
import { Button } from "@/shared/components/ui";
import { Progress } from "@/shared/components/ui";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui";
import { Sparkles, Loader2, CheckCircle, XCircle, Info } from "lucide-react";
import { 
  backfillAllEmbeddings, 
  countItemsNeedingEmbeddings,
  BackfillProgress 
} from "@/features/health/utils/embedding-backfill";
import { toast } from "sonner";

interface EmbeddingBackfillDialogProps {
  onComplete?: () => void;
}

/**
 * Dialog for backfilling embeddings on existing items
 * Useful for adding embeddings to items created before the feature was enabled
 */
export const EmbeddingBackfillDialog = ({ onComplete }: EmbeddingBackfillDialogProps) => {
  const [open, setOpen] = useState(false);
  const [itemsNeedingEmbeddings, setItemsNeedingEmbeddings] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [progress, setProgress] = useState<BackfillProgress>({
    total: 0,
    processed: 0,
    successful: 0,
    failed: 0
  });
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (open && !loading && !completed) {
      checkItemsNeedingEmbeddings();
    }
  }, [open, loading, completed]);

  const checkItemsNeedingEmbeddings = async () => {
    setChecking(true);
    try {
      const count = await countItemsNeedingEmbeddings();
      setItemsNeedingEmbeddings(count);
    } catch (error) {
      console.error('Error checking items:', error);
      toast.error('Failed to check items');
    } finally {
      setChecking(false);
    }
  };

  const handleBackfill = async () => {
    setLoading(true);
    setCompleted(false);

    try {
      const result = await backfillAllEmbeddings(50, (prog) => {
        setProgress(prog);
      });

      setCompleted(true);
      
      if (result.successful > 0) {
        toast.success('Embeddings backfill complete!', {
          description: `Successfully generated ${result.successful} embeddings`
        });
      }
      
      if (result.failed > 0) {
        toast.warning('Some embeddings failed', {
          description: `${result.failed} items failed to generate embeddings`
        });
      }

      onComplete?.();
    } catch (error) {
      console.error('Error during backfill:', error);
      toast.error('Backfill failed', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  const progressPercentage = progress.total > 0 
    ? Math.round((progress.processed / progress.total) * 100)
    : 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Sparkles className="w-4 h-4 mr-2" />
          Generate Embeddings
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Generate Embeddings
          </DialogTitle>
          <DialogDescription>
            Add semantic embeddings to existing items for improved search and recommendations
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {checking ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : !loading && !completed ? (
            <>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Items without embeddings</AlertTitle>
                <AlertDescription>
                  {itemsNeedingEmbeddings === 0 ? (
                    "All your items already have embeddings!"
                  ) : (
                    <>
                      Found <strong>{itemsNeedingEmbeddings}</strong> item{itemsNeedingEmbeddings !== 1 ? 's' : ''} that need embeddings.
                      This process may take a few minutes.
                    </>
                  )}
                </AlertDescription>
              </Alert>

              {itemsNeedingEmbeddings > 0 && (
                <div className="flex gap-2">
                  <Button 
                    onClick={handleBackfill}
                    disabled={loading}
                    className="flex-1"
                  >
                    Start Generation
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </>
          ) : loading ? (
            <>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span className="text-muted-foreground">
                    {progress.processed} / {progress.total}
                  </span>
                </div>
                <Progress value={progressPercentage} />
              </div>

              {progress.currentItem && (
                <div className="text-sm text-muted-foreground truncate">
                  Processing: {progress.currentItem}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Successful: {progress.successful}</span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-500" />
                  <span>Failed: {progress.failed}</span>
                </div>
              </div>
            </>
          ) : (
            <>
              <Alert>
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertTitle>Backfill Complete!</AlertTitle>
                <AlertDescription>
                  Successfully generated {progress.successful} embeddings.
                  {progress.failed > 0 && ` ${progress.failed} items failed.`}
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setCompleted(false);
                    checkItemsNeedingEmbeddings();
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Check Again
                </Button>
                <Button
                  onClick={() => setOpen(false)}
                  className="flex-1"
                >
                  Done
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
