// src/routes/uploads.js
const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const { 
  uploadImage, 
  deleteImage, 
  updateProductImage 
} = require('../controllers/uploadController');

// Subir imagen
router.post('/upload', upload.single('imagen'), uploadImage);

// Eliminar imagen por publicId
router.delete('/delete/:publicId', deleteImage);

// Actualizar imagen de producto específico
router.put('/producto/:productId', upload.single('imagen'), updateProductImage);

module.exports = router;