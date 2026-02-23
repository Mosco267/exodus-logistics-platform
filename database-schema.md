# Exodus Logistics Database Schema

## Database Collections

### 1. Collections
- **users** - User accounts and roles
- **shipments** - Shipment data
- **tracking_history** - Timeline events
- **invoices** - Invoice data
- **settings** - Configuration
- **pricing** - Tax and rates

### 2. Relationships
- **Users ↔ Shipments (one-to-many)
- **Shipments ↔ Tracking History** (one-to-many)
- **Shipments ↔ Users** (one-to-many)
- **Shipments ↔ Tracking History** (one-to-many)
- **Shipments ↔ Users** (one-to-many)

### 3. Schema Structure

#### Users Collection
```javascript
{
  _id: ObjectId,
  name: string,
  email: string,
  phone: string,
  company: string,
  role: 'admin' | 'customer' | 'staff',
  password: string,
  createdAt: Date,
  updatedAt: Date
}
```

#### Shipments Collection
```javascript
{
  _id: ObjectId,
  trackingCode: string,
  status: 'pending' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'cancelled',
  origin: Object,
  destination: Object,
  recipient: Object,
  sender: Object,
  package: Object,
  carrier: string,
  carrierTrackingId: string,
  estimatedDelivery: Date,
  actualDelivery: Date | null,
  createdAt: Date,
  updatedAt: Date,
  rate: number,
  dimensions: Object,
  serviceType: 'economy' | 'standard' | 'express' | 'overnight',
  weight: number,
  packageType: 'standard' | 'express' | 'overnight' | 'international'
  packageType: 'parcel' | 'document' | 'fragile' | 'oversized' | 'hazardous'
  };

#### Tracking History Collection
```javascript
{
  shipmentId: ObjectId (ref) - ObjectId
  status: string,
  location: string,
  description: string,
  timestamp: Date
};

#### Invoices Collection
```javascript
{
  _id: ObjectId,
  invoiceNumber: string,
  customer: Object,
  dueDate: Date,
  createdDate: Date,
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'overdue'
  subtotal: number,
  tax: number,
  discount: number,
  insurance: number,
  fuel: number,
  total: number
  currency: string,
  dueDate: Date,
  validUntil: Date
};

#### Settings Collection
```javascript
{
  companyName: string,
  address: Object
  phone: string,
  email: string
  website: string,
  taxId: string,
  logo: string,
  supportEmail: string,
  services: [],
  rates: Object,
  settings: {
    taxRate: number,
    discountRate: number,
    insuranceRate: number,
    customsRate: number,
    fuelSurchargeRate: number,
    currency: string
  }
};

#### Pricing Collection
```javascript
{
  serviceType: string,
  baseRate: number,
  perMileRate: number,
  perPoundRate: number,
  freight: number,
  overSized: number,
  overweightCharge: number,
  nextDaySurcharge: number,
  twoDaySurcharge: number
  threeDaySurcharge: number,
    weekEndSurcharge: number,
    storageCost: number,
    perPoundRate: number,
    perCubicFootRate: number
  },
    hazardousCharge: number
  };
```