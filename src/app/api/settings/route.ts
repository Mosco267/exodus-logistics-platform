import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, Db, Collection } from 'mongodb';

// MongoDB connection
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function getSettingsCollection(): Promise<Collection> {
  await client.connect();
  const db = client.db('exodus_logistics');
  return db.collection('settings');
}

async function getPricingCollection(): Promise<Collection> {
  await client.connect();
  const db = client.db('exodus_logistics');
  return db.collection('pricing');
}

// Default settings if none configured
const defaultSettings = {
  taxRate: 8.5,
  discountRate: 0,
  insuranceRate: 10,
  customsRate: 20,
  fuelSurchargeRate: 12,
  currency: 'USD',
  companyName: 'Exodus Logistics',
  supportEmail: 'support@exoduslogistics.com',
  supportPhone: '+1 (555) 123-4567'
};

export async function GET() {
  try {
    const settingsCollection = await getSettingsCollection();
    const settings = await settingsCollection.findOne({});
    
    if (!settings) {
      // Initialize default settings if none exist
      await settingsCollection.insertOne(defaultSettings);
      return NextResponse.json({
        success: true,
        data: defaultSettings,
        message: 'Default settings initialized'
      });
    }

    return NextResponse.json({
      success: true,
      data: settings
    });

  } catch (error) {
    console.error('Settings API Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Unable to fetch settings.'
      },
      { status: 500 }
    );
  } finally {
    await client.close();
  }
}

export async function PUT(request: NextRequest) {
  try {
    const updates = await request.json();
    const settingsCollection = await getSettingsCollection();
    
    await settingsCollection.updateOne({}, { $set: updates });

    const updatedSettings = await settingsCollection.findOne({});
    
    return NextResponse.json({
      success: true,
      data: updatedSettings,
      message: 'Settings updated successfully'
    });

  } catch (error) {
    console.error('Settings Update Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Unable to update settings.'
      },
      { status: 500 }
    );
  } finally {
    await client.close();
  }
}