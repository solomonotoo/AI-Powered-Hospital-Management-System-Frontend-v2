import { z } from "zod";

// First administrator invitation is email-only: the backend creates the
// STAFF account from the address and issues the bootstrap FACILITY_ADMIN
// assignment. Names are collected by the staff module later, not here.
export const firstAdminSchema = z.object({
  email: z.string().trim().pipe(z.email("Enter a valid email address")),
});

export type FirstAdminFormValues = z.infer<typeof firstAdminSchema>;
