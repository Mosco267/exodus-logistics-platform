import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // DISABLED IN PRODUCTION - Only allow data seeding in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { 
        error: 'Seeding disabled in production',
        message: 'Data seeding is only available in development environment. Please use the admin panel to create shipments.'
      },
      { status: 403 }
    );
  }

  try {
    const { action } = await request.json();
    
    return NextResponse.json(
      { 
        error: 'Seeding disabled',
        message: 'Sample data seeding has been removed. Please create real shipments through the admin panel.'
      },
      { status: 403 }
    );
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Unable to process request.'
      },
      { status: 500 }
    );
  }
}