import React from "react";
import { Link } from "react-router-dom";
import { Lead, LeadsFilterParams, PaginationInfo } from "../../types/index.js";
import { formatDate } from "../../utils/format.js";
import { EmptyState } from "../common/EmptyState.js";
import { ErrorState } from "../common/ErrorState.js";
import { Loading } from "../common/Loading.js";
import { Pagination } from "../common/Pagination.js";
import { StatusBadge } from "../StatusBadge/index.js";
import styles from "./LeadList.module.css";

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
  return (
    <div>
      {/* Controls Bar */}
      <div className={styles.controlsBar}>
        {/* Search */}
        <div className={styles.searchContainer}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search leads by name, email, or phone..."
            value={filters.search || ""}
            onChange={(e) =>
              onFilterChange({ search: e.target.value, page: 1 })
            }
          />
        </div>

        {/* Status Filter */}
        <div className={styles.filterGroup}>
          <label htmlFor="status-filter" className={styles.filterLabel}>
            Status:
          </label>
          <select
            id="status-filter"
            className={styles.selectInput}
            value={filters.status || ""}
            onChange={(e) =>
              onFilterChange({
                status: (e.target.value as any) || undefined,
                page: 1,
              })
            }
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
        <div className={styles.filterGroup}>
          <label htmlFor="sort-by" className={styles.filterLabel}>
            Sort:
          </label>
          <select
            id="sort-by"
            className={styles.selectInput}
            value={`${filters.sortBy || "createdAt"}-${filters.sortOrder || "desc"}`}
            onChange={(e) => {
              const [sortBy, sortOrder] = e.target.value.split("-") as [
                any,
                any,
              ];
              onFilterChange({ sortBy, sortOrder, page: 1 });
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
        <div className={styles.filterGroup}>
          <label htmlFor="page-limit" className={styles.filterLabel}>
            Per Page:
          </label>
          <select
            id="page-limit"
            className={styles.selectInput}
            value={filters.limit || 20}
            onChange={(e) => {
              onFilterChange({ limit: parseInt(e.target.value, 10), page: 1 });
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
        <div className={styles.tableCard}>
          <table className={styles.table}>
            <thead>
              <tr className={styles.tableHeaderRow}>
                <th className={styles.tableHeader}>Full Name</th>
                <th className={styles.tableHeader}>Contact Info</th>
                <th className={styles.tableHeader}>Status</th>
                <th className={styles.tableHeader}>Source / Form</th>
                <th className={styles.tableHeader}>Created At</th>
                <th className={styles.tableHeader}>Action</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className={styles.tableRow}>
                  <td className={styles.nameCell}>
                    <Link to={`/leads/${lead.id}`} className={styles.leadLink}>
                      {lead.full_name}
                    </Link>
                  </td>
                  <td className={styles.contactCell}>
                    <div>{lead.email || "—"}</div>
                    <div className={styles.subText}>
                      {lead.phone || "—"}
                    </div>
                  </td>
                  <td style={{ padding: "1rem" }}>
                    <StatusBadge status={lead.status} />
                  </td>
                  <td className={styles.metaCell}>
                    <div>{lead.source}</div>
                    {lead.form_id && (
                      <div style={{ fontSize: "0.75rem" }}>
                        Form: {lead.form_id}
                      </div>
                    )}
                  </td>
                  <td className={styles.metaCell}>
                    {formatDate(lead.created_at)}
                  </td>
                  <td style={{ padding: "1rem" }}>
                    <Link
                      to={`/leads/${lead.id}`}
                      className={styles.actionBtn}
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
