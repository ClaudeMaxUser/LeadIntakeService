import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Pagination } from "./Pagination.js";

describe("Pagination Component", () => {
  it("does not render when totalPages is 1 or less", () => {
    const { container } = render(
      <Pagination
        pagination={{ page: 1, limit: 20, total: 15, totalPages: 1 }}
        onPageChange={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders correctly with multiple pages and displays record range", () => {
    render(
      <Pagination
        pagination={{ page: 2, limit: 10, total: 25, totalPages: 3 }}
        onPageChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();
    expect(screen.getByText("11")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
    expect(screen.getByText("25")).toBeInTheDocument();
  });

  it("disables Previous button on the first page", () => {
    const handlePageChange = vi.fn();
    render(
      <Pagination
        pagination={{ page: 1, limit: 10, total: 30, totalPages: 3 }}
        onPageChange={handlePageChange}
      />,
    );

    const prevButton = screen.getByRole("button", { name: /previous/i });
    const nextButton = screen.getByRole("button", { name: /next/i });

    expect(prevButton).toBeDisabled();
    expect(nextButton).not.toBeDisabled();

    fireEvent.click(prevButton);
    expect(handlePageChange).not.toHaveBeenCalled();

    fireEvent.click(nextButton);
    expect(handlePageChange).toHaveBeenCalledWith(2);
  });

  it("disables Next button on the last page", () => {
    const handlePageChange = vi.fn();
    render(
      <Pagination
        pagination={{ page: 3, limit: 10, total: 30, totalPages: 3 }}
        onPageChange={handlePageChange}
      />,
    );

    const prevButton = screen.getByRole("button", { name: /previous/i });
    const nextButton = screen.getByRole("button", { name: /next/i });

    expect(prevButton).not.toBeDisabled();
    expect(nextButton).toBeDisabled();

    fireEvent.click(prevButton);
    expect(handlePageChange).toHaveBeenCalledWith(2);
  });
});
