import { NextRequest, NextResponse } from 'next/server';

// Admin API endpoints for admin panel
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function getShipmentsCollection(): Promise<any> {
  await client.connect();
  const db = client.db('exodus_logistics');
  return db.collection('shipments');
}

async function getUsersCollection(): Promise<any> {
  await client.connect();
  const db = client.db('exodus_logistics');
  return db.collection('users');
}

async function getActivityLogsCollection(): Promise<any> {
  await client.connect();
  const db = client.db('exodus_logistics');
  return db.collection('activity_logs');
}

// Sample admin configuration
const sampleAdminUsers = [
  {
    id: 'usr_1',
    name: 'Admin User',
    email: 'admin@exoduslogistics.com',
    role: 'admin',
    phone: '+1 (555) 123-4567',
    createdAt: new Date('2024-02-11'),
    lastActive: new Date('2024-02-15')
  },
  {
    id: 'usr_2',
    name: 'Staff User',
    email: 'staff@exoduslogistics.com',
    role: 'staff',
    phone: '+1 (555) 987-6543',
    createdAt: new Date('2024-03-01')
  }
];

// Sample shipments for admin panel
const sampleShipments = [
  {
    id: 'shp_1',
    trackingCode: 'EX-2024-US-1234567',
    origin: { city: 'Los Angeles', state: 'CA', zipCode: '90001', country: 'USA' },
    destination: { city: 'New York', state: 'NY', zipCode: '10001', country: 'USA' },
    recipient: { name: 'John Anderson', email: 'john.anderson@email.com', phone: '+1 (555) 987-6543' },
    sender: { name: 'TechCorp Solutions', email: 'shipping@techcorp.com', phone: '+1 (555) 123-4567' },
    estimatedDelivery: new Date('2024-02-14'),
    actualDelivery: null,
    createdAt: new Date('2024-02-11'),
    updatedAt: new Date('2024-02-11')
  },
    carrier: 'fedex',
    carrierTrackingId: 'FDX123456789',
    status: 'delivered',
    package: {
      weight: 25.5,
      dimensions: { length: 24, width: 18, height: 12 },
      description: 'Electronics equipment',
      value: 1500,
      currency: 'USD'
    },
    createdAt: new Date('2024-02-11'),
    updatedAt: new Date('2024-02-11')
  },
    createdAt: new Date('2024-02-11')
  }
  },
    createdAt: new Date('2024-02-11')
  },
    createdAt: new Date('2024-02-11')
  },
    updatedAt: new Date('2024-02-11')
  },
    updatedAt: new Date('2024-02-11')
  }
  }
];

export async function POST(request: NextRequest) {
  const { action } = await request.json();
  
  if (action === 'seed-shipments') {
    const shipmentsCollection = await getShipmentsCollection();
    await shipmentsCollection.deleteMany({});
    await shipmentsCollection.insertMany(sampleShipments);
    
    // Insert tracking history
    const historyCollection = await getTrackingHistoryCollection();
    const sampleHistory = [
      {
        shipmentId: 'shp_1',
        status: 'picked_up',
        location: 'Los Angeles, CA',
        description: 'Package picked up from sender',
        timestamp: new Date('2024-02-11T14:00:00Z')
      },
      {
        shipmentId: 'shp_1',
        status: 'in_transit',
        location: 'Phoenix, AZ',
        description: 'Package in transit',
        timestamp: new Date('2024-02-11T18:30:00Z')
      },
      },
      {
        shipmentId: 'shp_1',
        status: 'in_transit',
        location: 'Chicago, IL',
        description: 'Package arrived at sorting facility',
        timestamp: new Date('2024-02-12T06:15Z')
      }
  ];

  await historyCollection.insertMany(sampleHistory);
    
    return NextResponse.json({
      success: true,
      message: 'Shipments and tracking history seeded successfully',
      shipmentsInserted: sampleShipments.length,
      historyInserted: sampleTrackingHistory.length
    });
  } else {
    return NextResponse.json({
      success: false,
      error: 'Invalid action'
    });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Admin panel API endpoint',
    method: 'GET',
    requiredFields: ['action']
  });
}

export async function GET() {
  try {
    const usersCollection = await getUsersCollection();
    const users = await usersCollection.find({}).toArray();
    
    return NextResponse.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Users API Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: 'Unable to fetch users.',
      status: 500
    });
  }
};

export async function POST(request: NextRequest) {
  const { username, password, ...updates } = await request.json();
  const usersCollection = await getUsersCollection();
  
  const user = await usersCollection.findOne({ username });
  
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not found',
        message: 'User not found with given username.'
      });
    } else {
      // Update user
      await usersCollection.updateOne(
        { $set: updates }
      );
      
      const updatedUser = await usersCollection.findOne({ username });
      
      return NextResponse.json({
        success: true,
        message: 'User updated successfully',
        data: updatedUser
      });
    }
    
    return NextResponse.json({
      success: true,
      message: 'User created successfully',
        data: updatedUser
      });
    } catch (error) {
      console.error('Users Update Error:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to update user.',
        message: 'Update failed.'
      });
    } finally {
      await client.close();
    }
  },
  
    ```
  } catch (error) {
      console.error('Users Update Error:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to update user.'
      });
    }
  }
}