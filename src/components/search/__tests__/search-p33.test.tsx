import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SearchEmptyState } from "@/components/search/SearchEmptyState";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("SearchEmptyState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_P33_SEARCH_ENGINE", "1");
  });

  it("shows query and related links", () => {
    render(
      <SearchEmptyState
        query="xyzabc"
        didYouMean={["ssd"]}
        relatedQueries={["ssd samsung"]}
        categoryRedirect={{ slug: "ssd", url: "/categoria/ssd/" }}
      />,
    );
    expect(screen.getByText(/xyzabc/)).toBeTruthy();
    expect(screen.getByText("ssd")).toBeTruthy();
    expect(screen.getByText("ssd samsung")).toBeTruthy();
    expect(screen.getByText(/Ver categoria/)).toBeTruthy();
  });
});

describe("SearchTypeahead flag off", () => {
  it("renders combobox", async () => {
    vi.stubEnv("NEXT_PUBLIC_P33_SEARCH_ENGINE", "");
    const { SearchTypeahead } = await import(
      "@/components/search/SearchTypeahead"
    );
    render(<SearchTypeahead />);
    expect(screen.getByRole("combobox")).toBeTruthy();
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "ss" },
    });
  });
});
