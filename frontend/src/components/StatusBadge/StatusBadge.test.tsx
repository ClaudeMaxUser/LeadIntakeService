import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { StatusBadge } from "./index.js";

describe("StatusBadge Component", () => {
  it("renders NEW status label correctly", () => {
    render(<StatusBadge status="NEW" />);
    expect(screen.getByText("New")).toBeInTheDocument();
  });

  it("renders CONTACTED status label correctly", () => {
    render(<StatusBadge status="CONTACTED" />);
    expect(screen.getByText("Contacted")).toBeInTheDocument();
  });

  it("renders QUALIFIED status label correctly", () => {
    render(<StatusBadge status="QUALIFIED" />);
    expect(screen.getByText("Qualified")).toBeInTheDocument();
  });

  it("renders CONVERTED status label correctly", () => {
    render(<StatusBadge status="CONVERTED" />);
    expect(screen.getByText("Converted")).toBeInTheDocument();
  });

  it("renders LOST status label correctly", () => {
    render(<StatusBadge status="LOST" />);
    expect(screen.getByText("Lost")).toBeInTheDocument();
  });
});
