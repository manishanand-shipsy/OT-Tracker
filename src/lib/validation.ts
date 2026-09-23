import { z } from "zod";

const timeField = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Enter a time as HH:mm");

export const overtimeEntrySchema = z
  .object({
    date: z.coerce.date(),
    startTime: timeField,
    endTime: timeField,
    projectName: z.string().trim().min(1, "Project is required").max(100),
    reason: z.string().trim().min(3, "Reason must be at least 3 characters"),
    workMode: z.enum(["WFH", "OFFICE"]),
  })
  .refine((data) => data.startTime !== data.endTime, {
    message: "Start and end time can't be the same",
    path: ["endTime"],
  });

export type OvertimeEntryInput = z.infer<typeof overtimeEntrySchema>;

export const approvalActionSchema = z.object({
  comment: z.string().trim().max(1000).optional(),
});
