
# Fix: Route Products to "Wishlist" Instead of "Read Later"

## What's Happening Now

When you save a product URL (e.g., from Amazon, eBay, Etsy), the AI analyzes the page and assigns a `contentType`. If it returns `"product"`, the tag is set to "wishlist". But if the AI doesn't confidently classify it as a product, it falls through to the default "read later" tag.

## Changes

### 1. Improve AI prompt to better detect products
**File:** `supabase/functions/analyze-url/index.ts` (~line 595-614)

Add explicit guidance in the AI system prompt telling it to classify e-commerce and shopping pages as `product` contentType. Add examples of product indicators (price, add-to-cart, buy buttons, product specs).

### 2. Add URL-based product detection as fallback
**File:** `supabase/functions/analyze-url/index.ts` (~line 711-714)

Add a domain-based heuristic check: if the URL belongs to known shopping sites (amazon, ebay, etsy, shopify stores, aliexpress, walmart, etc.) OR the page HTML contains strong product signals (price patterns, add-to-cart elements), override the tag to "wishlist" even if the AI didn't classify it as a product.

Updated logic:
```
const isProductUrl = checkProductSignals(url, htmlContent);
const primaryTag = platform
  ? 'watch later'
  : (result.contentType === 'product' || isProductUrl) ? 'wishlist' : 'read later';
```

### 3. Also use the AI `category` field
**File:** `supabase/functions/analyze-url/index.ts` (~line 711-714)

If the AI returns `category: "product"` (even if `contentType` differs), treat it as a product and assign "wishlist".

## Technical Details

A new helper function `checkProductSignals(url, html)` will be added that checks:
- Known e-commerce domains (amazon, ebay, etsy, walmart, aliexpress, shopify, etc.)
- HTML signals: `og:type` = `product`, price-related meta tags, schema.org Product markup
- URL path patterns containing `/product/`, `/item/`, `/dp/`, `/listing/`

This ensures products get tagged as "wishlist" reliably, with multiple layers of detection (AI classification + URL heuristics + HTML signals).
