"use client";

import { FormEvent, useEffect, useState } from "react";

type CheckInResponse = "yes" | "no";

type UserReport = {
  name: string;
  normalizedName: string;
  yesCount: number;
  responsesByDate: Partial<Record<string, CheckInResponse>>;
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

function formatDateHeading(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC"
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function ResponseCell({ response }: { response?: CheckInResponse }) {
  if (!response) {
    return <span className="emptyAnswer">-</span>;
  }

  return (
    <span
      className={`answerBadge ${response === "yes" ? "answerYes" : "answerNo"}`}
    >
      {response === "yes" ? "Yes" : "No"}
    </span>
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
                  {report.window.dates.map((reportDate) => (
                    <th className="dateHeader" key={reportDate}>
                      <abbr title={formatDate(reportDate)}>
                        {formatDateHeading(reportDate)}
                      </abbr>
                    </th>
                  ))}
                  <th className="totalHeader">Total</th>
                  <th>Gold star</th>
                </tr>
              </thead>
              <tbody>
                {report.users.length === 0 ? (
                  <tr>
                    <td
                      colSpan={report.window.dates.length + 3}
                      className="emptyCell"
                    >
                      No check-ins found for this range.
                    </td>
                  </tr>
                ) : (
                  report.users.map((user) => (
                    <tr key={user.normalizedName}>
                      <td className="nameCell">{user.name}</td>
                      {report.window.dates.map((reportDate) => (
                        <td className="answerCell" key={reportDate}>
                          <ResponseCell
                            response={user.responsesByDate[reportDate]}
                          />
                        </td>
                      ))}
                      <td className="totalCell">{user.yesCount}</td>
                      <td>
                        <span
                          className={
                            user.goldStar ? "statusBadge goldBadge" : "statusBadge"
                          }
                        >
                          {user.goldStar ? "Gold star" : "No gold star"}
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
