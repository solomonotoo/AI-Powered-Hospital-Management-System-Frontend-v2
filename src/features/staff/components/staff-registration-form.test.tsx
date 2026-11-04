import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StaffRegistrationForm } from "./staff-registration-form";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  onboard: vi.fn(),
  assignUnit: vi.fn(),
  invalidateQueries: vi.fn(),
}));

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub);
Element.prototype.scrollIntoView = vi.fn();
Element.prototype.hasPointerCapture = vi.fn(() => false);
Element.prototype.setPointerCapture = vi.fn();
Element.prototype.releasePointerCapture = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
}));

vi.mock("@/features/facility/hooks/use-facilities", () => ({
  useCurrentFacilityUnits: () => ({
    data: [],
    isPending: false,
  }),
}));

vi.mock("@/features/identity/hooks/use-session", () => ({
  useCan: () => true,
}));

vi.mock("../api/staff", () => ({
  assignStaffUnit: mocks.assignUnit,
}));

vi.mock("../hooks/use-staff", () => ({
  staffQueryKeys: {
    all: ["staff"],
    detail: (id: string) => ["staff", id],
  },
  useOnboardStaff: () => ({
    mutateAsync: mocks.onboard,
    isPending: false,
  }),
}));

async function completePersonalDetails() {
  fireEvent.change(screen.getByLabelText("First name"), {
    target: { value: "Ama" },
  });
  fireEvent.change(screen.getByLabelText("Last name"), {
    target: { value: "Mensah" },
  });
  fireEvent.change(screen.getByLabelText("Date of birth"), {
    target: { value: "1990-01-01" },
  });
  fireEvent.change(screen.getByLabelText("Phone"), {
    target: { value: "0241234567" },
  });
  fireEvent.click(screen.getByRole("button", { name: /next/i }));
  await screen.findByLabelText("Category");
}

async function completeProfessionalDetails() {
  fireEvent.change(screen.getByLabelText("Licensing body"), {
    target: { value: "MDC" },
  });
  fireEvent.change(screen.getByLabelText("Licence number"), {
    target: { value: "MDC-123" },
  });
  fireEvent.change(screen.getByLabelText("Issued on"), {
    target: { value: "2020-01-01" },
  });
  fireEvent.change(screen.getByLabelText("Expires on"), {
    target: { value: "2027-01-01" },
  });
  fireEvent.click(screen.getByRole("button", { name: /next/i }));
}

beforeEach(() => {
  mocks.push.mockReset();
  mocks.onboard.mockReset();
  mocks.assignUnit.mockReset();
  mocks.invalidateQueries.mockReset();
});

describe("StaffRegistrationForm", () => {
  it("advances from professional details to posting and review", async () => {
    render(<StaffRegistrationForm />);

    await completePersonalDetails();
    await completeProfessionalDetails();

    await waitFor(() => {
      expect(screen.getByText("Initial posting (optional)")).toBeInTheDocument();
    });
    // Advancing to the review step must never create the record: the
    // click that moved the wizard forward must not activate the register
    // button that replaced Next.
    expect(mocks.onboard).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("treats Enter on an earlier step as navigation, not a save", async () => {
    render(<StaffRegistrationForm />);

    await completePersonalDetails();
    fireEvent.click(screen.getByLabelText("Category"));
    fireEvent.click(
      await screen.findByRole("option", { name: "Records officer" }),
    );

    fireEvent.submit(document.querySelector("form")!);

    await waitFor(() => {
      expect(screen.getByText("Initial posting (optional)")).toBeInTheDocument();
    });
    expect(mocks.onboard).not.toHaveBeenCalled();
  });

  it("advances when a non-licensed category leaves the optional licence blank", async () => {
    render(<StaffRegistrationForm />);

    await completePersonalDetails();
    fireEvent.click(screen.getByLabelText("Category"));
    fireEvent.click(
      await screen.findByRole("option", { name: "Records officer" }),
    );
    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByText("Initial posting (optional)")).toBeInTheDocument();
    });
  });

  it("keeps the blank licence row visible when a licensed category blocks the step", async () => {
    render(<StaffRegistrationForm />);

    await completePersonalDetails();

    // The default category (Doctor) requires a licence. Pressing Next with the
    // blank starter row must explain the block instead of deleting the row
    // that carries the fields the operator needs to fill in.
    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    await waitFor(() => {
      expect(
        screen.getByText("This step is not complete"),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByText("Check the highlighted fields below, then try again."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Licensing body")).toBeInTheDocument();
    expect(screen.getByText("Enter the licence number")).toBeInTheDocument();
    expect(screen.queryByText("Initial posting (optional)")).not.toBeInTheDocument();
  });
});
