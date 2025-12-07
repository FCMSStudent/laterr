import { useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { MobileHeader } from "@/components/MobileHeader";
import { ItemCardSkeleton } from "@/components/ItemCardSkeleton";

const MobileNavDemo = () => {
  const [mobileView, setMobileView] = useState<"all" | "bookmarks">("all");
  const [showAddModal, setShowAddModal] = useState(false);

  const handleShowAllItems = () => {
    setMobileView("all");
  };

  const handleShowBookmarks = () => {
    setMobileView("bookmarks");
  };

  return (
    <main className="w-full">
      <div className="min-h-screen pb-20 md:pb-0">
          {/* Mobile Header */}
          <MobileHeader title="Laterr" subtitle="Your personal knowledge space" />
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold mb-2">
                {mobileView === "all" ? "All Items" : "Bookmarked Items"}
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Mobile navigation demo - Try resizing your browser to see mobile view
              </p>
            </div>

            <main id="main-content">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-12">
                {Array.from({ length: 4 }).map((_, index) => (
                  <ItemCardSkeleton key={index} />
                ))}
              </div>
            </main>
          </div>
          
          {/* Mobile Bottom Navigation */}
          <BottomNav 
            onAddItem={() => setShowAddModal(true)}
            onShowAllItems={handleShowAllItems}
            onShowBookmarks={handleShowBookmarks}
            activeView={mobileView}
          />
          
          {showAddModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-background p-6 rounded-lg shadow-lg max-w-sm w-full mx-4">
                <h3 className="text-lg font-semibold mb-2">Add Item Modal</h3>
                <p className="text-sm text-muted-foreground mb-4">This is where the add item modal would appear</p>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
                >
                  Close
                </button>
              </div>
            </div>
          )}
      </div>
    </main>
  );
};

export default MobileNavDemo;
