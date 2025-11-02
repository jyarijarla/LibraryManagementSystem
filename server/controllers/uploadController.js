const Busboy = require('busboy');
const fs = require('node:fs');
const path = require('node:path');

// Base assets directory
const assetsDir = path.join(__dirname, '..', '..', 'client', 'public', 'assets');

// Create asset type folders
const assetTypes = ['books', 'cds', 'audiobooks', 'movies', 'technology', 'study-rooms'];
assetTypes.forEach(type => {
  const typeDir = path.join(assetsDir, type);
  if (!fs.existsSync(typeDir)) {
    fs.mkdirSync(typeDir, { recursive: true });
    console.log(`Created directory: ${typeDir}`);
  }
});

const handleUpload = (req, res) => {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  console.log('📤 Upload request received');
  
  const busboy = Busboy({ 
    headers: req.headers,
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB max file size
      files: 1 // Only allow 1 file at a time
    }
  });
  
  let uploadedFile = null;
  let isResponseSent = false;
  let assetType = null;
  let assetId = null;
  let fileBuffer = null;
  let fileInfo = null;
  let processingComplete = false;

  // Collect all fields first
  const fields = {};
  
  busboy.on('field', (fieldname, value) => {
    fields[fieldname] = value;
    console.log(`📝 Field received: ${fieldname} = ${value}`);
    
    if (fieldname === 'assetType') {
      assetType = value;
    } else if (fieldname === 'assetId') {
      assetId = value;
    }
  });

  busboy.on('file', (fieldname, file, info) => {
    const { filename, mimeType } = info;
    console.log(`📎 File received: ${filename}, type: ${mimeType}`);
    
    // Check if it's an image
    if (!mimeType.startsWith('image/')) {
      console.log('❌ Invalid file type');
      file.resume(); // Drain the stream
      if (!isResponseSent) {
        isResponseSent = true;
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Only image files are allowed' }));
      }
      return;
    }

    // Buffer the file data
    const chunks = [];
    file.on('data', (chunk) => {
      chunks.push(chunk);
    });

    file.on('end', () => {
      fileBuffer = Buffer.concat(chunks);
      fileInfo = { filename, mimeType };
      console.log(`✅ File buffered: ${fileBuffer.length} bytes`);
    });

    file.on('error', (error) => {
      console.error('❌ File stream error:', error);
      if (!isResponseSent) {
        isResponseSent = true;
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'File upload failed: ' + error.message }));
      }
    });
  });

  busboy.on('finish', () => {
    console.log('✅ Busboy finished parsing');
    
    // Now process the buffered file with the collected fields
    if (!fileBuffer || !fileInfo) {
      console.log('❌ No file was uploaded');
      if (!isResponseSent) {
        isResponseSent = true;
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'No file uploaded' }));
      }
      return;
    }

    // Use fields from the collected fields object
    const finalAssetType = assetType || fields.assetType || 'general';
    const finalAssetId = assetId || fields.assetId;

    if (!finalAssetId) {
      console.log('❌ No asset ID provided');
      if (!isResponseSent) {
        isResponseSent = true;
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Asset ID is required' }));
      }
      return;
    }

    console.log(`💾 Saving file for Asset ID: ${finalAssetId}, Type: ${finalAssetType}`);

    // Determine upload directory based on asset type
    const uploadDir = path.join(assetsDir, finalAssetType);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Use Asset_ID as filename with original extension
    const ext = path.extname(fileInfo.filename) || '.png';
    const newFilename = `${finalAssetId}${ext}`;
    const savePath = path.join(uploadDir, newFilename);

    console.log(`💾 Saving to: ${savePath}`);

    // Add 3 second delay to show the animation
    setTimeout(() => {
      // Write the buffered file
      try {
        fs.writeFileSync(savePath, fileBuffer);
        console.log(`✅ File saved successfully: ${newFilename} in ${finalAssetType} folder`);
        
        uploadedFile = {
          filename: newFilename,
          path: `/assets/${finalAssetType}/${newFilename}`
        };

        if (!isResponseSent) {
          isResponseSent = true;
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ 
            success: true,
            imageUrl: uploadedFile.path,
            filename: uploadedFile.filename
          }));
        }
      } catch (error) {
        console.error('❌ Error saving file:', error);
        if (!isResponseSent) {
          isResponseSent = true;
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Failed to save file: ' + error.message }));
        }
      }
    }, 3000); // 3 second delay to show animation
  });

  busboy.on('error', (error) => {
    console.error('❌ Busboy error:', error);
    if (!isResponseSent) {
      isResponseSent = true;
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Upload failed: ' + error.message }));
    }
  });

  // Handle request errors
  req.on('error', (error) => {
    console.error('❌ Request error:', error);
    if (!isResponseSent) {
      isResponseSent = true;
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Request failed: ' + error.message }));
    }
  });

  req.pipe(busboy);
};

module.exports = { handleUpload };
