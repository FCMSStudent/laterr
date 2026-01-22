const fs = require('fs');
const path = require('path');

// Map of old imports to new imports
const importMap = {
  '@/shared/components/ui/button': '@/ui',
  '@/shared/components/ui/loading-button': '@/ui',
  '@/shared/components/ui/icon-button': '@/ui',
  '@/shared/components/ui/card': '@/ui',
  '@/shared/components/ui/badge': '@/ui',
  '@/shared/components/ui/input': '@/ui',
  '@/shared/components/ui/textarea': '@/ui',
  '@/shared/components/ui/dialog': '@/ui',
  '@/shared/components/ui/drawer': '@/ui',
  '@/shared/components/ui/sheet': '@/ui',
  '@/shared/components/ui/alert-dialog': '@/ui',
  '@/shared/components/ui/skeleton': '@/ui',
  '@/shared/components/ui/form': '@/ui',
  '@/shared/components/ui/label': '@/ui',
  '@/shared/components/ui/checkbox': '@/ui',
  '@/shared/components/ui/radio-group': '@/ui',
  '@/shared/components/ui/select': '@/ui',
  '@/shared/components/ui/switch': '@/ui',
  '@/shared/components/ui/separator': '@/ui',
  '@/shared/components/ui/scroll-area': '@/ui',
  '@/shared/components/ui/aspect-ratio': '@/ui',
  '@/shared/components/ui/resizable': '@/ui',
  '@/shared/components/ui/tabs': '@/ui',
  '@/shared/components/ui/accordion': '@/ui',
  '@/shared/components/ui/collapsible': '@/ui',
  '@/shared/components/ui/alert': '@/ui',
  '@/shared/components/ui/toast': '@/ui',
  '@/shared/components/ui/toaster': '@/ui',
  '@/shared/components/ui/progress': '@/ui',
  '@/shared/components/ui/sonner': '@/ui',
  '@/shared/components/ui/use-toast': '@/ui',
  '@/shared/components/ui/popover': '@/ui',
  '@/shared/components/ui/tooltip': '@/ui',
  '@/shared/components/ui/hover-card': '@/ui',
  '@/shared/components/ui/context-menu': '@/ui',
  '@/shared/components/ui/dropdown-menu': '@/ui',
  '@/shared/components/ui/table': '@/ui',
  '@/shared/components/ui/pagination': '@/ui',
  '@/shared/components/ui/avatar': '@/ui',
  '@/shared/components/ui/carousel': '@/ui',
  '@/shared/components/ui/calendar': '@/ui',
  '@/shared/components/ui/command': '@/ui',
  '@/shared/components/ui/menubar': '@/ui',
  '@/shared/components/ui/navigation-menu': '@/ui',
  '@/shared/components/ui/sidebar': '@/ui',
  '@/shared/components/ui/slider': '@/ui',
  '@/shared/components/ui/toggle': '@/ui',
  '@/shared/components/ui/toggle-group': '@/ui',
  '@/shared/components/ui/breadcrumb': '@/ui',
  '@/shared/components/ui/chart': '@/ui',
  '@/shared/components/ui/input-otp': '@/ui',
  '@/shared/components/LoadingSpinner': '@/ui',
};

function updateImports(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  for (const [oldImport, newImport] of Object.entries(importMap)) {
    // Match import statements
    const importRegex = new RegExp(`from ["']${oldImport.replace(/\//g, '\\/')}["']`, 'g');
    if (importRegex.test(content)) {
      content = content.replace(importRegex, `from "${newImport}"`);
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Updated: ${filePath}`);
    return true;
  }
  return false;
}

function walkDir(dir, callback) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
        walkDir(filePath, callback);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      callback(filePath);
    }
  });
}

console.log('Starting import migration...\n');

let updatedCount = 0;
walkDir('./src', (filePath) => {
  if (updateImports(filePath)) {
    updatedCount++;
  }
});

console.log(`\n✓ Migration complete! Updated ${updatedCount} files.`);
