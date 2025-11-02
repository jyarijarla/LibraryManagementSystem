const Busboy = require('busboy');
const fs = require('fs');
const path = require('path');

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

  console.log('Upload request received');
  const busboy = Busboy({ headers: req.headers });
  let uploadedFile = null;
  let isResponseSent = false;
  let assetType = 'general'; // Default folder
  let assetId = null; // Asset ID for filename
  let pendingFile = null;

  // Parse fields to get asset type and asset ID FIRST
  busboy.on('field', (fieldname, value) => {
    if (fieldname === 'assetType') {
      assetType = value;
      console.log(`Asset type: ${assetType}`);
    } else if (fieldname === 'assetId') {
      assetId = value;
      console.log(`Asset ID: ${assetId}`);
    }
    
    // If we have both assetType and assetId, and a pending file, process it now
    if (pendingFile && assetType && assetId) {
      processFile(pendingFile.fieldname, pendingFile.file, pendingFile.info, assetType, assetId);
      pendingFile = null;
    }
  });

  function processFile(fieldname, file, info, type, assetId) {
    const { filename, mimeType } = info;
    console.log(`Processing file: ${filename}, type: ${mimeType}, asset type: ${type}, asset ID: ${assetId}`);
    
    // Check if it's an image
    if (!mimeType.startsWith('image/')) {
      if (!isResponseSent) {
        isResponseSent = true;
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Only image files are allowed' }));
      }
      file.resume(); // Drain the stream
      return;
    }

    // Determine upload directory based on asset type
    const uploadDir = path.join(assetsDir, type);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Use Asset_ID as filename with original extension
    const ext = path.extname(filename) || '.png';
    const newFilename = `${assetId}${ext}`;
    const savePath = path.join(uploadDir, newFilename);

    console.log(`Saving to: ${savePath}`);

    // Save the file
    const writeStream = fs.createWriteStream(savePath);
    file.pipe(writeStream);

    writeStream.on('finish', () => {
      console.log(`File saved successfully: ${newFilename} in ${type} folder`);
      uploadedFile = {
        filename: newFilename,
        path: `/assets/${type}/${newFilename}`
      };
    });

    writeStream.on('error', (error) => {
      console.error('Error saving file:', error);
      if (!isResponseSent) {
        isResponseSent = true;
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Failed to save file: ' + error.message }));
      }
    });
  }

  busboy.on('file', (fieldname, file, info) => {
    // Store the file info until we get both asset type and asset ID
    if (!assetType || !assetId) {
      console.log('File received before asset type/ID, storing...');
      pendingFile = { fieldname, file, info };
    } else {
      processFile(fieldname, file, info, assetType, assetId);
    }
  });

  busboy.on('finish', () => {
    console.log('Busboy finished parsing');
    // Wait a bit to ensure file write is complete
    setTimeout(() => {
      if (!isResponseSent) {
        if (uploadedFile) {
          console.log('Sending success response:', uploadedFile);
          isResponseSent = true;
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ 
            success: true,
            imageUrl: uploadedFile.path,
            filename: uploadedFile.filename
          }));
        } else {
          console.log('No file was uploaded');
          isResponseSent = true;
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'No file uploaded' }));
        }
      }
    }, 100);
  });

  busboy.on('error', (error) => {
    console.error('Busboy error:', error);
    if (!isResponseSent) {
      isResponseSent = true;
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Upload failed: ' + error.message }));
    }
  });

  req.pipe(busboy);
};

module.exports = { handleUpload };
