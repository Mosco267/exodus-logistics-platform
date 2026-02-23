import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, Db, Collection } from 'mongodb';

// MongoDB connection
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function getPricingCollection(): Promise<Collection> {
  await client.connect();
  const db = client.db('exodus_logistics');
  return db.collection('pricing');
}

export async function GET() {
  try {
    const pricingCollection = await getPricingCollection();
    const pricing = await pricingCollection.find({}).toArray();
    
    if (pricing.length === 0) {
      // Initialize default pricing if none exist
      const defaultPricing = [
        { serviceType: 'economy', baseRate: 5.00, perMileRate: 0.50, perPoundRate: 0.25 },
        { serviceType: 'standard', baseRate: 8.00, perMileRate: 0.75, perPoundRate: 0.40 },
        { serviceType: 'express', baseRate: 15.00, perMileRate: 1.25, perPoundRate: 0.75 },
        { serviceType: 'overnight', baseRate: 25.00, perMileRate: 2.00, perPoundRate: 1.25 }
      ];
      
      await pricingCollection.insertMany(defaultPricing);
      return NextResponse.json({
        success: true,
        data: defaultPricing,
        message: 'Default pricing initialized'
      });
    }

    return NextResponse.json({
      success: true,
      data: pricing
    });

  } catch (error) {
    console.error('Pricing API Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Unable to fetch pricing.'
      },
      { status: 500 }
    );
  } finally {
    await client.close();
  }
}

export async function POST(request: NextRequest) {
  try {
    const updates = await request.json();
    const pricingCollection = await getPricingCollection();
    
    if (updates.newPricing) {
      await pricingCollection.insertMany(updates.newPricing);
    }
    
    if (updates.existingPricing) {
      for (const item of updates.existingPricing) {
        await pricingCollection.updateOne(
          { serviceType: item.serviceType },
          { $set: item }
        );
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Pricing updated successfully'
    });

  } catch (error) {
    console.error('Pricing Update Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Unable to update pricing.'
      },
      { status: 500 }
    );
  } finally {
    await client.close();
  }
}