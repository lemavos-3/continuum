import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ create: vi.fn().mockResolvedValue({}), invalidate: vi.fn(), toast: vi.fn() }));
vi.mock("@/lib/api", () => ({ notesApi: { create: mocks.create } }));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ invalidateQueries: mocks.invalidate }) }));
vi.mock("@/contexts/LanguageContext", () => ({ useLanguage: () => ({ language: "pt" }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));

import { QuickCapture } from "@/components/QuickCapture";

afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("saves the first line as the title and remaining lines as the body", async () => {
  render(<QuickCapture />);
  fireEvent.click(screen.getByRole("button", { name: "Captura rápida" }));
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "Ideia de projeto\nPróximos passos" } });
  fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
  await waitFor(() => expect(mocks.create).toHaveBeenCalledWith("Ideia de projeto", "Próximos passos"));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(mocks.invalidate).toHaveBeenCalled();
});

it("does not open a weekly review through the removed shortcut", () => {
  render(<QuickCapture />);
  fireEvent.keyDown(window, { key: "y", ctrlKey: true, shiftKey: true });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  fireEvent.keyDown(window, { key: "n", ctrlKey: true, shiftKey: true });
  expect(screen.getByRole("dialog")).toBeInTheDocument();
});