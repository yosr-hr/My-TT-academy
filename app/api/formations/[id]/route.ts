import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Formation from "@/models/Formation";

// Handle PUT requests to update a specific formation
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    // Extract the ID from the URL path parameters
    const { id } = await params; 
    
    // Get the updated form fields from the request body
    const body = await req.json();

    // Update in MongoDB
    const updatedFormation = await Formation.findByIdAndUpdate(
      id,
      body,
      { new: true, runValidators: true } // 'new: true' returns the modified document
    );

    if (!updatedFormation) {
      return NextResponse.json(
        { message: "Formation non trouvée" },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedFormation, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: "Erreur lors de la modification", error: error.message },
      { status: 500 }
    );
  }
}

// Optional: Add a DELETE handler while you're at it!
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const deletedFormation = await Formation.findByIdAndDelete(id);

    if (!deletedFormation) {
      return NextResponse.json({ message: "Formation non trouvée" }, { status: 404 });
    }

    return NextResponse.json({ message: "Formation supprimée avec succès" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: "Erreur de suppression" }, { status: 500 });
  }
}
