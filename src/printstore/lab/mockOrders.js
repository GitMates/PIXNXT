import { MOCK_PRODUCTS, MOCK_FRAMES, MOCK_SIZES, MOCK_PAPERS } from '../data/mockStoreData';

// Helper to get random items
const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Generate random realistic orders
export const generateMockOrders = (count = 10) => {
  const statuses = ['Pending', 'Printing', 'Framing', 'Quality Check', 'Ready to Ship', 'Shipped'];
  const customers = [
    { name: 'Sarah Jenkins', email: 'sarah.j@example.com' },
    { name: 'Michael Chen', email: 'mchen@example.com' },
    { name: 'Emma Watson', email: 'emma.w@example.com' },
    { name: 'David Miller', email: 'davidm@example.com' },
    { name: 'Jessica Parker', email: 'jparker@example.com' },
    { name: 'Robert Taylor', email: 'rtaylor@example.com' }
  ];

  const orders = [];
  
  for (let i = 0; i < count; i++) {
    const customer = getRandom(customers);
    const numItems = Math.floor(Math.random() * 3) + 1; // 1 to 3 items
    const items = [];
    let totalAmount = 0;

    for (let j = 0; j < numItems; j++) {
      const product = getRandom(MOCK_PRODUCTS);
      const size = getRandom(MOCK_SIZES);
      const paper = getRandom(MOCK_PAPERS);
      const isFramed = product.id === 'frames' || product.id === 'matted_frame' || product.id === 'float_frames';
      const frame = isFramed ? getRandom(MOCK_FRAMES.filter(f => f.id !== 'no_frame')) : MOCK_FRAMES.find(f => f.id === 'no_frame');
      const quantity = Math.floor(Math.random() * 2) + 1;
      
      const unitPrice = product.basePrice + size.priceModifier + paper.priceModifier + (frame ? frame.priceModifier : 0);
      totalAmount += unitPrice * quantity;

      items.push({
        id: `item_${Date.now()}_${j}`,
        productId: product.id,
        productName: product.name,
        photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=800&h=1200', // Mock photo
        size: size,
        paper: paper,
        frame: frame,
        quantity: quantity,
        unitPrice: unitPrice
      });
    }

    const orderDate = new Date();
    orderDate.setDate(orderDate.getDate() - Math.floor(Math.random() * 7)); // Within last 7 days

    orders.push({
      id: `ORD-${10000 + i}`,
      customer: customer,
      date: orderDate.toISOString(),
      status: getRandom(statuses),
      items: items,
      totalAmount: totalAmount,
      shippingAddress: '123 Photography Lane, Studio City, CA 91604'
    });
  }

  // Sort by date descending
  return orders.sort((a, b) => new Date(b.date) - new Date(a.date));
};

export const MOCK_ORDERS = generateMockOrders(15);
