"use client";

import { FormEvent, KeyboardEvent, useState } from "react";

type CheckInResponse = "yes" | "no";

type SevenDayCheckIn = {
  date: string;
  response: CheckInResponse | null;
};

type LookupState =
  | {
      status: "idle";
    }
  | {
      status: "found" | "new";
      name: string;
      normalizedName: string;
      lastCheckInDate: string | null;
      sevenDayCheckIns: SevenDayCheckIn[];
    };

type SaveResult = {
  action: "created" | "updated";
  userStatus: "existing" | "new";
  date: string;
  name: string;
  normalizedName: string;
  response: CheckInResponse;
  sevenDayCheckIns: SevenDayCheckIn[];
};

function sanitizeNameInput(value: string) {
  return value.replace(/[^A-Za-z]/g, "");
}

function getSevenDayCheckIns(value: unknown): SevenDayCheckIn[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is SevenDayCheckIn =>
      typeof item === "object" &&
      item !== null &&
      "date" in item &&
      "response" in item &&
      typeof item.date === "string" &&
      (item.response === "yes" ||
        item.response === "no" ||
        item.response === null)
  );
}

function formatHistoryDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return value;
  }

  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(
    undefined,
    {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric"
    }
  );
}

function getHistoryLabel(response: CheckInResponse | null) {
  if (response === "yes") {
    return "Yes";
  }

  if (response === "no") {
    return "No";
  }

  return "No check-in";
}

function getHistoryClassName(response: CheckInResponse | null) {
  if (response === "yes") {
    return "historyYes";
  }

  if (response === "no") {
    return "historyNo";
  }

  return "historyMissing";
}

function SevenDayCheckInHistory({ entries }: { entries: SevenDayCheckIn[] }) {
  const yesCount = entries.filter((entry) => entry.response === "yes").length;
  const noCount = entries.filter((entry) => entry.response === "no").length;
  const missingCount = entries.filter((entry) => entry.response === null).length;

  return (
    <div className="historyBlock" aria-label="Your past seven days">
      <div className="historyHeader">
        <div>
          <p className="stripLabel">Past 7 days Report</p>
          <p className="historySummary">
            {entries.length > 0
              ? `${yesCount} yes, ${noCount} no, ${missingCount} no check-in`
              : "No previous check-ins yet."}
          </p>
        </div>
      </div>

      {entries.length > 0 ? (
        <ol className="historyList">
          {entries.map((entry) => (
            <li key={entry.date}>
              <span>{formatHistoryDate(entry.date)}</span>
              <span className={`historyBadge ${getHistoryClassName(entry.response)}`}>
                {getHistoryLabel(entry.response)}
              </span>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}

export function UserCheckIn() {
  const today = new Date();
  const practiceDay = today.toLocaleDateString(undefined, { weekday: "long" });
  const practiceDate = today.toLocaleDateString();
  const [name, setName] = useState("");
  const [lookup, setLookup] = useState<LookupState>({ status: "idle" });
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [saveResult, setSaveResult] = useState<SaveResult | null>(null);

  async function handleLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = sanitizeNameInput(name);

    if (!trimmedName) {
      setError("Name is required.");
      return;
    }

    setName(trimmedName);

    setIsLookingUp(true);
    setError("");
    setSaveResult(null);

    try {
      const response = await fetch(
        `/api/users/lookup?name=${encodeURIComponent(trimmedName)}`,
        { cache: "no-store" }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to look up user.");
      }

      setLookup({
        status: data.exists ? "found" : "new",
        name: data.name,
        normalizedName: data.normalizedName,
        lastCheckInDate: data.lastCheckInDate,
        sevenDayCheckIns: getSevenDayCheckIns(data.sevenDayCheckIns)
      });
      setName(data.name);
    } catch (lookupError) {
      setError(
        lookupError instanceof Error
          ? lookupError.message
          : "Unable to look up user."
      );
    } finally {
      setIsLookingUp(false);
    }
  }

  async function saveCheckIn(responseValue: "yes" | "no") {
    setIsSaving(true);
    setError("");

    try {
      const response = await fetch("/api/checkin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name,
          response: responseValue
        })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to save check-in.");
      }

      setSaveResult(data);
      setLookup({
        status: "found",
        name: data.name,
        normalizedName: data.normalizedName,
        lastCheckInDate: data.date,
        sevenDayCheckIns: getSevenDayCheckIns(data.sevenDayCheckIns)
      });
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Unable to save check-in."
      );
    } finally {
      setIsSaving(false);
    }
  }

  function resetFlow() {
    setName("");
    setLookup({ status: "idle" });
    setError("");
    setSaveResult(null);
  }

  function handleNameKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === " " || event.code === "Space") {
      event.preventDefault();
    }
  }

  return (
    <section className="checkInPanel" aria-labelledby="check-in-title">
      <div className="panelHeader">
        <p className="eyebrow">Daily check-in</p>
        <h1 id="check-in-title">
          Have you done your practice on{" "}
          <span className="highlight">
            {practiceDay} ({practiceDate})
          </span>
          ?
        </h1>
      </div>

      <form className="nameForm" onSubmit={handleLookup}>
        <label htmlFor="student-name">Name (Please enter your short Name)</label>
        <div className="inlineControls">
          <input
            id="student-name"
            name="name"
            autoComplete="name"
            value={name}
            onKeyDown={handleNameKeyDown}
            onChange={(event) => {
              setName(sanitizeNameInput(event.target.value));
              setLookup({ status: "idle" });
              setSaveResult(null);
              setError("");
            }}
            placeholder="Your name"
          />
          <button className="button primaryButton" type="submit" disabled={isLookingUp}>
            {isLookingUp ? "Checking" : "Continue"}
          </button>
        </div>
      </form>

      {lookup.status !== "idle" ? (
        <div className="responseGroup" aria-label="Yoga response">
          <button
            className="choiceButton yesChoice"
            type="button"
            onClick={() => saveCheckIn("yes")}
            disabled={isSaving}
          >
            Yes
          </button>
          <button
            className="choiceButton noChoice"
            type="button"
            onClick={() => saveCheckIn("no")}
            disabled={isSaving}
          >
            No
          </button>
        </div>
      ) : null}

      {lookup.status !== "idle" ? (
        <div className="identityStrip">
          <div>
            <p className="stripLabel">
              {lookup.status === "found" ? "Matched user" : "New user"}
            </p>
            <p className="stripValue">{lookup.name}</p>
          </div>
        </div>
      ) : null}

      {saveResult ? (
        <div className="successBlock" role="status">
          <p>
            {saveResult.action === "updated" ? "Updated" : "Saved"}{" "}
            {saveResult.response} for {saveResult.name} on {saveResult.date}.
          </p>
          <button className="button secondaryButton" type="button" onClick={resetFlow}>
            New check-in
          </button>
        </div>
      ) : null}

      {lookup.status !== "idle" ? (
        <SevenDayCheckInHistory entries={lookup.sevenDayCheckIns} />
      ) : null}

      {error ? <p className="statusMessage errorMessage">{error}</p> : null}
    </section>
  );
}
