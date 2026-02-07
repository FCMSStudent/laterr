import { LoadingSpinner } from "@/shared/components/ui";

export const PageLoading = () => {
    return (
        <div className="flex min-h-screen items-center justify-center">
            <LoadingSpinner size="lg" text="Loading..." />
        </div>
    );
};
