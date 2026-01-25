import { supabase } from "@/integrations/supabase/client";
import { SUPABASE_ITEMS_TABLE, RETENTION_DAYS } from "../constants";
import type { ItemStatus } from "../types";

// Note: These functions use 'as any' because the Supabase types need to be regenerated
// after running the database migration to add status, archived_at, and trashed_at columns.

/**
 * Archive an item (mark as read/watched)
 * Sets status to 'archived' and records the archive timestamp
 */
export async function archiveItem(itemId: string): Promise<{ error: Error | null }> {
    const { error } = await supabase
        .from(SUPABASE_ITEMS_TABLE)
        .update({
            status: 'archived',
            archived_at: new Date().toISOString(),
        } as any)
        .eq('id', itemId);

    return { error: error ? new Error(error.message) : null };
}

/**
 * Move an item to trash (soft delete)
 * Sets status to 'trashed' and records the trash timestamp
 */
export async function trashItem(itemId: string): Promise<{ error: Error | null }> {
    const { error } = await supabase
        .from(SUPABASE_ITEMS_TABLE)
        .update({
            status: 'trashed',
            trashed_at: new Date().toISOString(),
        } as any)
        .eq('id', itemId);

    return { error: error ? new Error(error.message) : null };
}

/**
 * Restore an item from archive or trash back to active
 * Clears both archived_at and trashed_at timestamps
 */
export async function restoreItem(itemId: string): Promise<{ error: Error | null }> {
    const { error } = await supabase
        .from(SUPABASE_ITEMS_TABLE)
        .update({
            status: 'active',
            archived_at: null,
            trashed_at: null,
        } as any)
        .eq('id', itemId);

    return { error: error ? new Error(error.message) : null };
}

/**
 * Permanently delete an item from the database
 * This is a hard delete and cannot be undone
 */
export async function permanentlyDeleteItem(itemId: string): Promise<{ error: Error | null }> {
    const { error } = await supabase
        .from(SUPABASE_ITEMS_TABLE)
        .delete()
        .eq('id', itemId);

    return { error: error ? new Error(error.message) : null };
}

/**
 * Bulk archive multiple items
 */
export async function bulkArchiveItems(itemIds: string[]): Promise<{ error: Error | null }> {
    const { error } = await supabase
        .from(SUPABASE_ITEMS_TABLE)
        .update({
            status: 'archived',
            archived_at: new Date().toISOString(),
        } as any)
        .in('id', itemIds);

    return { error: error ? new Error(error.message) : null };
}

/**
 * Bulk move items to trash
 */
export async function bulkTrashItems(itemIds: string[]): Promise<{ error: Error | null }> {
    const { error } = await supabase
        .from(SUPABASE_ITEMS_TABLE)
        .update({
            status: 'trashed',
            trashed_at: new Date().toISOString(),
        } as any)
        .in('id', itemIds);

    return { error: error ? new Error(error.message) : null };
}

/**
 * Bulk restore items to active status
 */
export async function bulkRestoreItems(itemIds: string[]): Promise<{ error: Error | null }> {
    const { error } = await supabase
        .from(SUPABASE_ITEMS_TABLE)
        .update({
            status: 'active',
            archived_at: null,
            trashed_at: null,
        } as any)
        .in('id', itemIds);

    return { error: error ? new Error(error.message) : null };
}

/**
 * Check if a date is past the retention period
 */
export function isOverRetentionPeriod(dateString: string): boolean {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays >= RETENTION_DAYS;
}

/**
 * Calculate how many days until permanent deletion
 * Returns 0 if already past retention period
 */
export function getDaysUntilDeletion(dateString: string): number {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const daysRemaining = RETENTION_DAYS - diffDays;
    return Math.max(0, daysRemaining);
}

/**
 * Get a human-readable label for the archive action based on item type
 */
export function getArchiveActionLabel(itemType: string): string {
    switch (itemType) {
        case 'video':
            return "I've watched this";
        case 'url':
        case 'document':
        case 'note':
            return "I've read this";
        default:
            return "Archive";
    }
}
