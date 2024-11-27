const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const app = express();

// Create Gradesource directory if it doesn't exist
const gradesourcePath = path.join(__dirname, 'Gradesource');
if (!fs.existsSync(gradesourcePath)) {
    fs.mkdirSync(gradesourcePath);
}

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, gradesourcePath);
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Handle file upload
app.post('/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            throw new Error('No file uploaded');
        }
        console.log('File uploaded:', req.file);
        res.json({ 
            success: true,
            message: 'File uploaded successfully',
            filename: req.file.originalname 
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all files
app.get('/getAllFiles', (req, res) => {
    try {
        // Set proper headers
        res.setHeader('Content-Type', 'application/json');
        
        const results = [];
        
        // Check if directory exists
        if (!fs.existsSync(gradesourcePath)) {
            console.log('Creating Gradesource directory');
            fs.mkdirSync(gradesourcePath);
            return res.json({ files: results });
        }

        const files = fs.readdirSync(gradesourcePath);
        console.log('Found files:', files);

        files.forEach(file => {
            if (file.endsWith('.xlsx') || file.endsWith('.xls')) {
                try {
                    const filePath = path.join(gradesourcePath, file);
                    console.log('Reading file:', filePath);

                    const workbook = XLSX.readFile(filePath);
                    const sheetName = workbook.SheetNames[0];
                    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

                    if (data.length > 0) {
                        results.push({
                            fileName: file,
                            records: data
                        });
                    }
                } catch (err) {
                    console.error(`Error reading file ${file}:`, err);
                }
            }
        });

        console.log(`Found ${results.length} files with data`);
        return res.json({ files: results });
        
    } catch (error) {
        console.error('Error getting files:', error);
        return res.status(500).json({ error: error.message });
    }
});

// Search across all files
app.get('/search/:studentNo', (req, res) => {
    try {
        const studentNo = req.params.studentNo;
        const results = [];
        
        const files = fs.readdirSync(gradesourcePath);
        
        files.forEach(file => {
            if (file.endsWith('.xlsx') || file.endsWith('.xls')) {
                const filePath = path.join(gradesourcePath, file);
                const workbook = XLSX.readFile(filePath);
                const sheetName = workbook.SheetNames[0];
                const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
                
                const matches = data.filter(record => 
                    record['STUDENT NO.'].toString().includes(studentNo)
                );
                
                if (matches.length > 0) {
                    results.push({
                        fileName: file,
                        records: matches
                    });
                }
            }
        });
        
        res.json(results);
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Add this new endpoint for deleting files
app.delete('/deleteFile/:filename', (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(gradesourcePath, filename);
        
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            res.json({ success: true, message: 'File deleted successfully' });
        } else {
            res.status(404).json({ success: false, error: 'File not found' });
        }
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
    console.log(`Gradesource directory: ${gradesourcePath}`);
}); 