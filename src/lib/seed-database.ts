// Database seeding script
// Run this to populate your MongoDB database with sample data

const seedDatabase = async () => {
  try {
    const response = await fetch('/api/seed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'seed' }),
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Database seeded successfully!');
      console.log(`📦 Inserted ${result.shipmentsInserted} sample shipments`);
      console.log(`📋 Inserted ${result.historyInserted} tracking history entries`);
      console.log('\n🎯 You can now test tracking with these codes:');
      console.log('   • EX-2024-US-1234567');
      console.log('   • EX-2024-CA-7654321');
    } else {
      console.error('❌ Failed to seed database:', result.error);
    }
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  }
};

// Auto-execute when run in Node.js environment
if (typeof window === 'undefined') {
  seedDatabase();
}

// Export for manual use
export { seedDatabase };