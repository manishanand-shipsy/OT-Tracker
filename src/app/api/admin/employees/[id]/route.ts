import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  approver1Id: z.string().nullable(),
  approver2Id: z.string().nullable(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (
    (parsed.data.approver1Id && parsed.data.approver1Id === id) ||
    (parsed.data.approver2Id && parsed.data.approver2Id === id)
  ) {
    return NextResponse.json({ error: "An employee cannot approve their own entries" }, { status: 400 });
  }
  if (
    parsed.data.approver1Id &&
    parsed.data.approver2Id &&
    parsed.data.approver1Id === parsed.data.approver2Id
  ) {
    return NextResponse.json({ error: "Approver 1 and Approver 2 must be different people" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      approver1Id: parsed.data.approver1Id,
      approver2Id: parsed.data.approver2Id,
    },
  });

  return NextResponse.json(updated);
}
