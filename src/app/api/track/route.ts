// File: app/api/track/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { trackingNumber } = await req.json();

  // Mock tracking data
  const mockData = {
    trackingNumber,
    steps: [
      { name: 'Warehouse', details: ['Shipment received at LA Warehouse - 08:00 AM'] },
      { name: 'Picked Up', details: ['Picked up from sender - 10:30 AM'] },
      {
        name: 'In Transit',
        details: [
          'Los Angeles, CA - 02:00 PM',
          'Denver, CO - 08:00 AM next day',
          'Chicago, IL - 05:00 PM next day'
        ]
      },
      { name: 'Out for Delivery', details: ['New York, NY - 08:00 AM'] },
      { name: 'Delivered', details: ['Delivered to recipient - 01:30 PM'] }
    ],
    currentStep: 2, // In Transit
    estimatedDelivery: '2026-02-15'
  };

  return NextResponse.json(mockData);
}