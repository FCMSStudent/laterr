import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Folder, Plus, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { useCollections, useCreateCollection, useUpdateCollection, useDeleteCollection } from '@/hooks/useCollections';
import { cn } from '@/lib/utils';

interface CollectionsListProps {
  selectedCollectionId: string | null;
  onSelectCollection: (collectionId: string | null) => void;
  className?: string;
}

export const CollectionsList = ({ selectedCollectionId, onSelectCollection, className }: CollectionsListProps) => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [editingCollection, setEditingCollection] = useState<{ id: string; name: string } | null>(null);
  const [deletingCollectionId, setDeletingCollectionId] = useState<string | null>(null);

  const { data: collections, isLoading } = useCollections();
  const createCollection = useCreateCollection();
  const updateCollection = useUpdateCollection();
  const deleteCollection = useDeleteCollection();

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) return;
    
    try {
      await createCollection.mutateAsync(newCollectionName.trim());
      setNewCollectionName('');
      setShowCreateDialog(false);
    } catch (error) {
      console.error('Error creating collection:', error);
    }
  };

  const handleUpdateCollection = async () => {
    if (!editingCollection || !editingCollection.name.trim()) return;
    
    try {
      await updateCollection.mutateAsync({
        id: editingCollection.id,
        name: editingCollection.name.trim(),
      });
      setEditingCollection(null);
      setShowEditDialog(false);
    } catch (error) {
      console.error('Error updating collection:', error);
    }
  };

  const handleDeleteCollection = async () => {
    if (!deletingCollectionId) return;
    
    try {
      await deleteCollection.mutateAsync(deletingCollectionId);
      if (selectedCollectionId === deletingCollectionId) {
        onSelectCollection(null);
      }
      setDeletingCollectionId(null);
      setShowDeleteDialog(false);
    } catch (error) {
      console.error('Error deleting collection:', error);
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between px-2">
        <h3 className="text-sm font-semibold text-muted-foreground">COLLECTIONS</h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setShowCreateDialog(true)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-1">
        <Button
          variant={selectedCollectionId === null ? 'secondary' : 'ghost'}
          className="w-full justify-start"
          onClick={() => onSelectCollection(null)}
        >
          <Folder className="mr-2 h-4 w-4" />
          All Items
        </Button>

        {isLoading ? (
          <div className="px-2 py-4 text-sm text-muted-foreground text-center">
            Loading collections...
          </div>
        ) : collections && collections.length > 0 ? (
          collections.map((collection) => (
            <div key={collection.id} className="flex items-center group">
              <Button
                variant={selectedCollectionId === collection.id ? 'secondary' : 'ghost'}
                className="flex-1 justify-start"
                onClick={() => onSelectCollection(collection.id)}
              >
                <Folder className="mr-2 h-4 w-4" />
                <span className="truncate">{collection.name}</span>
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      setEditingCollection({ id: collection.id, name: collection.name });
                      setShowEditDialog(true);
                    }}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => {
                      setDeletingCollectionId(collection.id);
                      setShowDeleteDialog(true);
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))
        ) : (
          <div className="px-2 py-4 text-sm text-muted-foreground text-center">
            No collections yet
          </div>
        )}
      </div>

      {/* Create Collection Dialog */}
      <AlertDialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create New Collection</AlertDialogTitle>
            <AlertDialogDescription>
              Give your collection a name to organize your items.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            placeholder="Collection name"
            value={newCollectionName}
            onChange={(e) => setNewCollectionName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleCreateCollection();
              }
            }}
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setNewCollectionName('')}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCreateCollection}
              disabled={!newCollectionName.trim() || createCollection.isPending}
            >
              {createCollection.isPending ? 'Creating...' : 'Create'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Collection Dialog */}
      <AlertDialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rename Collection</AlertDialogTitle>
            <AlertDialogDescription>
              Enter a new name for this collection.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            placeholder="Collection name"
            value={editingCollection?.name || ''}
            onChange={(e) => setEditingCollection(prev => prev ? { ...prev, name: e.target.value } : null)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleUpdateCollection();
              }
            }}
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEditingCollection(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUpdateCollection}
              disabled={!editingCollection?.name.trim() || updateCollection.isPending}
            >
              {updateCollection.isPending ? 'Updating...' : 'Update'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Collection Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Collection</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this collection? Items in this collection will not be deleted,
              but they will no longer be organized in this collection.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingCollectionId(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCollection}
              disabled={deleteCollection.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteCollection.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
