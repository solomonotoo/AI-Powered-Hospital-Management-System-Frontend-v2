import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RegisterFacilityWizard } from "./register-facility-wizard";

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  register: vi.fn(),
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
  useRouter: () => ({ replace: mocks.replace }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/features/facility/hooks/use-facilities", () => ({
  useRegisterFacility: () => ({
    mutateAsync: mocks.register,
    isPending: false,
  }),
}));

function fillProfileStep() {
  fireEvent.change(screen.getByLabelText("Facility code"), {
    target: { value: "KBTH-02" },
  });
  fireEvent.change(screen.getByLabelText("Facility name"), {
    target: { value: "Korle Bu Teaching Hospital" },
  });
  fireEvent.click(screen.getByRole("button", { name: /next/i }));
}

function fillLocationStep() {
  fireEvent.change(screen.getByLabelText("Street address"), {
    target: { value: "1 Guggisberg Avenue" },
  });
  fireEvent.change(screen.getByLabelText("City / town"), {
    target: { value: "Accra" },
  });
  fireEvent.click(screen.getByRole("button", { name: /next/i }));
}

beforeEach(() => {
  mocks.replace.mockReset();
  mocks.register.mockReset();
});

describe("RegisterFacilityWizard", () => {
  it("shows the review step and does not register when Next finishes the licence step", async () => {
    render(<RegisterFacilityWizard />);

    fillProfileStep();
    await screen.findByLabelText("Street address");
    fillLocationStep();
    await screen.findByLabelText("Licence number");

    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByText("Confirm and register")).toBeInTheDocument();
    });
    // The review must stay on screen: the click that advanced the step
    // must not also activate the register button that replaced Next.
    expect(screen.getByRole("button", { name: /register facility/i })).toBeInTheDocument();
    expect(mocks.register).not.toHaveBeenCalled();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("registers only when the review step's button is pressed", async () => {
    mocks.register.mockResolvedValue("facility-1");
    render(<RegisterFacilityWizard />);

    fillProfileStep();
    await screen.findByLabelText("Street address");
    fillLocationStep();
    await screen.findByLabelText("Licence number");
    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    const registerButton = await screen.findByRole("button", {
      name: /register facility/i,
    });
    fireEvent.click(registerButton);

    await waitFor(() => expect(mocks.register).toHaveBeenCalledTimes(1));
    expect(mocks.replace).toHaveBeenCalledWith("/platform/facilities/facility-1");
  });

  it("treats Enter on the licence step as navigation, not saved input", async () => {
    render(<RegisterFacilityWizard />);

    fillProfileStep();
    await screen.findByLabelText("Street address");
    fillLocationStep();
    await screen.findByLabelText("Licence number");

    // Keyboard submission inside the form follows the same guard.
    fireEvent.submit(document.querySelector("form")!);

    await waitFor(() => {
      expect(screen.getByText("Confirm and register")).toBeInTheDocument();
    });
    expect(mocks.register).not.toHaveBeenCalled();
  });
});
