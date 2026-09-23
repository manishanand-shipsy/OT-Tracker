import { NextRequest } from "next/server";
import { handleDecision } from "../decision";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handleDecision(req, id, "APPROVED");
}
