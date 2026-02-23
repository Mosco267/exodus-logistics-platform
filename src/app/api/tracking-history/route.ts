import { NextRequest, NextResponse } from 'next/server';

// TEMPORARY: Test API without MongoDB for debugging
export async function POST(request: NextRequest) {
  try {
    const { shipmentId } = await request.json();

    if (!shipmentId) {
      return NextResponse.json(
        { error: 'Shipment ID is required' },
        { status: 400 }
      );
    }

    // TEMPORARY: Return mock timeline for testing
    if (shipmentId === 'EX-2024-US-1234567') {
      return NextResponse.json({
        success: true,
        data: [
          {
            date: 'Feb 12, 2024',
            time: '2:30 PM',
            location: 'Chicago, IL',
            status: 'In Transit',
            description: 'Package arrived at sorting facility'
          },
          {
            date: 'Feb 12, 2024',
            time: '10:15 AM',
            location: 'Denver, CO',
            status: 'In Transit',
            description: 'Package departed from facility'
          },
          {
            date: 'Feb 11, 2024',
            time: '6:45 PM',
            location: 'Denver, CO',
            status: 'Arrived',
            description: 'Package received at facility'
          },
          {
            date: 'Feb 11, 2024',
            time: '2:00 PM',
            location: 'Los Angeles, CA',
            status: 'Picked Up',
            description: 'Package picked up from sender'
          }
        ]
      });
    }

    return NextResponse.json({
      success: true,
      data: []
    });

  } catch (error) {
    console.error('Tracking History API Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Unable to fetch tracking history. Please try again later.'
      },
      { status: 500 }
    );
  }
}