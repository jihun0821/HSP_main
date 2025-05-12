// matchData.js
const matchesData = {
    "1": {
        id: "1",
        homeTeam: "C103",
        awayTeam: "C104",
        homeScore: 2,
        awayScore: 1,
        date: "2025-04-21",
        league: "호실축구",
        status: "finished",
        stats: {
            homePossession: 55,
            awayPossession: 45,
            homeShots: 12,
            awayShots: 8
        },
        events: [
            { time: 12, type: "goal", player: "조우준", detail: "C103 선제골" },
            { time: 34, type: "card", player: "홍현수", detail: "옐로카드" },
            { time: 67, type: "goal", player: "소하윤", detail: "C104 동점골" },
            { time: 85, type: "goal", player: "김주현", detail: "C103 추가골" }
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
        homeTeam: "1반",
        awayTeam: "3반",
        homeScore: 0,
        awayScore: 1,
        date: "2025-04-20",
        league: "체육대회",
        status: "finished",
        stats: {
            homePossession: 40,
            awayPossession: 60,
            homeShots: 5,
            awayShots: 15
        },
        events: [
            { time: 78, type: "goal", player: "손준후", detail: "3반 선제골" }
        ],
        lineups: {
            home: {
                gk: ["1"],
                df: ["2", "3", "4", "5"],
                mf: ["6", "7", "8"],
                at: ["9", "10", "11"]
            },
            away: {
                gk: ["골키퍼"],
                df: ["수비수1", "수비수2", "수비수3", "수비수4"],
                mf: ["미드필더1", "미드필더2", "미드필더3"],
                at: ["공격수1", "공격수2", "공격수3"]
            }
        }
    },
    "3": {
        id: "3",
        homeTeam: "C105",
        awayTeam: "C106",
        homeScore: 1,
        awayScore: 1,
        date: "현재 진행중",
        league: "친선 경기",
        status: "live",
        stats: {
            homePossession: 50,
            awayPossession: 50,
            homeShots: 7,
            awayShots: 7
        },
        events: [
            { time: 15, type: "goal", player: "정현", detail: "C105 선제골" },
            { time: 42, type: "goal", player: "박민성", detail: "C106 동점골" }
        ],
        lineups: {
            home: {
                gk: ["김골키퍼"],
                df: ["수비수1", "수비수2", "수비수3", "수비수4"],
                mf: ["미드필더1", "미드필더2", "미드필더3"],
                at: ["공격수1", "공격수2", "공격수3"]
            },
            away: {
                gk: ["이골키퍼"],
                df: ["이수비1", "이수비2", "이수비3", "이수비4"],
                mf: ["이미드1", "이미드2", "이미드3"],
                at: ["이공격1", "이공격2", "이공격3"]
            }
        }
    },
    "4": {
        id: "4",
        homeTeam: "C207",
        awayTeam: "C301",
        homeScore: 0,
        awayScore: 0,
        date: "2025-04-23",
        league: "현제관의 날",
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
                gk: ["예상 골키퍼"],
                df: ["예상 수비수1", "예상 수비수2", "예상 수비수3", "예상 수비수4"],
                mf: ["예상 미드필더1", "예상 미드필더2", "예상 미드필더3"],
                at: ["예상 공격수1", "예상 공격수2", "예상 공격수3"]
            },
            away: {
                gk: ["예상 골키퍼"],
                df: ["예상 수비수1", "예상 수비수2", "예상 수비수3", "예상 수비수4"],
                mf: ["예상 미드필더1", "예상 미드필더2", "예상 미드필더3"],
                at: ["예상 공격수1", "예상 공격수2", "예상 공격수3"]
            }
        }
    },
    "5": {
        id: "5",
        homeTeam: "C306",
        awayTeam: "C105",
        homeScore: 0,
        awayScore: 0,
        date: "2025-04-25",
        league: "호실축구 리그",
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
                gk: ["예상 골키퍼"],
                df: ["예상 수비수1", "예상 수비수2", "예상 수비수3", "예상 수비수4"],
                mf: ["예상 미드필더1", "예상 미드필더2", "예상 미드필더3"],
                at: ["예상 공격수1", "예상 공격수2", "예상 공격수3"]
            },
            away: {
                gk: ["예상 골키퍼"],
                df: ["예상 수비수1", "예상 수비수2", "예상 수비수3", "예상 수비수4"],
                mf: ["예상 미드필더1", "예상 미드필더2", "예상 미드필더3"],
                at: ["예상 공격수1", "예상 공격수2", "예상 공격수3"]
            }
        }
    }
};

// 기본 매치 정보 템플릿
const defaultMatch = {
    id: "",
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

// 팀 데이터
const teamsData = {
    "C103": {
        name: "C103",
        logo: "images/c103-logo.jpg",
        players: {
            "1": { name: "조우준", position: "FW" },
            "2": { name: "김주현", position: "MF" },
            // 추가 선수 정보...
        }
    },
    "C104": {
        name: "C104",
        logo: "images/c104-logo.jpg",
        players: {
            "1": { name: "소하윤", position: "FW" },
            "2": { name: "홍현수", position: "DF" },
            // 추가 선수 정보...
        }
    },
    // 추가 팀 정보...
};

// 모듈로 내보내기
export { matchesData, defaultMatch, teamsData };
