import React, { useState, useRef } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Upload, FileText, X, CheckCircle } from 'lucide-react';
import { toast } from '../hooks/use-toast';

const CSVUpload = ({ onUploadComplete }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  // Helper function to parse CSV line with proper quote handling
  const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    // Add the last field
    result.push(current.trim());
    return result;
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile);
        toast({
          title: 'File selected',
          description: `${selectedFile.name} (${(selectedFile.size / 1024).toFixed(2)} KB)`
        });
      } else {
        toast({
          title: 'Invalid file type',
          description: 'Please select a CSV file',
          variant: 'destructive'
        });
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: 'No file selected',
        description: 'Please select a CSV file first',
        variant: 'destructive'
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      // Read and parse CSV file locally
      const reader = new FileReader();
      reader.onload = (e) => {
        const csvText = e.target.result;
        const lines = csvText.split('\n');
        
        const reviews = [];
        for (let i = 1; i < lines.length; i++) {
          if (lines[i].trim()) {
            // Parse CSV line properly (handle quoted fields)
            const values = parseCSVLine(lines[i]);
            if (values.length >= 2) {
              reviews.push({
                id: values[0] || `R${String(i).padStart(3, '0')}`,
                text: values[5] || values[1] || '', // reviewText or fallback to second column
                timestamp: values[8] || new Date().toISOString() // reviewTime
              });
            }
          }
        }

        // Check for minimum row requirement
        if (reviews.length < 100) {
          clearInterval(progressInterval);
          setUploading(false);
          setUploadProgress(0);
          handleRemoveFile();
          toast({
            title: 'Insufficient Data',
            description: `The uploaded file contains only ${reviews.length} rows. Please upload a file with at least 100 rows of data for accurate analysis.`,
            variant: 'destructive'
          });
          return;
        }

        clearInterval(progressInterval);
        setUploadProgress(100);

        setTimeout(() => {
          setUploading(false);
          setUploadProgress(0);
          toast({
            title: 'Upload successful',
            description: `Successfully parsed ${reviews.length} reviews from CSV`,
            variant: 'success'
          });
          onUploadComplete(reviews, file);
        }, 500);
      };

      reader.readAsText(file);
    } catch (error) {
      setUploading(false);
      setUploadProgress(0);
      toast({
        title: 'Upload failed',
        description: error.message || 'An error occurred',
        variant: 'destructive'
      });
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white flex items-center space-x-2">
          <Upload className="w-5 h-5 text-cyan-400" />
          <span>Upload Reviews</span>
        </CardTitle>
        <CardDescription className="text-slate-400">
          Upload a CSV file containing reviews for fraud detection
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border-2 border-dashed border-slate-700 rounded-lg p-8 text-center hover:border-cyan-500 transition-all duration-300 bg-slate-800/30">
          {!file ? (
            <div className="space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center">
                <FileText className="w-8 h-8 text-slate-400" />
              </div>
              <div>
                <p className="text-slate-300 mb-2">Drop your CSV file here, or click to browse</p>
                <p className="text-xs text-slate-500">Supported format: .csv (max 10MB)</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload">
                <Button
                  type="button"
                  variant="outline"
                  className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Select File
                </Button>
              </label>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-white">{file.name}</p>
                    <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(2)} KB</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveFile}
                  className="text-slate-400 hover:text-red-400 hover:bg-red-950/30"
                  disabled={uploading}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {uploading && (
                <div className="space-y-2">
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300 ease-out"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-slate-400 text-center">{uploadProgress}% uploaded</p>
                </div>
              )}

              {uploadProgress === 100 && !uploading && (
                <div className="flex items-center justify-center space-x-2 text-green-400">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">Upload complete</span>
                </div>
              )}
            </div>
          )}
        </div>

        {file && uploadProgress === 0 && (
          <Button
            onClick={handleUpload}
            className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/30"
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : 'Upload & Classify'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default CSVUpload;
