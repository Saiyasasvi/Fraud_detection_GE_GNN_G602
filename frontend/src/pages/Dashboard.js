import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import CSVUpload from '../components/CSVUpload';
import ResultsTable from '../components/ResultsTable';
import FraudChart from '../components/FraudChart';
import { Button } from '../components/ui/button';
import { mockReviews, mockClassifyReviews } from '../mock/mockData';
import { toast } from '../hooks/use-toast';
import { TrendingUp, AlertCircle } from 'lucide-react';

const Dashboard = () => {
  const [uploadedReviews, setUploadedReviews] = useState([]);
  const [uploadedFile, setUploadedFile] = useState(null); // Store original file
  const [classifiedResults, setClassifiedResults] = useState([]);
  const [isClassifying, setIsClassifying] = useState(false);

  const handleUploadComplete = (reviews, originalFile) => {
    setUploadedReviews(reviews);
    setUploadedFile(originalFile); // Store the original file
    setClassifiedResults([]);
  };

  const handleClassify = async () => {
    if (uploadedReviews.length === 0) {
      toast({
        title: 'No reviews uploaded',
        description: 'Please upload a CSV file first',
        variant: 'destructive'
      });
      return;
    }

    setIsClassifying(true);
    toast({
      title: 'Classification started',
      description: 'GE-GNN model is analyzing reviews...'
    });

    try {
      const BACKEND_URL = 'https://ivylike-jestine-roentgenopaque.ngrok-free.dev';
      
      // Use the ORIGINAL uploaded file directly - don't regenerate CSV
      if (!uploadedFile) {
        throw new Error('Original file not found');
      }
      
      console.log('========== UPLOADING ORIGINAL FILE ==========');
      console.log('File name:', uploadedFile.name);
      console.log('File size:', uploadedFile.size);
      console.log('============================================');
      
      const formData = new FormData();
      formData.append('file', uploadedFile); // Upload original file

      // Send to Flask backend for classification
      const response = await fetch(`${BACKEND_URL}/api/classify`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to classify reviews');
      }

      const responseText = await response.text();
      console.log('========== RAW RESPONSE ==========');
      console.log(responseText);
      console.log('==================================');
      
      const data = JSON.parse(responseText);
      console.log('========== PARSED DATA ==========');
      console.log('Full data object:', JSON.stringify(data, null, 2));
      console.log('Data type:', typeof data);
      console.log('Is array:', Array.isArray(data));
      if (typeof data === 'object' && !Array.isArray(data)) {
        console.log('Object keys:', Object.keys(data));
      }
      console.log('==================================');
      
      // Handle different response formats - check all possible keys
      let predictions = [];
      if (Array.isArray(data)) {
        predictions = data;
      } else if (data.predictions && Array.isArray(data.predictions)) {
        predictions = data.predictions;
      } else if (data.results && Array.isArray(data.results)) {
        predictions = data.results;
      } else if (data.data && Array.isArray(data.data)) {
        predictions = data.data;
      } else if (data.output && Array.isArray(data.output)) {
        predictions = data.output;
      } else {
        console.error('Unexpected response format:', data);
        console.error('Available keys:', Object.keys(data));
        throw new Error('Invalid response format from backend');
      }
      
      console.log('========== EXTRACTED PREDICTIONS ==========');
      console.log('Predictions array:', predictions);
      console.log('Predictions length:', predictions.length);
      console.log('First 3 items:', predictions.slice(0, 3));
      console.log('==========================================');
      
      // Normalize predictions so frontend can always use `text` for review content
      const normalized = predictions.map(p => ({
        ...p,
        text: p.text || p.reviewText || ''
      }));

      // Use normalized predictions from Colab response
      setClassifiedResults(normalized);

      // Save results to database
      try {
        const LOCAL_BACKEND = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
        const saveResponse = await fetch(`${LOCAL_BACKEND}/api/classifications`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            predictions: predictions,
            username: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).username : 'Anonymous'
          })
        });

        if (saveResponse.ok) {
          console.log('Classification results saved to database');
        }
      } catch (saveError) {
        console.error('Failed to save to database:', saveError);
        // Don't show error to user - classification still succeeded
      }

      setIsClassifying(false);
      
      toast({
        title: 'Classification complete',
        description: `Successfully classified ${predictions.length} reviews`,
        variant: 'success'
      });
    } catch (error) {
      console.error('Classification error:', error);
      setIsClassifying(false);
      toast({
        title: 'Classification failed',
        description: error.message || 'An error occurred',
        variant: 'destructive'
      });
    }
  };

  const handleUseMockData = () => {
    setUploadedReviews(mockReviews);
    const results = mockClassifyReviews(mockReviews);
    setClassifiedResults(results);
    
    toast({
      title: 'Mock data loaded',
      description: 'Using sample reviews for demonstration',
      variant: 'info'
    });
  };

  const handleTestBackend = async () => {
    // Create a simple test CSV that should work with your model
    const testCSV = `_id,reviewerID,asin,reviewerName,helpful,reviewText,summary,unixReviewTime,reviewTime,category,overall,review_word_count
R001,U001,P001,User1,"[0,0]","This is a great product!","Great product",1640995200,"1/1/2022",Electronics,5,6
R002,U002,P001,User2,"[0,0]","Amazing quality and fast delivery","Amazing",1640995200,"1/1/2022",Electronics,5,5
R003,U003,P002,User3,"[0,0]","Not satisfied with the quality","Not good",1640995200,"1/1/2022",Electronics,2,5`;

    console.log('Test CSV:', testCSV);
    
    const blob = new Blob([testCSV], { type: 'text/csv' });
    const file = new File([blob], 'test.csv', { type: 'text/csv' });
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const BACKEND_URL = 'https://ivylike-jestine-roentgenopaque.ngrok-free.dev';
      const response = await fetch(`${BACKEND_URL}/api/classify`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to classify reviews');
      }

      const data = await response.json();
      console.log('Backend response:', data);
      
      toast({
        title: 'Test successful',
        description: 'Backend is working correctly!',
        variant: 'success'
      });
    } catch (error) {
      console.error('Test error:', error);
      toast({
        title: 'Test failed',
        description: error.message || 'An error occurred',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20"></div>
      
      <Navbar />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center space-x-3">
            <TrendingUp className="w-10 h-10 text-cyan-400" />
            <span>Fraud Detection Dashboard</span>
          </h1>
          <p className="text-slate-400">Upload reviews and detect fraudulent content using advanced AI</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <CSVUpload onUploadComplete={handleUploadComplete} />
          </div>
          
          <div className="space-y-4">
            <div className="bg-slate-900/50 border border-slate-800 backdrop-blur-sm rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Button
                  onClick={handleClassify}
                  disabled={uploadedReviews.length === 0 || isClassifying}
                  className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/30"
                >
                  {isClassifying ? 'Classifying...' : 'Classify Reviews'}
                </Button>
                
                <Button
                  onClick={handleUseMockData}
                  variant="outline"
                  className="w-full border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  Use Sample Data
                </Button>
                
                <Button
                  onClick={handleTestBackend}
                  variant="outline"
                  className="w-full border-blue-700 text-blue-300 hover:bg-blue-800 hover:text-white"
                >
                  Test Backend Connection
                </Button>
              </div>
            </div>

            {uploadedReviews.length > 0 && (
              <div className="bg-slate-900/50 border border-slate-800 backdrop-blur-sm rounded-lg p-6">
                <h3 className="text-sm font-medium text-slate-400 mb-3">Upload Status</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-300">Reviews Uploaded</span>
                    <span className="text-white font-bold">{uploadedReviews.length}</span>
                  </div>
                  {classifiedResults.length > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-300">Classified</span>
                      <span className="text-green-400 font-bold">{classifiedResults.length}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {classifiedResults.length > 0 && (
          <div className="space-y-6">
            <FraudChart results={classifiedResults} />
            
            <ResultsTable results={classifiedResults} />
          </div>
        )}

        {classifiedResults.length === 0 && uploadedReviews.length === 0 && (
          <div className="bg-slate-900/30 border-2 border-dashed border-slate-800 rounded-lg p-12 text-center">
            <AlertCircle className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-400 mb-2">No Data Available</h3>
            <p className="text-slate-500">Upload a CSV file or use sample data to get started</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
