// Mock credentials for JWT authentication
export const mockCredentials = [
  { username: 'admin', password: 'admin123', name: 'Admin User', role: 'admin' },
  { username: 'user', password: 'password', name: 'Regular User', role: 'user' },
  { username: 'analyst', password: 'analyst123', name: 'Fraud Analyst', role: 'analyst' }
];

// Mock JWT token generation
export const generateMockToken = (username) => {
  return `mock_jwt_${username}_${Date.now()}`;
};

// Mock review data
export const mockReviews = [
  {
    id: 'R001',
    text: 'Excellent product! Highly recommend to everyone.',
    label: 'Benign',
    confidence: 0.95,
    timestamp: '2025-01-15 10:30:00',
    userId: 'U123'
  },
  {
    id: 'R002',
    text: 'This is the best thing ever! Buy now! Limited offer! Click here!',
    label: 'Fraud',
    confidence: 0.89,
    timestamp: '2025-01-15 11:20:00',
    userId: 'U456'
  },
  {
    id: 'R003',
    text: 'Good quality for the price. Would buy again.',
    label: 'Benign',
    confidence: 0.92,
    timestamp: '2025-01-15 12:45:00',
    userId: 'U789'
  },
  {
    id: 'R004',
    text: 'AMAZING!!! BEST PRODUCT EVER!!! 5 STARS!!! BUY NOW!!!',
    label: 'Fraud',
    confidence: 0.97,
    timestamp: '2025-01-15 13:10:00',
    userId: 'U456'
  },
  {
    id: 'R005',
    text: 'The product works as described. Delivery was fast.',
    label: 'Benign',
    confidence: 0.88,
    timestamp: '2025-01-15 14:00:00',
    userId: 'U234'
  },
  {
    id: 'R006',
    text: 'Perfect! Get it now! Free shipping! Amazing deal!',
    label: 'Fraud',
    confidence: 0.91,
    timestamp: '2025-01-15 15:30:00',
    userId: 'U567'
  },
  {
    id: 'R007',
    text: 'Satisfied with the purchase. Quality is decent.',
    label: 'Benign',
    confidence: 0.85,
    timestamp: '2025-01-15 16:20:00',
    userId: 'U890'
  },
  {
    id: 'R008',
    text: 'WOW WOW WOW! INCREDIBLE! MUST BUY!',
    label: 'Fraud',
    confidence: 0.93,
    timestamp: '2025-01-15 17:00:00',
    userId: 'U456'
  }
];

// Mock network graph data (review relationships)
export const mockNetworkData = {
  nodes: [
    { id: 'R001', label: 'Benign', confidence: 0.95, group: 'benign' },
    { id: 'R002', label: 'Fraud', confidence: 0.89, group: 'fraud' },
    { id: 'R003', label: 'Benign', confidence: 0.92, group: 'benign' },
    { id: 'R004', label: 'Fraud', confidence: 0.97, group: 'fraud' },
    { id: 'R005', label: 'Benign', confidence: 0.88, group: 'benign' },
    { id: 'R006', label: 'Fraud', confidence: 0.91, group: 'fraud' },
    { id: 'R007', label: 'Benign', confidence: 0.85, group: 'benign' },
    { id: 'R008', label: 'Fraud', confidence: 0.93, group: 'fraud' },
    { id: 'U123', label: 'User', group: 'user' },
    { id: 'U456', label: 'User', group: 'user' },
    { id: 'U789', label: 'User', group: 'user' },
    { id: 'U234', label: 'User', group: 'user' },
    { id: 'U567', label: 'User', group: 'user' },
    { id: 'U890', label: 'User', group: 'user' }
  ],
  edges: [
    { source: 'U123', target: 'R001', relationship: 'posted' },
    { source: 'U456', target: 'R002', relationship: 'posted' },
    { source: 'U789', target: 'R003', relationship: 'posted' },
    { source: 'U456', target: 'R004', relationship: 'posted' },
    { source: 'U234', target: 'R005', relationship: 'posted' },
    { source: 'U567', target: 'R006', relationship: 'posted' },
    { source: 'U890', target: 'R007', relationship: 'posted' },
    { source: 'U456', target: 'R008', relationship: 'posted' },
    { source: 'R002', target: 'R004', relationship: 'similar' },
    { source: 'R004', target: 'R008', relationship: 'similar' },
    { source: 'R002', target: 'R006', relationship: 'similar' },
    { source: 'R001', target: 'R003', relationship: 'similar' },
    { source: 'R003', target: 'R005', relationship: 'similar' }
  ]
};

// Mock classification function
export const mockClassifyReviews = (reviews) => {
  return reviews.map((review, index) => {
    const fraudKeywords = ['amazing', 'best', 'buy now', 'limited', 'click here', 'free', 'wow', 'incredible', 'must buy', '!!!'];
    const text = review.text.toLowerCase();
    const hasFraudKeywords = fraudKeywords.some(keyword => text.includes(keyword.toLowerCase()));
    const exclamationCount = (review.text.match(/!/g) || []).length;
    
    const isFraud = hasFraudKeywords || exclamationCount > 2;
    const confidence = isFraud 
      ? 0.85 + Math.random() * 0.12 
      : 0.80 + Math.random() * 0.15;
    
    return {
      id: review.id || `R${String(index + 1).padStart(3, '0')}`,
      text: review.text,
      label: isFraud ? 'Fraud' : 'Benign',
      confidence: Math.min(0.99, confidence),
      timestamp: review.timestamp || new Date().toISOString(),

      // ADD THESE FIELDS for the table:
      reviewerId: review.userId || review.reviewerId || review.reviewerID || review.reviewer_id || '',
      reviewerName: review.reviewerName || review.reviewer_name || `User ${review.userId || index + 1}`,
    };
  });
};