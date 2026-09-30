// Seed data merged from the original dashboard.html and asset.html prototypes
// into a single unified asset schema used by the Firestore "assets" collection.
export const sampleAssets = [
  { name: 'Laptop', category: 'Electronics', quantity: 25, condition: 'Good', location: 'IT Department', supplier: 'TechWorld' },
  { name: 'Mouse', category: 'Accessories', quantity: 5, condition: 'Good', location: 'IT Department', supplier: 'GadgetPro' },
  { name: 'Desk Chair', category: 'Furniture', quantity: 12, condition: 'Good', location: 'Admin Office', supplier: 'OfficePlus' },
  { name: 'Notebook', category: 'Stationery', quantity: 50, condition: 'Excellent', location: 'Admin Office', supplier: 'PaperCo' },
  { name: 'Printer', category: 'Electronics', quantity: 3, condition: 'Fair', location: 'Operations', supplier: 'PrintMax' },
  { name: 'Mobile Phone', category: 'Electronics', quantity: 30, condition: 'Good', location: 'IT Department', supplier: 'TechWorld' },
  { name: 'Headset', category: 'Accessories', quantity: 45, condition: 'Excellent', location: 'Support Desk', supplier: 'GadgetPro' },
  { name: 'Desk Phone', category: 'Communication', quantity: 20, condition: 'Fair', location: 'Admin Office', supplier: 'OfficePlus' },
  { name: 'Tablet', category: 'Electronics', quantity: 10, condition: 'Good', location: 'Finance Office', supplier: 'TechWorld' },
  { name: 'Monitor', category: 'Electronics', quantity: 25, condition: 'Excellent', location: 'Operations', supplier: 'PrintMax' },
]

export const LOW_STOCK_THRESHOLD = 10
