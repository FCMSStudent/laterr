import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { EnhancedInput } from '@/components/ui/input';
import { Plus, Folder } from 'lucide-react';
import { useCollections, useCreateCollection } from '@/hooks/useCollections';

interface CollectionSelectorProps {
  value: string | null;
  onChange: (collectionId: string | null) => void;
  className?: string;
}

export const CollectionSelector = ({ value, onChange, className }: CollectionSelectorProps) => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  
  const { data: collections, isLoading } = useCollections();
  const createCollection = useCreateCollection();

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) return;
    
    try {
      const result = await createCollection.mutateAsync(newCollectionName.trim());
      setNewCollectionName('');
      setShowCreateDialog(false);
      onChange(result.id);
    } catch (error) {
      console.error('Error creating collection:', error);
    }
  };

  return (
    <div className={className}>
      <Label htmlFor="collection-select" className="text-xs font-semibold text-muted-foreground mb-2 block">
        COLLECTION
      </Label>
      <div className="flex gap-2">
        <Select value={value || 'none'} onValueChange={(val) => onChange(val === 'none' ? null : val)}>
          <SelectTrigger id="collection-select" className="flex-1">
            <SelectValue placeholder="No collection" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">
              <div className="flex items-center gap-2">
                <Folder className="h-4 w-4" />
                <span>No collection</span>
              </div>
            </SelectItem>
            {isLoading ? (
              <SelectItem value="loading" disabled>
                Loading...
              </SelectItem>
            ) : (
              collections?.map((collection) => (
                <SelectItem key={collection.id} value={collection.id}>
                  <div className="flex items-center gap-2">
                    <Folder className="h-4 w-4" />
                    <span>{collection.name}</span>
                  </div>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Collection</DialogTitle>
              <DialogDescription>
                Give your collection a name to organize your items.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="collection-name">Collection Name</Label>
                <EnhancedInput
                  id="collection-name"
                  placeholder="e.g., Work Resources, Reading List"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCreateCollection();
                    }
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreateDialog(false);
                  setNewCollectionName('');
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleCreateCollection}
                disabled={!newCollectionName.trim() || createCollection.isPending}
              >
                {createCollection.isPending ? 'Creating...' : 'Create Collection'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
