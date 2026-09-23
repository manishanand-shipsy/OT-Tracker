import { prisma } from "@/lib/prisma";

/** True if this user is designated as approver1 or approver2 for anyone. */
export async function isApprover(userId: string): Promise<boolean> {
  const count = await prisma.user.count({
    where: { OR: [{ approver1Id: userId }, { approver2Id: userId }] },
  });
  return count > 0;
}

/** Admins and approvers can both view/export the overtime data. */
export async function canAccessExport(userId: string, role: string): Promise<boolean> {
  if (role === "ADMIN") return true;
  return isApprover(userId);
}
