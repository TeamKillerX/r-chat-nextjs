import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/test'

if (!MONGODB_URI) {
  throw new Error('Please gey define MONGODB_URI')
}

export async function connectMongo() {
  if (mongoose.connections[0].readyState) return
  await mongoose.connect(MONGODB_URI)
}
