const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');

const app = express();

let bucket;
const connection = mongoose.createConnection('mongodb://localhost:27017/gridfs'); // `gridfs` is the database, you can name it as you want
// Listen to the open of the database connection to create (if not exist) or retrieve our bucket reference
connection.once('open', () => {
  bucket = new mongoose.mongo.GridFSBucket(connection, {
    bucketName: 'uploads', // Override the default bucket name (fs)
    chunkSizeBytes: 1048576 // Override the default chunk size (255KB)
  });
});

// With first upload, the `uploads` bucket will be created if not exist
const storage = new GridFsStorage({
  db: connection,
  file: (req, file) => ({
    filename: `${file.originalname}_${Date.now()}`, // Override the default filename
    bucketName: 'uploads', // Override the default bucket name (fs)
    chunkSize: 500000, // Override the default chunk size (255KB)
    metadata: { uploadedBy: 'Someone', downloadCount: 4 } // Attach any metadata to the uploaded file
  })
});
const upload = multer({ storage }); // Use GridFS as a multer storage

// Use multer as a middleware to upload the file
app.post('/upload', upload.single('file'), (req, res) => {
  res.json(req.file);
});

app.get('/metadata', async (req, res) => {
  try {
    // The find() method returns a cursor that manages the results of your query
    const cursor = bucket.find({});
    // Retrieve the data as array
    const filesMetadata = await cursor.toArray();
    res.json(filesMetadata);
  } catch (err) {
    res.json({ err: `Error: ${err.message}` });
  }
});

app.get('/metadata/:id', async (req, res) => {
  try {
    const _id = mongoose.Types.ObjectId(req.params.id);
    const cursor = bucket.find({ _id });
    const filesMetadata = await cursor.toArray();
    res.json(filesMetadata[0] || null);
  } catch (err) {
    res.json({ err: `Error: ${err.message}` });
  }
});

app.get('/file/:id', async (req, res) => {
  try {
    const _id = mongoose.Types.ObjectId(req.params.id);
    // Getting the file first is only a guard to avoid FileNotFound error
    const cursor = bucket.find({ _id });
    const filesMetadata = await cursor.toArray();
    if (!filesMetadata.length) return res.json({ err: 'Not a File!' });
    // You can simply stream a file like this with its id
    bucket.openDownloadStream(_id).pipe(res);
  } catch (err) {
    res.json({ err: `Error: ${err.message}` });
  }
});

app.listen(3000);
