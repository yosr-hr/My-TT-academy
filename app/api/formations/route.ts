import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Formation from "@/models/Formation";
export async function POST(req: Request) {
  await connectDB();
  const formation = await Formation.create(await req.json());
  return NextResponse.json(formation, { status: 201 });
}
export async function GET(req: Request) {
    try {
    await connectDB();
  const formations = await Formation.find();
  return NextResponse.json(formations);
    } catch (error) {
    return NextResponse.json(
      { message: "formation n'est pas trouvée" },
      { status: 500 }
    );
  }
}