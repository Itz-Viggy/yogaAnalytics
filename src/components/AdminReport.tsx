"use client";

import { FormEvent, useEffect, useState } from "react";

type UserReport = {
  name: string;
  normalizedName: string;
  yesCount: number;
  noCount: number;
  totalCount: number;
  yesDates: string[];
  noDates: string[];
  goldStar: boolean;
};

type ReportData = {
  window: {
    startDate: string;
    endDate: string;
    dates: string[];
  };
  summary: {
    userCount: number;
    goldStarCount: number;
    yesCount: number;
    noCount: number;
  };
  users: UserReport[];
};

type AdminReportProps = {
  defaultDate: string;
};

function formatDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function DateList({ dates, emptyText }: { dates: string[]; emptyText: string }) {
  if (dates.length === 0) {
    return <span className="mutedText">{emptyText}</span>;
  }

  return (
    <div className="datePills">
      {dates.map((date) => (
        <span className="datePill" key={date}>
          {formatDate(date)}
        </span>
      ))}
    </div>
  );
}

export function AdminReport({ defaultDate }: AdminReportProps) {
  const [date, setDate] = useState(defaultDate);
  const [report, setReport] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadReport(reportDate = date) {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/admin/report?date=${encodeURIComponent(reportDate)}`,
        { cache: "no-store" }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to generate report.");
      }

      setReport(data);
    } catch (reportError) {
      setError(
        reportError instanceof Error
          ? reportError.message
          : "Unable to generate report."
      );
      setReport(null);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadReport(date);
  }

  useEffect(() => {
    void loadReport(defaultDate);
  }, [defaultDate]);

  return (
    <section className="adminSurface" aria-labelledby="admin-title">
      <div className="adminHeader">
        <div>
          <p className="eyebrow">Admin</p>
          <h1 id="admin-title">Seven day report</h1>
        </div>
        <form className="reportForm" onSubmit={handleSubmit}>
          <label htmlFor="report-date">End date</label>
          <input
            id="report-date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
          <button className="button primaryButton" type="submit" disabled={isLoading}>
            {isLoading ? "Generating" : "Generate"}
          </button>
        </form>
      </div>

      {error ? <p className="statusMessage errorMessage">{error}</p> : null}

      {report ? (
        <>
          <div className="reportRange">
            {formatDate(report.window.startDate)} to {formatDate(report.window.endDate)}
          </div>

          <div className="metricGrid" aria-label="Report summary">
            <div className="metricTile">
              <span>Users</span>
              <strong>{report.summary.userCount}</strong>
            </div>
            <div className="metricTile">
              <span>Gold stars</span>
              <strong>{report.summary.goldStarCount}</strong>
            </div>
            <div className="metricTile">
              <span>Yes</span>
              <strong>{report.summary.yesCount}</strong>
            </div>
            <div className="metricTile">
              <span>No</span>
              <strong>{report.summary.noCount}</strong>
            </div>
          </div>

          <div className="tableShell">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Yes</th>
                  <th>No</th>
                  <th>Yes dates</th>
                  <th>No dates</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {report.users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="emptyCell">
                      No check-ins found for this range.
                    </td>
                  </tr>
                ) : (
                  report.users.map((user) => (
                    <tr key={user.normalizedName}>
                      <td className="nameCell">{user.name}</td>
                      <td>{user.yesCount}</td>
                      <td>{user.noCount}</td>
                      <td>
                        <DateList dates={user.yesDates} emptyText="None" />
                      </td>
                      <td>
                        <DateList dates={user.noDates} emptyText="None" />
                      </td>
                      <td>
                        <span
                          className={
                            user.goldStar ? "statusBadge goldBadge" : "statusBadge"
                          }
                        >
                          {user.goldStar ? "Gold star" : "In progress"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </section>
  );
}
