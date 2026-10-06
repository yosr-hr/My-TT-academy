import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("Veuillez définir la variable MONGODB_URI dans le fichier .env.local");
}

/* Global est utilisé ici pour maintenir une connexion mise en cache 
  à travers les rechargements à chaud (Hot Reloading) en développement.
*/
let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongooseInstance) => {
      console.log("Connexion réussie à MongoDB (ges_form_bd) !");
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error("Erreur de connexion à MongoDB :", e);
    throw e;
  }

  return cached.conn;
}

export default connectDB;