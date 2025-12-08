interface MobileHeaderProps {
  title: string;
  subtitle: string;
}

export const MobileHeader = ({ title, subtitle }: MobileHeaderProps) => {
  return (
    <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b md:hidden px-4 py-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
    </header>
  );
};
