import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const db = client.db(process.env.MONGODB_DB);
const col = db.collection('pricing_settings');

// What's actually in there, and under what _id
const before = await col.find({}).toArray();
console.log('--- DOCS FOUND:', before.length);
before.forEach(d => console.log('_id:', JSON.stringify(d._id)));
console.log('--- local BEFORE:', before[0]?.settings?.local);

// Match any doc rather than assuming _id === 'default'
const res = await col.updateOne(
  {},
  { $set: {
      'settings.local.shippingFee': 0,
      'settings.international.shippingFee': 0,
  } }
);
console.log('--- matched:', res.matchedCount, 'modified:', res.modifiedCount);

const after = await col.findOne({});
console.log('--- local AFTER:', after?.settings?.local);
console.log('--- international AFTER:', after?.settings?.international);

await client.close();