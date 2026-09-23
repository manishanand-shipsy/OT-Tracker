import { prisma } from "@/lib/prisma";

/**
 * Employees type their own project name rather than picking from an
 * admin-curated list — this looks it up case-insensitively and reuses the
 * existing row if one matches (so "Project Alpha" and "project alpha"
 * don't create two rows), otherwise creates a new one.
 */
export async function getOrCreateProjectByName(name: string) {
  const trimmed = name.trim();
  const existing = await prisma.project.findFirst({
    where: { name: { equals: trimmed, mode: "insensitive" } },
  });
  if (existing) return existing;
  return prisma.project.create({ data: { name: trimmed } });
}
