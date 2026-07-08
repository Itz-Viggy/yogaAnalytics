import { createSign, randomUUID } from "node:crypto";

import { getSevenDayWindow, getTodayDate } from "@/lib/dates";
import { normalizeName, toDisplayName } from "@/lib/names";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SHEETS_API_BASE = "https://sheets.googleapis.com/v4/spreadsheets";
const SHEET_HEADERS = [
  "id",
  "name",
  "normalized_name",
  "date",
  "response",
  "created_at",
  "updated_at"
] as const;

export type CheckInResponse = "yes" | "no";

export type CheckInRow = {
  rowNumber: number;
  id: string;
  name: string;
  normalizedName: string;
  date: string;
  response: CheckInResponse;
  createdAt: string;
  updatedAt: string;
};

export type CheckInHistoryItem = {
  date: string;
  response: CheckInResponse | null;
};

type GoogleSheetsConfig = {
  serviceAccountEmail: string;
  privateKey: string;
  sheetId: string;
  tabName: string;
};

type ValuesResponse = {
  values?: string[][];
};

type TokenResponse = {
  access_token: string;
  expires_in: number;
};

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

export class SheetsConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SheetsConfigError";
  }
}

function getConfig(): GoogleSheetsConfig {
  const serviceAccountEmail =
    process.env.GOOGLE_CLIENT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const tabName = process.env.GOOGLE_SHEET_TAB_NAME || "Checkins";

  const missing = [
    ["GOOGLE_CLIENT_EMAIL", serviceAccountEmail],
    ["GOOGLE_PRIVATE_KEY", privateKey],
    ["GOOGLE_SHEET_ID", sheetId]
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new SheetsConfigError(
      `Missing Google Sheets environment variables: ${missing.join(", ")}.`
    );
  }

  return {
    serviceAccountEmail: serviceAccountEmail!,
    privateKey: privateKey!,
    sheetId: sheetId!,
    tabName
  };
}

function base64Url(input: Buffer | string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function getAccessToken(config: GoogleSheetsConfig) {
  const now = Math.floor(Date.now() / 1000);

  if (cachedToken && cachedToken.expiresAt > now + 60) {
    return cachedToken.accessToken;
  }

  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(
    JSON.stringify({
      iss: config.serviceAccountEmail,
      scope: "https://www.googleapis.com/auth/spreadsheets",
      aud: TOKEN_URL,
      exp: now + 3600,
      iat: now
    })
  );
  const unsignedJwt = `${header}.${payload}`;
  const signature = createSign("RSA-SHA256")
    .update(unsignedJwt)
    .sign(config.privateKey);
  const assertion = `${unsignedJwt}.${base64Url(signature)}`;

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google auth failed (${response.status}): ${body}`);
  }

  const data = (await response.json()) as TokenResponse;
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: now + data.expires_in
  };

  return data.access_token;
}

function sheetRange(tabName: string, cells: string) {
  const escapedTabName = tabName.replace(/'/g, "''");
  return `'${escapedTabName}'!${cells}`;
}

async function sheetsRequest<T>(
  config: GoogleSheetsConfig,
  path: string,
  init: RequestInit = {}
) {
  const accessToken = await getAccessToken(config);
  const response = await fetch(`${SHEETS_API_BASE}/${config.sheetId}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...init.headers
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google Sheets API failed (${response.status}): ${body}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function readValues(config: GoogleSheetsConfig, cells: string) {
  const range = sheetRange(config.tabName, cells);
  return sheetsRequest<ValuesResponse>(
    config,
    `/values/${encodeURIComponent(range)}`
  );
}

async function writeValues(
  config: GoogleSheetsConfig,
  cells: string,
  values: string[][]
) {
  const range = sheetRange(config.tabName, cells);
  return sheetsRequest(config, `/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`, {
    method: "PUT",
    body: JSON.stringify({
      majorDimension: "ROWS",
      values
    })
  });
}

async function ensureSheetHeaders(config: GoogleSheetsConfig) {
  const data = await readValues(config, "A1:G1");
  const firstRow = data.values?.[0];

  if (!firstRow || firstRow.length === 0) {
    await writeValues(config, "A1:G1", [[...SHEET_HEADERS]]);
    return;
  }

  const normalizedFirstRow = firstRow.map((cell) => cell.trim());
  const matchesExpectedHeaders = SHEET_HEADERS.every(
    (header, index) => normalizedFirstRow[index] === header
  );

  if (!matchesExpectedHeaders) {
    throw new Error(
      `Unexpected sheet headers. Expected: ${SHEET_HEADERS.join(", ")}.`
    );
  }
}

function parseSheetRow(row: string[], index: number): CheckInRow | null {
  const response = row[4]?.trim().toLocaleLowerCase("en-US");

  if (response !== "yes" && response !== "no") {
    return null;
  }

  return {
    rowNumber: index + 2,
    id: row[0] || "",
    name: row[1] || "",
    normalizedName: row[2] || normalizeName(row[1] || ""),
    date: row[3] || "",
    response,
    createdAt: row[5] || "",
    updatedAt: row[6] || ""
  };
}

export async function getCheckIns() {
  const config = getConfig();
  await ensureSheetHeaders(config);

  const data = await readValues(config, "A2:G");
  return (data.values || [])
    .map((row, index) => parseSheetRow(row, index))
    .filter((row): row is CheckInRow => Boolean(row));
}

function getSevenDayCheckInHistory(
  rows: CheckInRow[],
  normalizedName: string,
  endDate = getTodayDate()
): CheckInHistoryItem[] {
  const window = getSevenDayWindow(endDate);
  const windowDates = new Set(window.dates);
  const responseByDate = new Map<string, CheckInRow>();

  for (const row of rows) {
    if (row.normalizedName !== normalizedName || !windowDates.has(row.date)) {
      continue;
    }

    const current = responseByDate.get(row.date);

    if (!current || row.updatedAt.localeCompare(current.updatedAt) > 0) {
      responseByDate.set(row.date, row);
    }
  }

  return window.dates
    .slice()
    .reverse()
    .map((date) => ({
      date,
      response: responseByDate.get(date)?.response || null
    }));
}

export async function findUserByName(name: string) {
  const normalizedName = normalizeName(name);

  if (!normalizedName) {
    return {
      exists: false,
      normalizedName,
      name: toDisplayName(name),
      lastCheckInDate: null as string | null,
      sevenDayCheckIns: [] as CheckInHistoryItem[]
    };
  }

  const rows = await getCheckIns();
  const matches = rows.filter((row) => row.normalizedName === normalizedName);
  const sevenDayCheckIns = getSevenDayCheckInHistory(rows, normalizedName);
  const latest = matches
    .filter((row) => row.date)
    .sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt))
    .at(0);

  return {
    exists: Boolean(latest),
    normalizedName,
    name: latest?.name || toDisplayName(name),
    lastCheckInDate: latest?.date || null,
    sevenDayCheckIns
  };
}

export async function upsertCheckIn(input: {
  name: string;
  response: CheckInResponse;
  date?: string;
}) {
  const config = getConfig();
  await ensureSheetHeaders(config);

  const name = toDisplayName(input.name);
  const normalizedName = normalizeName(name);
  const date = input.date || getTodayDate();

  if (!normalizedName) {
    throw new Error("Name is required.");
  }

  const rows = await getCheckIns();
  const userRows = rows.filter((row) => row.normalizedName === normalizedName);
  const todayRow = userRows.find((row) => row.date === date);
  const timestamp = new Date().toISOString();

  if (todayRow) {
    const updatedRow = {
      ...todayRow,
      name,
      normalizedName,
      date,
      response: input.response,
      createdAt: todayRow.createdAt || timestamp,
      updatedAt: timestamp
    } satisfies CheckInRow;

    await writeValues(config, `A${todayRow.rowNumber}:G${todayRow.rowNumber}`, [
      [
        updatedRow.id,
        updatedRow.name,
        updatedRow.normalizedName,
        updatedRow.date,
        updatedRow.response,
        updatedRow.createdAt,
        updatedRow.updatedAt
      ]
    ]);

    const updatedRows = rows.map((row) =>
      row.rowNumber === todayRow.rowNumber ? updatedRow : row
    );

    return {
      action: "updated" as const,
      userStatus: "existing" as const,
      date,
      name,
      normalizedName,
      response: input.response,
      sevenDayCheckIns: getSevenDayCheckInHistory(updatedRows, normalizedName, date)
    };
  }

  const id = randomUUID();
  const newRow = {
    rowNumber: rows.length + 2,
    id,
    name,
    normalizedName,
    date,
    response: input.response,
    createdAt: timestamp,
    updatedAt: timestamp
  } satisfies CheckInRow;
  const row = [
    newRow.id,
    newRow.name,
    newRow.normalizedName,
    newRow.date,
    newRow.response,
    newRow.createdAt,
    newRow.updatedAt
  ];
  const appendRange = sheetRange(config.tabName, "A:G");

  await sheetsRequest(
    config,
    `/values/${encodeURIComponent(appendRange)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      body: JSON.stringify({
        majorDimension: "ROWS",
        values: [row]
      })
    }
  );

  return {
    action: "created" as const,
    userStatus: userRows.length > 0 ? ("existing" as const) : ("new" as const),
    date,
    name,
    normalizedName,
    response: input.response,
    sevenDayCheckIns: getSevenDayCheckInHistory([...rows, newRow], normalizedName, date)
  };
}
