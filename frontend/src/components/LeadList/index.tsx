import React from "react";
import { Link } from "react-router-dom";
import { Lead, LeadsFilterParams, PaginationInfo } from "../../types/index.js";
import { EmptyState } from "../common/EmptyState.js";
import { ErrorState } from "../common/ErrorState.js";
import { Loading } from "../common/Loading.js";
import { Pagination } from "../common/Pagination.js";
import { StatusBadge } from "../StatusBadge/index.js";

interface LeadListProps {
  leads: Lead[];
  pagination: PaginationInfo;
  loading: boolean;
  error: string | null;
  filters: LeadsFilterParams;
  onFilterChange: (filters: Partial<LeadsFilterParams>) => void;
  onRetry: () => void;
}

export const LeadList: React.FC<LeadListProps> = ({
  leads,
  pagination,
  loading,
  error,
  filters,
  onFilterChange,
  onRetry,
}) => {
  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return iso;
    }
  };

  return (
    <div>
      {/* Controls Bar */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1.5rem",
          backgroundColor: "#ffffff",
          padding: "1rem",
          borderRadius: "0.5rem",
          border: "1px solid #e2e8f0",
        }}
      >
        {/* Search */}
        <div style={{ flex: 1, minWidth: "240px" }}>
          <input
            type="text"
            placeholder="Search leads by name, email, or phone..."
            value={filters.search || ""}
            onChange={(e) =>
              onFilterChange({ search: e.target.value, page: 1 })
            }
            style={{
              width: "100%",
              padding: "0.6rem 0.8rem",
              borderRadius: "0.375rem",
              border: "1px solid #cbd5e1",
              fontSize: "0.875rem",
            }}
          />
        </div>

        {/* Status Filter */}
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <label
            htmlFor="status-filter"
            style={{ fontSize: "0.875rem", fontWeight: 500, color: "#475569" }}
          >
            Status:
          </label>
          <select
            id="status-filter"
            value={filters.status || ""}
            onChange={(e) =>
              onFilterChange({
                status: (e.target.value as any) || undefined,
                page: 1,
              })
            }
            style={{
              padding: "0.6rem 0.8rem",
              borderRadius: "0.375rem",
              border: "1px solid #cbd5e1",
              backgroundColor: "#ffffff",
              fontSize: "0.875rem",
            }}
          >
            <option value="">All Statuses</option>
            <option value="NEW">New</option>
            <option value="CONTACTED">Contacted</option>
            <option value="QUALIFIED">Qualified</option>
            <option value="CONVERTED">Converted</option>
            <option value="LOST">Lost</option>
          </select>
        </div>

        {/* Sort By */}
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <label
            htmlFor="sort-by"
            style={{ fontSize: "0.875rem", fontWeight: 500, color: "#475569" }}
          >
            Sort:
          </label>
          <select
            id="sort-by"
            value={`${filters.sortBy || "createdAt"}-${filters.sortOrder || "desc"}`}
            onChange={(e) => {
              const [sortBy, sortOrder] = e.target.value.split("-") as [
                any,
                any,
              ];
              onFilterChange({ sortBy, sortOrder, page: 1 });
            }}
            style={{
              padding: "0.6rem 0.8rem",
              borderRadius: "0.375rem",
              border: "1px solid #cbd5e1",
              backgroundColor: "#ffffff",
              fontSize: "0.875rem",
            }}
          >
            <option value="createdAt-desc">Newest First</option>
            <option value="createdAt-asc">Oldest First</option>
            <option value="fullName-asc">Name (A-Z)</option>
            <option value="fullName-desc">Name (Z-A)</option>
            <option value="status-asc">Status (Asc)</option>
          </select>
        </div>

        {/* Page Size */}
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <label
            htmlFor="page-limit"
            style={{ fontSize: "0.875rem", fontWeight: 500, color: "#475569" }}
          >
            Per Page:
          </label>
          <select
            id="page-limit"
            value={filters.limit || 20}
            onChange={(e) => {
              onFilterChange({ limit: parseInt(e.target.value, 10), page: 1 });
            }}
            style={{
              padding: "0.6rem 0.8rem",
              borderRadius: "0.375rem",
              border: "1px solid #cbd5e1",
              backgroundColor: "#ffffff",
              fontSize: "0.875rem",
            }}
          >
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
          </select>
        </div>
      </div>

      {/* Main Table / State View */}
      {loading ? (
        <Loading message="Fetching lead records..." />
      ) : error ? (
        <ErrorState message={error} onRetry={onRetry} />
      ) : leads.length === 0 ? (
        <EmptyState />
      ) : (
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "0.5rem",
            border: "1px solid #e2e8f0",
            overflow: "hidden",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              textAlign: "left",
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: "#f8fafc",
                  borderBottom: "1px solid #e2e8f0",
                }}
              >
                <th
                  style={{
                    padding: "0.85rem 1rem",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "#475569",
                    textTransform: "uppercase",
                  }}
                >
                  Full Name
                </th>
                <th
                  style={{
                    padding: "0.85rem 1rem",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "#475569",
                    textTransform: "uppercase",
                  }}
                >
                  Contact Info
                </th>
                <th
                  style={{
                    padding: "0.85rem 1rem",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "#475569",
                    textTransform: "uppercase",
                  }}
                >
                  Status
                </th>
                <th
                  style={{
                    padding: "0.85rem 1rem",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "#475569",
                    textTransform: "uppercase",
                  }}
                >
                  Source / Form
                </th>
                <th
                  style={{
                    padding: "0.85rem 1rem",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "#475569",
                    textTransform: "uppercase",
                  }}
                >
                  Created At
                </th>
                <th
                  style={{
                    padding: "0.85rem 1rem",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "#475569",
                    textTransform: "uppercase",
                  }}
                >
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr
                  key={lead.id}
                  style={{
                    borderBottom: "1px solid #f1f5f9",
                    transition: "background-color 0.15s ease",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = "#f8fafc")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "#ffffff")
                  }
                >
                  <td
                    style={{
                      padding: "1rem",
                      fontWeight: 600,
                      color: "#0f172a",
                    }}
                  >
                    <Link
                      to={`/leads/${lead.id}`}
                      style={{ color: "#2563eb", textDecoration: "none" }}
                    >
                      {lead.full_name}
                    </Link>
                  </td>
                  <td style={{ padding: "1rem", fontSize: "0.875rem" }}>
                    <div>{lead.email || "—"}</div>
                    <div style={{ color: "#64748b", fontSize: "0.8rem" }}>
                      {lead.phone || "—"}
                    </div>
                  </td>
                  <td style={{ padding: "1rem" }}>
                    <StatusBadge status={lead.status} />
                  </td>
                  <td
                    style={{
                      padding: "1rem",
                      fontSize: "0.85rem",
                      color: "#64748b",
                    }}
                  >
                    <div>{lead.source}</div>
                    {lead.form_id && (
                      <div style={{ fontSize: "0.75rem" }}>
                        Form: {lead.form_id}
                      </div>
                    )}
                  </td>
                  <td
                    style={{
                      padding: "1rem",
                      fontSize: "0.85rem",
                      color: "#64748b",
                    }}
                  >
                    {formatDate(lead.created_at)}
                  </td>
                  <td style={{ padding: "1rem" }}>
                    <Link
                      to={`/leads/${lead.id}`}
                      style={{
                        display: "inline-block",
                        padding: "0.35rem 0.75rem",
                        backgroundColor: "#f1f5f9",
                        color: "#334155",
                        borderRadius: "0.375rem",
                        fontSize: "0.8rem",
                        fontWeight: 500,
                        textDecoration: "none",
                        border: "1px solid #cbd5e1",
                      }}
                    >
                      View Details →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ padding: "0 1rem" }}>
            <Pagination
              pagination={pagination}
              onPageChange={(page) => onFilterChange({ page })}
            />
          </div>
        </div>
      )}
    </div>
  );
};
