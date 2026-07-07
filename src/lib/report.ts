import { getSevenDayWindow, isWithinDateWindow } from "@/lib/dates";
import type { CheckInResponse, CheckInRow } from "@/lib/sheets";

export type UserReport = {
  name: string;
  normalizedName: string;
  yesCount: number;
  noCount: number;
  totalCount: number;
  yesDates: string[];
  noDates: string[];
  responsesByDate: Partial<Record<string, CheckInResponse>>;
  goldStar: boolean;
};

export type ReportResult = {
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

export function buildReport(rows: CheckInRow[], endDate: string): ReportResult {
  const window = getSevenDayWindow(endDate);
  const grouped = new Map<string, UserReport>();

  for (const row of rows) {
    if (!isWithinDateWindow(row.date, window.startDate, window.endDate)) {
      continue;
    }

    const existing =
      grouped.get(row.normalizedName) ||
      ({
        name: row.name,
        normalizedName: row.normalizedName,
        yesCount: 0,
        noCount: 0,
        totalCount: 0,
        yesDates: [],
        noDates: [],
        responsesByDate: {},
        goldStar: false
      } satisfies UserReport);

    existing.name = row.name || existing.name;
    existing.totalCount += 1;
    existing.responsesByDate[row.date] = row.response;

    if (row.response === "yes") {
      existing.yesCount += 1;
      existing.yesDates.push(row.date);
    } else {
      existing.noCount += 1;
      existing.noDates.push(row.date);
    }

    grouped.set(row.normalizedName, existing);
  }

  const users = Array.from(grouped.values()).map((user) => ({
    ...user,
    yesDates: user.yesDates.sort(),
    noDates: user.noDates.sort(),
    goldStar: user.yesCount >= 5
  }));

  users.sort((a, b) => {
    if (a.goldStar !== b.goldStar) {
      return a.goldStar ? -1 : 1;
    }

    if (a.yesCount !== b.yesCount) {
      return b.yesCount - a.yesCount;
    }

    return a.name.localeCompare(b.name);
  });

  return {
    window,
    summary: {
      userCount: users.length,
      goldStarCount: users.filter((user) => user.goldStar).length,
      yesCount: users.reduce((total, user) => total + user.yesCount, 0),
      noCount: users.reduce((total, user) => total + user.noCount, 0)
    },
    users
  };
}
