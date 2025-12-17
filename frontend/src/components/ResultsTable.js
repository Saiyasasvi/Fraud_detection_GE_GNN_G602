import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Download, Search, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Input } from './ui/input';

const ResultsTable = ({ results }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLabel, setFilterLabel] = useState('all');

  const filteredResults = results.filter((result) => {
    const reviewerId = result.reviewerId || result.reviewerID || result.reviewer_id || '';
    const reviewerName = result.reviewerName || result.reviewer_name || result.name || '';
    const matchesSearch = reviewerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         reviewerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterLabel === 'all' || result.label === filterLabel;
    return matchesSearch && matchesFilter;
  });

  const downloadCSV = () => {
    const headers = ['Reviewer ID', 'Reviewer Name', 'Predicted Label', 'Confidence Score'];
    const csvContent = [
      headers.join(','),
      ...results.map(r => [
        r.reviewerId || r.reviewerID || '',
        r.reviewerName || '',
        r.label || '',
        (r.confidence || 0).toFixed(4)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fraud-detection-results-${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-white flex items-center space-x-2">
              <span>Classification Results</span>
            </CardTitle>
            <CardDescription className="text-slate-400">
              {filteredResults.length} of {results.length} reviews
            </CardDescription>
          </div>
          <Button
            onClick={downloadCSV}
            size="sm"
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Search by Reviewer ID or Name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilterLabel('all')}
                className={`border-slate-700 transition-all ${
                  filterLabel === 'all'
                    ? 'bg-slate-700 text-white'
                    : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilterLabel('Fraud')}
                className={`border-slate-700 transition-all ${
                  filterLabel === 'Fraud'
                    ? 'bg-red-950/50 text-red-400 border-red-900'
                    : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                Fraud
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilterLabel('Benign')}
                className={`border-slate-700 transition-all ${
                  filterLabel === 'Benign'
                    ? 'bg-green-950/50 text-green-400 border-green-900'
                    : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                Benign
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 overflow-hidden">
            <div className="max-h-[500px] overflow-auto">
              <Table>
                <TableHeader className="bg-slate-800/50 sticky top-0">
                  <TableRow className="hover:bg-slate-800/50">
                    <TableHead className="text-slate-300 font-semibold">Reviewer ID</TableHead>
                    <TableHead className="text-slate-300 font-semibold">Reviewer Name</TableHead>
                    <TableHead className="text-slate-300 font-semibold">Review Text</TableHead>
                    <TableHead className="text-slate-300 font-semibold text-center">Label</TableHead>
                    <TableHead className="text-slate-300 font-semibold text-center">Confidence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResults.length > 0 ? (
                    filteredResults.map((result, index) => (
                      <TableRow
                        key={index}
                        className="border-slate-800 hover:bg-slate-800/30 transition-colors"
                      >
                        <TableCell className="font-mono text-sm text-slate-400">
                          {result.reviewerId}
                        </TableCell>
                        <TableCell className="text-slate-300">
                          {result.reviewerName}
                        </TableCell>
                        <TableCell
                          className="text-slate-300 max-w-md truncate"
                          title={result.text || result.reviewText || ''}
                        >
                          {result.text || result.reviewText || ''}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={`${
                              result.label === 'Fraud'
                                ? 'bg-red-950/30 text-red-400 border-red-900'
                                : 'bg-green-950/30 text-green-400 border-green-900'
                            } font-semibold`}
                          >
                            {result.label === 'Fraud' ? (
                              <AlertTriangle className="w-3 h-3 mr-1" />
                            ) : (
                              <ShieldCheck className="w-3 h-3 mr-1" />
                            )}
                            {result.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-mono text-sm">
                          <span
                            className={`${
                              (result.confidence || 0) > 0.9
                                ? 'text-cyan-400'
                                : (result.confidence || 0) > 0.8
                                ? 'text-blue-400'
                                : 'text-slate-400'
                            } font-semibold`}
                          >
                            {((result.confidence || 0) * 100).toFixed(1)}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                        No results found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ResultsTable;
