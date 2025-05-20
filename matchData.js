function getMatchDetailsById(matchId) {
  const matchesData = {
        "1": {
            id: "1",
            homeTeam: "---",
            awayTeam: "---",
            homeScore: 0,
            awayScore: 0,
            date: "2025-xx-xx",
            league: "----",
            status: "finished",
            stats: {
                homePossession: 55,
                awayPossession: 45,
                homeShots: 12,
                awayShots: 8
            },
            events: [
            ],
            lineups: {
                home: {
                    gk: ["1"],
                    df: ["2", "3", "4", "5"],
                    mf: ["6", "7", "8"],
                    at: ["9", "10", "11"]
                },
                away: {
                    gk: ["12"],
                    df: ["13", "14", "15", "16"],
                    mf: ["17", "18", "19"],
                    at: ["20", "21", "22"]
                }
            }
        },
        "2": {
            id: "2",
            homeTeam: "---",
            awayTeam: "---",
            homeScore: 0,
            awayScore: 0,
            date: "2025-xx-xx",
            league: "----",
            status: "finished",
            stats: {
                homePossession: 40,
                awayPossession: 60,
                homeShots: 5,
                awayShots: 15
            },
            events: [
            ],
            lineups: {
                home: {
                    gk: ["1"],
                    df: ["2", "3", "4", "5"],
                    mf: ["6", "7", "8"],
                    at: ["9", "10", "11"]
                },
                away: {
                    gk: ["12"],
                    df: ["13", "14", "15", "16"],
                    mf: ["17", "18", "19"],
                    at: ["20", "21", "22"]
                }
            }
        },
        "3": {
            id: "3",
            homeTeam: "---",
            awayTeam: "---",
            homeScore: 0,
            awayScore: 0,
            date: "---",
            league: "----",
            status: "live",
            stats: {
                homePossession: 50,
                awayPossession: 50,
                homeShots: 7,
                awayShots: 7
            },
            events: [
            ],
            lineups: {
                home: {
                    gk: ["1"],
                    df: ["2", "3", "4", "5"],
                    mf: ["6", "7", "8"],
                    at: ["9", "10", "11"]
                },
                away: {
                    gk: ["12"],
                    df: ["13", "14", "15", "16"],
                    mf: ["17", "18", "19"],
                    at: ["20", "21", "22"]
                }
            }
        },
        "4": {
            id: "4",
            homeTeam: "---",
            awayTeam: "---",
            homeScore: 0,
            awayScore: 0,
            date: "2025-xx-xx",
            league: "----",
            status: "scheduled",
            stats: {
                homePossession: 50,
                awayPossession: 50,
                homeShots: 0,
                awayShots: 0
            },
            events: [],
            lineups: {
                home: {
                    gk: [""],
                    df: ["", "", "", ""],
                    mf: ["", "", ""],
                    at: ["", "", ""]
                },
                away: {
                    gk: [""],
                    df: ["", "", "", ""],
                    mf: ["", "", ""],
                    at: ["", "", ""]
                }
            }
        },
        "5": {
            id: "5",
            homeTeam: "---",
            awayTeam: "---",
            homeScore: 0,
            awayScore: 0,
            date: "2025-xx-xx",
            league: "----",
            status: "scheduled",
            stats: {
                homePossession: 50,
                awayPossession: 50,
                homeShots: 0,
                awayShots: 0
            },
            events: [],
            lineups: {
                home: {
                    gk: [""],
                    df: ["", "", "", ""],
                    mf: ["", "", ""],
                    at: ["", "", ""]
                },
                away: {
                    gk: [""],
                    df: ["", "", "", ""],
                    mf: ["", "", ""],
                    at: ["", "", ""]
                }
            }
        }
    };

    const defaultMatch = {
        id: matchId,
        homeTeam: "알 수 없음",
        awayTeam: "알 수 없음",
        homeScore: 0,
        awayScore: 0,
        date: "날짜 정보 없음",
        league: "리그 정보 없음",
        status: "unknown",
        stats: {
            homePossession: 50,
            awayPossession: 50,
            homeShots: 0,
            awayShots: 0
        },
        events: [],
        lineups: {
            home: {
                gk: [""],
                df: ["", ""],
                mf: ["", "", ""],
                at: ["", ""]
            },
            away: {
                gk: [""],
                df: ["", ""],
                mf: ["", "", ""],
                at: ["", ""]
            }
        }
    };

    return matchesData[matchId] || defaultMatch;
  }
