import { api } from "@/lib/http";
import type {
  ConfigureSequenceInput,
  PrintProfileView,
  SequenceView,
  UpdatePrintProfileInput,
} from "../types";

// Facility configuration API. Every endpoint is token-scoped: the
// backend reads the facility from the `fid` claim, so a cross-facility
// call is inexpressible from this client.

export async function getSequences(): Promise<SequenceView[]> {
  const { data } = await api.get<SequenceView[]>("/api/v1/configuration/sequences");
  // Jackson may omit null fields; normalise once at the boundary so the
  // editor can rely on the declared shape.
  return data.map((sequence) => ({
    ...sequence,
    prefix: sequence.prefix ?? null,
    resetPolicy: sequence.resetPolicy ?? null,
    currentPeriod: sequence.currentPeriod ?? null,
  }));
}

export async function configureSequence(input: ConfigureSequenceInput): Promise<void> {
  await api.put("/api/v1/configuration/sequences", input);
}

export async function getPrintProfile(): Promise<PrintProfileView> {
  const { data } = await api.get<PrintProfileView>("/api/v1/configuration/print-profile");
  return {
    configured: data.configured,
    displayName: data.displayName ?? null,
    addressLine1: data.addressLine1 ?? null,
    addressLine2: data.addressLine2 ?? null,
    addressCity: data.addressCity ?? null,
    addressCountry: data.addressCountry ?? null,
    phone: data.phone ?? null,
    email: data.email ?? null,
    receiptFooter: data.receiptFooter ?? null,
    logoObjectKey: data.logoObjectKey ?? null,
  };
}

export async function updatePrintProfile(input: UpdatePrintProfileInput): Promise<void> {
  await api.put("/api/v1/configuration/print-profile", input);
}
