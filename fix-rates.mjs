import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const db = client.db(process.env.MONGODB_DB);

await db.collection('pricing_settings').updateOne(
  { _id: 'default' },
  { $set: {
      'settings.local.shippingFee': 0,
      'settings.international.shippingFee': 0,
  } }
);

const doc = await db.collection('pricing_settings').findOne({ _id: 'default' });
console.log('local:', doc.settings.local);
console.log('international:', doc.settings.international);
await client.close();