# Image Upload Setup Instructions

## ✅ What's Been Done

1. **Installed Required Packages:**
   - express
   - cors  
   - multer (for file uploads)

2. **Created New Files:**
   - `upload.js` - Multer configuration for image uploads
   - `serverExpress.js` - New Express-based server with image upload support

3. **Updated Frontend:**
   - Admin.jsx now sends images using FormData (multipart/form-data)
   - Image preview functionality added
   - Table displays images with thumbnails

4. **Updated Backend:**
   - assetController.js now handles image files
   - Images are saved to `client/public/assets/uploads/`
   - Image paths are stored in the database

## 🚀 How to Use

### 1. Start the New Express Server

Instead of running `node server.js`, run:

```bash
cd server
node serverExpress.js
```

### 2. Upload Images from Admin Panel

1. Go to Admin dashboard
2. Click "Add" for any asset type
3. Fill in the form fields
4. Click "📁 Choose Image" button
5. Select an image from your computer
6. See the preview
7. Click "Add" to save

### 3. Image Storage

- Images are automatically saved to: `client/public/assets/uploads/`
- Image path is stored in database as: `/assets/uploads/filename.jpg`
- Images are accessible at: `http://localhost:5173/assets/uploads/filename.jpg`

## 📝 Database Requirements

The following columns need to exist in your tables (if they don't, add them):

```sql
ALTER TABLE book ADD COLUMN Image_URL VARCHAR(255);
ALTER TABLE cd ADD COLUMN Image_URL VARCHAR(255);
ALTER TABLE audiobook ADD COLUMN Image_URL VARCHAR(255);
ALTER TABLE movie ADD COLUMN Image_URL VARCHAR(255);
ALTER TABLE technology ADD COLUMN Image_URL VARCHAR(255);
ALTER TABLE study_room ADD COLUMN Image_URL VARCHAR(255);
```

## 🎯 Next Steps

1. **Switch to Express Server:**
   - Update your npm scripts or just run `node serverExpress.js`

2. **Add Database Columns:**
   - Run the SQL ALTER TABLE statements above

3. **Test It Out:**
   - Add a new book with an image
   - Check that the image appears in the table
   - Verify the image file is in `client/public/assets/uploads/`

## 💡 Tips

- Max image size: 5MB
- Supported formats: jpg, png, gif, webp, etc.
- Images are renamed with timestamps to avoid conflicts
- Old `server.js` still works if you need it

## 🔧 Troubleshooting

**Images not showing?**
- Check browser console for errors
- Verify image path in database
- Check that uploads folder exists
- Make sure Express server is running (not old server.js)

**Upload failing?**
- Check file size (< 5MB)
- Verify file is an image
- Check server console for errors
