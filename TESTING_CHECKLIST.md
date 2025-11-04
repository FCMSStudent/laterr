# File Upload Testing Checklist

## Pre-Deployment Verification

Before deploying the migration, verify current state:

- [ ] Confirm file uploads are currently failing
- [ ] Note the exact error message being shown
- [ ] Take screenshots of the error for comparison

## Deployment

Deploy the migration using one of the methods in `UPLOAD_FIX_DEPLOYMENT.md`:

- [ ] Choose deployment method (Supabase CLI, Dashboard, or Manual SQL)
- [ ] Execute the migration
- [ ] Verify the migration was applied successfully
- [ ] Check storage policies in Supabase Dashboard

## Post-Deployment Testing

### Test 1: Image Upload (JPG)
- [ ] Log into the application
- [ ] Click "Add Item" button
- [ ] Switch to "Files" tab
- [ ] Select a JPG image file (under 20MB)
- [ ] Click "Upload File"
- [ ] **Expected**: File uploads successfully
- [ ] **Expected**: "Uploading file..." status appears
- [ ] **Expected**: "Extracting text..." status appears
- [ ] **Expected**: "Summarizing content..." status appears
- [ ] **Expected**: "Saving to your garden..." status appears
- [ ] **Expected**: Success message: "Image added to your garden! 📁"
- [ ] **Expected**: Item appears in the collection with preview image
- [ ] **Expected**: AI-generated title and summary are displayed
- [ ] Check browser console - should see upload success logs
- [ ] Verify no errors in console

### Test 2: Image Upload (PNG)
- [ ] Repeat Test 1 with a PNG file
- [ ] Verify same success criteria

### Test 3: Image Upload (WebP)
- [ ] Repeat Test 1 with a WebP file
- [ ] Verify same success criteria

### Test 4: PDF Upload
- [ ] Click "Add Item" button
- [ ] Switch to "Files" tab
- [ ] Select a PDF file (under 20MB)
- [ ] Click "Upload File"
- [ ] **Expected**: File uploads successfully
- [ ] **Expected**: "PDF added to your garden! 📁" success message
- [ ] **Expected**: Item appears in collection
- [ ] **Expected**: AI-generated title and summary from PDF content
- [ ] **Expected**: Default tag is "read later"
- [ ] Click on the item to view details
- [ ] Verify PDF can be previewed or downloaded

### Test 5: Word Document Upload (.docx)
- [ ] Click "Add Item" button
- [ ] Switch to "Files" tab
- [ ] Select a .docx file (under 20MB)
- [ ] Click "Upload File"
- [ ] **Expected**: File uploads successfully
- [ ] **Expected**: "Document added to your garden! 📁" success message
- [ ] **Expected**: Item appears in collection
- [ ] **Expected**: AI-generated title and summary from document content
- [ ] **Expected**: Default tag is "read later"

### Test 6: Word Document Upload (.doc)
- [ ] Repeat Test 5 with a .doc file
- [ ] Verify same success criteria

### Test 7: Invalid File Type
- [ ] Attempt to upload a .txt file
- [ ] **Expected**: Error message: "Invalid File Type"
- [ ] **Expected**: Description: "Only images (JPG, PNG, GIF, WebP), PDFs, and Word documents are supported."
- [ ] Verify upload is blocked

### Test 8: File Too Large
- [ ] Attempt to upload a file larger than 20MB
- [ ] **Expected**: Error message: "File Too Large"
- [ ] **Expected**: Description: "The file size exceeds 20MB. Please compress or choose a smaller file."
- [ ] Verify upload is blocked

### Test 9: Multiple Files in Sequence
- [ ] Upload 3 different files in quick succession
- [ ] **Expected**: All 3 files upload successfully
- [ ] **Expected**: All 3 items appear in collection
- [ ] Verify no rate limiting errors (unless many files uploaded)

### Test 10: Error Handling - Network Interruption
- [ ] Start uploading a large file
- [ ] Interrupt network connection (turn off WiFi briefly)
- [ ] **Expected**: Appropriate error message appears
- [ ] **Expected**: User can retry after reconnecting
- [ ] Verify error is handled gracefully

### Test 11: Console Logging Verification
- [ ] Open browser developer console (F12)
- [ ] Upload a file
- [ ] **Expected**: See logs like:
  - "Uploading file: [filename]"
  - "Upload successful"
  - "Starting AI analysis for file: [filename]"
  - "AI analysis complete"
  - "Inserting item into database"
  - "Item successfully added to database"
- [ ] **NOT Expected**: User IDs or file paths in logs
- [ ] Verify no sensitive data is logged

### Test 12: File Preview After Upload
- [ ] Upload an image file
- [ ] Click on the uploaded item
- [ ] **Expected**: Full image preview appears in modal
- [ ] **Expected**: Image loads correctly
- [ ] Close modal and verify image thumbnail in grid view

### Test 13: Different User Accounts
If you have multiple test accounts:
- [ ] Log in as User A
- [ ] Upload a file
- [ ] Log out
- [ ] Log in as User B
- [ ] **Expected**: User B cannot see User A's file
- [ ] Upload a file as User B
- [ ] **Expected**: User B can see only their own file
- [ ] Verify user isolation works correctly

## Browser Compatibility Testing

Test in multiple browsers:
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if available)

For each browser, perform at least Tests 1, 4, and 7.

## Performance Monitoring

- [ ] Monitor upload times for different file sizes
- [ ] Verify AI analysis completes in reasonable time (< 30 seconds)
- [ ] Check for memory leaks (upload 10+ files)
- [ ] Verify browser doesn't slow down significantly

## Regression Testing

Verify other features still work:
- [ ] URL upload still works
- [ ] Note creation still works
- [ ] Item deletion still works
- [ ] Item editing still works
- [ ] Search/filter still works

## Success Criteria

All tests must pass for the fix to be considered successful:
- ✅ All valid file types upload successfully
- ✅ Invalid file types are properly rejected with clear messages
- ✅ AI analysis works correctly for all file types
- ✅ Items appear in collection with correct preview images
- ✅ No sensitive data in console logs
- ✅ Error handling is graceful and informative
- ✅ User data isolation is maintained
- ✅ No performance degradation

## Rollback Triggers

Rollback the migration if:
- ❌ File uploads still fail after deployment
- ❌ Users can access other users' files
- ❌ Critical functionality breaks
- ❌ Security vulnerabilities are discovered

See `UPLOAD_FIX_DEPLOYMENT.md` for rollback instructions.

## Reporting Results

After testing, document:
1. Which tests passed/failed
2. Any unexpected behavior
3. Browser-specific issues
4. Performance observations
5. Screenshots of success/failure states

## Notes

- The migration only needs to be deployed once
- After deployment, the fix is permanent unless rolled back
- Console logs are for debugging and can be removed in future updates
- If any test fails, check browser console for detailed error messages
