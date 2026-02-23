export { NextRequest, NextResponse } from 'next/server';

// MongoDB connection
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function getShipmentsCollection(): Promise<Collection> {
  await client.connect();
  const db = client.db('exodus_logistics');
  return db.collection('shipments');
}

async function getTrackingHistoryCollection(): Promise<Collection> {
  await client.connect();
  const db = client.db('exodus_logistics');
  return db.collection('tracking_history');
}

export async function POST(request: NextRequest) {
  try {
    const { shipmentId } = await request.json();
    
    if (!shipmentId) {
      return NextResponse.json({
        error: 'Shipment ID is required'
      }, { status: 400 });
    }

    const historyCollection = await getTrackingHistoryCollection();
    
    const history = await historyCollection.find({ shipmentId }).toArray();
    
    return NextResponse.json({
      success: true,
      data: history
    });

  } catch (error) {
    console.error('Admin API Error:', error);
    return NextResponse.json(
      error: 'Internal server error',
      message: 'Unable to fetch tracking history. Please try again.'
    );
  } finally {
    await client.close();
  }
}