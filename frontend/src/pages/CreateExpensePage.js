import React, { useState, useContext } from 'react';
import { AuthContext } from '../App';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Upload, 
  Receipt, 
  Camera, 
  DollarSign, 
  Calendar,
  ArrowLeft,
  Zap,
  FileText,
  Loader2
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const CreateExpensePage = () => {
  const { API } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    amount: '',
    currency: 'USD',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUsingOCR, setIsUsingOCR] = useState(false);
  const [ocrData, setOcrData] = useState(null);

  const categories = [
    { value: 'meals', label: 'Meals & Entertainment', color: 'bg-orange-100 text-orange-700' },
    { value: 'travel', label: 'Travel & Transportation', color: 'bg-blue-100 text-blue-700' },
    { value: 'office', label: 'Office Supplies', color: 'bg-purple-100 text-purple-700' },
    { value: 'general', label: 'General Expenses', color: 'bg-gray-100 text-gray-700' }
  ];

  const currencies = [
    { value: 'USD', label: 'USD ($)' },
    { value: 'EUR', label: 'EUR (€)' },
    { value: 'GBP', label: 'GBP (£)' },
    { value: 'INR', label: 'INR (₹)' },
    { value: 'CAD', label: 'CAD (C$)' }
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        setSelectedFile(file);
        toast.success('Receipt image selected');
      } else {
        toast.error('Please select an image file');
      }
    }
  };

  const handleOCRExtraction = async () => {
    if (!selectedFile) {
      toast.error('Please select a receipt image first');
      return;
    }

    setIsUsingOCR(true);
    const ocrFormData = new FormData();
    ocrFormData.append('receipt', selectedFile);

    try {
      const response = await axios.post(`${API}/expenses/with-receipt`, ocrFormData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.ocr_data && !response.data.ocr_data.error) {
        const extracted = response.data.ocr_data;
        setOcrData(extracted);
        
        // Auto-fill form with extracted data
        setFormData(prev => ({
          ...prev,
          amount: extracted.amount ? extracted.amount.toString() : prev.amount,
          category: extracted.category || prev.category,
          description: extracted.description || extracted.merchant_name || prev.description,
          date: extracted.date || prev.date
        }));

        toast.success('Receipt data extracted successfully! 🎉');
        
        // Navigate to expenses page after successful creation
        setTimeout(() => {
          navigate('/expenses');
        }, 2000);
      } else {
        toast.error('Failed to extract data from receipt');
      }
    } catch (error) {
      console.error('OCR extraction failed:', error);
      toast.error('Failed to process receipt. Please try again or enter details manually.');
    } finally {
      setIsUsingOCR(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.amount || !formData.category || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const expenseData = {
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        category: formData.category,
        description: formData.description,
        date: new Date(formData.date).toISOString()
      };

      await axios.post(`${API}/expenses`, expenseData);
      
      toast.success('Expense created successfully!');
      navigate('/expenses');
    } catch (error) {
      console.error('Failed to create expense:', error);
      toast.error('Failed to create expense. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6" data-testid="create-expense-page">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate('/expenses')}
          data-testid="back-to-expenses-button"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create New Expense</h1>
          <p className="text-gray-600 mt-2">
            Submit your expense with AI-powered receipt scanning or manual entry
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* OCR Section */}
        <Card className="glass-effect border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-indigo-600" />
              <span>AI Receipt Scanning</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-indigo-400 transition-colors duration-200">
              <div className="space-y-4">
                <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
                  <Camera className="h-8 w-8 text-indigo-600" />
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Upload Receipt Image
                  </h3>
                  <p className="text-gray-600 mb-4">
                    AI will automatically extract expense details from your receipt
                  </p>
                </div>

                <div className="space-y-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="receipt-upload"
                    data-testid="receipt-file-input"
                  />
                  <label htmlFor="receipt-upload">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full cursor-pointer"
                      asChild
                    >
                      <span>
                        <Upload className="h-4 w-4 mr-2" />
                        Choose Receipt Image
                      </span>
                    </Button>
                  </label>

                  {selectedFile && (
                    <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                      <div className="flex items-center justify-center space-x-2">
                        <FileText className="h-4 w-4" />
                        <span>{selectedFile.name}</span>
                      </div>
                    </div>
                  )}

                  <Button
                    type="button"
                    onClick={handleOCRExtraction}
                    disabled={!selectedFile || isUsingOCR}
                    className="w-full btn-hover bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
                    data-testid="extract-receipt-data-button"
                  >
                    {isUsingOCR ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing Receipt...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2" />
                        Extract & Create Expense
                      </>
                    )}
                  </Button>
                </div>

                {ocrData && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-left">
                    <h4 className="font-medium text-green-800 mb-2">Extracted Data:</h4>
                    <div className="text-sm text-green-700 space-y-1">
                      <div>Amount: ${ocrData.amount}</div>
                      <div>Category: {ocrData.category}</div>
                      <div>Description: {ocrData.description || ocrData.merchant_name}</div>
                      <div>Date: {ocrData.date}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Manual Entry Form */}
        <Card className="glass-effect border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Receipt className="h-5 w-5 text-gray-600" />
              <span>Manual Entry</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-sm font-medium">
                  Amount *
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => handleInputChange('amount', e.target.value)}
                    className="pl-10"
                    required
                    data-testid="amount-input"
                  />
                </div>
              </div>

              {/* Currency */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Currency</Label>
                <Select value={formData.currency} onValueChange={(value) => handleInputChange('currency', value)}>
                  <SelectTrigger data-testid="currency-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((currency) => (
                      <SelectItem key={currency.value} value={currency.value}>
                        {currency.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Category *</Label>
                <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                  <SelectTrigger data-testid="category-select">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date */}
              <div className="space-y-2">
                <Label htmlFor="date" className="text-sm font-medium">
                  Date *
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => handleInputChange('date', e.target.value)}
                    className="pl-10"
                    required
                    data-testid="date-input"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">
                  Description *
                </Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of the expense..."
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="min-h-[100px] resize-none"
                  required
                  data-testid="description-input"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/expenses')}
                  className="flex-1"
                  data-testid="cancel-button"
                >
                  Cancel
                </Button>
                
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 btn-hover bg-indigo-600 hover:bg-indigo-700 text-white"
                  data-testid="submit-expense-button"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Receipt className="h-4 w-4 mr-2" />
                      Create Expense
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Tips */}
      <Card className="glass-effect border-0 shadow-md bg-blue-50/50">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <FileText className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium text-blue-900 mb-2">Tips for better OCR results:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Use clear, well-lit photos of receipts</li>
                <li>• Ensure the receipt is flat and all text is visible</li>
                <li>• Supported formats: JPG, PNG, HEIC</li>
                <li>• You can always edit the extracted information before submitting</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateExpensePage;