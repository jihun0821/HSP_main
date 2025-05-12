// const loginBtn = document.getElementById("loginBtn");
// const logoutBtn = document.getElementById("logoutBtn");
// const addMatchBtn = document.getElementById("addMatchBtn");

// if (loginBtn && logoutBtn && addMatchBtn) {
    // loginBtn.addEventListener("click", () => {
        // loginBtn.style.display = "none";
        // logoutBtn.style.display = "inline-block";
        // addMatchBtn.style.display = "inline-block";
    // });

    // logoutBtn.addEventListener("click", () => {
        // loginBtn.style.display = "inline-block";
        // logoutBtn.style.display = "none";
        // addMatchBtn.style.display = "none";
    // });
// }

const toggleThemeBtn = document.getElementById("toggleThemeBtn");

window.onload = function() {
    const savedTheme = localStorage.getItem("theme");
    const body = document.body;

    if (savedTheme === "light") {
        body.classList.add("light-mode");
        toggleThemeBtn.textContent = "☀️"; 
    } else {
        body.classList.remove("light-mode");
        toggleThemeBtn.textContent = "🌙"; 
    }

    setupMatchClickListeners();
}

toggleThemeBtn?.addEventListener("click", () => {
    document.body.classList.toggle("light-mode");

    if (document.body.classList.contains("light-mode")) {
        localStorage.setItem("theme", "light");
        toggleThemeBtn.textContent = "☀️"; 
    } else {
        localStorage.setItem("theme", "dark");
        toggleThemeBtn.textContent = "🌙"; 
    }
});

const matchDetailsPanel = document.getElementById("matchDetailsPanel");
const overlay = document.getElementById("overlay");
const closePanelBtn = document.getElementById("closePanelBtn");
const panelContent = document.getElementById("panelContent");
const panelTitle = document.getElementById("panelTitle");

function openPanel(matchId) {
    loadMatchDetails(matchId);
    matchDetailsPanel.classList.add("active");
    overlay.classList.add("active");
    document.body.style.overflow = "hidden";
}

function closePanel() {
    matchDetailsPanel.classList.remove("active");
    overlay.classList.remove("active");
    document.body.style.overflow = "";
}

// 쿠키 관련 유틸리티 함수
function setCookie(name, value, days) {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

// 투표 상태 로드 함수
function getVotingStats(matchId) {
    // 무력화된 함수 - 일관된 값을 반환
    return {
        homeWin: 0,
        draw: 0,
        awayWin: 0,
        total: 0
    };
}

// 투표 결과 저장 함수
function saveVote(matchId, voteType) {
    // 무력화된 함수 - 아무것도 하지 않고 기본값 반환
    return {
        homeWin: 0,
        draw: 0,
        awayWin: 0,
        total: 0
    };
}

// 투표 그래프 렌더링 함수
function renderVotingGraph(container, stats) {
    // 무력화된 함수 - 메시지만 표시
    container.innerHTML = `
        <div class="voting-stats-disabled">
            <p>승부예측 기능이 현재 비활성화되었습니다.</p>
        </div>
    `;
}

function loadMatchDetails(matchId) {
    const matchDetails = getMatchDetailsById(matchId);
    panelTitle.textContent = `${matchDetails.homeTeam} vs ${matchDetails.awayTeam}`;

    // 경기 상태에 따른 html 생성 (이미 끝난 경기, 진행 중인 경기, 예정된 경기)
    let predictionHtml = '';
    const userVote = getCookie(`voted_${matchId}`);
    const votingStats = getVotingStats(matchId);
    
    if (matchDetails.status === "scheduled") {
        // 예정된 경기: 투표 기능 비활성화 메시지
        predictionHtml = `
            <div class="prediction-container">
                <h3>승부예측</h3>
                <div id="votingStats">
                    <p>승부예측 기능이 현재 비활성화되었습니다.</p>
                </div>
            </div>
        `;
    } else if (matchDetails.status === "live") {
        // 진행중인 경기: 투표 기능 비활성화 메시지
        predictionHtml = `
            <div class="prediction-container">
                <h3>승부예측 결과</h3>
                <div id="votingStats">
                    <p>승부예측 기능이 현재 비활성화되었습니다.</p>
                </div>
            </div>
        `;
    } else {
        // 종료된 경기: 투표 기능 비활성화 메시지
        predictionHtml = `
            <div class="prediction-container">
                <h3>승부예측 결과</h3>
                <div id="votingStats">
                    <p>승부예측 기능이 현재 비활성화되었습니다.</p>
                </div>
            </div>
        `;
    }

    panelContent.innerHTML = `
        <div class="match-detail-header">
            <div class="match-date">${matchDetails.date}</div>
            <div class="match-league">${matchDetails.league}</div>
        </div>

        <div class="match-score">
            <div class="team-info">
                <div class="team-logo">
                    ${
                        matchDetails.homeTeam === 'C103'
                        ? '<img src="https://github.com/jihun0821/test_1/issues/2#issue-3055582481" alt="C103 팀 로고" style="width: 100%; height: 100%; object-fit: cover;">'
                        : matchDetails.homeTeam === 'C104'
                        ? '<img src="images/c104-logo.jpg" alt="C104 팀 로고" style="width: 100%; height: 100%; object-fit: cover;">'
                        : `<span>${matchDetails.homeTeam.charAt(0)}</span>`
                    }
                </div>
                <div class="team-name">${matchDetails.homeTeam}</div>
            </div>

            <div class="score-display">
                ${matchDetails.homeScore} - ${matchDetails.awayScore}
            </div>

            <div class="team-info">
                <div class="team-logo">
                    ${
                        matchDetails.awayTeam === 'C103'
                        ? '<img src="https://github.com/jihun0821/test_1/issues/2#issue-3055582481" alt="C103 팀 로고" style="width: 100%; height: 100%; object-fit: cover;">'
                        : matchDetails.awayTeam === 'C104'
                        ? '<img src="images/c104-logo.jpg" alt="C104 팀 로고" style="width: 100%; height: 100%; object-fit: cover;">'
                        : `<span>${matchDetails.awayTeam.charAt(0)}</span>`
                    }
                </div>
                <div class="team-name">${matchDetails.awayTeam}</div>
            </div>
        </div>

        ${predictionHtml}

        <!-- 슈팅 통계 비활성화 -->
        <div class="match-stats" style="display: none;">
            <div class="stat-row">
                <div class="stat-value">${matchDetails.stats.homeShots}</div>
                <div class="stat-bar">
                    <div class="home-stat" style="width: ${(matchDetails.stats.homeShots / (matchDetails.stats.homeShots + matchDetails.stats.awayShots)) * 100}%"></div>
                    <div class="away-stat" style="width: ${(matchDetails.stats.awayShots / (matchDetails.stats.homeShots + matchDetails.stats.awayShots)) * 100}%"></div>
                </div>
                <div class="stat-value">${matchDetails.stats.awayShots}</div>
            </div>
            <div class="stat-label">슈팅</div>
        </div>

        <div class="tab-container">
            <div class="tabs">
                <div class="tab active" data-tab="timeline">타임라인</div>
                <div class="tab" data-tab="lineups">라인업</div>
                <div class="tab" data-tab="stats">통계</div>
            </div>

            <div class="tab-content" id="timelineTab">
                ${matchDetails.events.map(event => `
                    <div class="event">
                        <div class="event-icon">${event.type === 'goal' ? '⚽' : event.type === 'card' ? '🟨' : '🔄'}</div>
                        <div class="event-info">
                            <div class="player-name">${event.player}</div>
                            <div class="event-detail">${event.detail}</div>
                        </div>
                    </div>
                `).join('')}
            </div>

            <div class="tab-content" id="lineupsTab" style="display: none;">
                <div class="lineups-container">
                    <div class="lineups-teams">
                        <div class="lineup-team home-lineup">
                            <h3>${matchDetails.homeTeam}</h3>
                            <div class="field-container">
                                <div class="position-group">
                                    <div class="position-label">GK</div>
                                    <div class="players-list">
                                        ${matchDetails.lineups.home.gk.map(player => `<div class="player">${player}</div>`).join('')}
                                    </div>
                                </div>
                                <div class="position-group">
                                    <div class="position-label">DF</div>
                                    <div class="players-list">
                                        ${matchDetails.lineups.home.df.map(player => `<div class="player">${player}</div>`).join('')}
                                    </div>
                                </div>
                                <div class="position-group">
                                    <div class="position-label">MF</div>
                                    <div class="players-list">
                                        ${matchDetails.lineups.home.mf.map(player => `<div class="player">${player}</div>`).join('')}
                                    </div>
                                </div>
                                <div class="position-group">
                                    <div class="position-label">AT</div>
                                    <div class="players-list">
                                        ${matchDetails.lineups.home.at.map(player => `<div class="player">${player}</div>`).join('')}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="lineup-team away-lineup">
                            <h3>${matchDetails.awayTeam}</h3>
                            <div class="field-container">
                                <div class="position-group">
                                    <div class="position-label">GK</div>
                                    <div class="players-list">
                                        ${matchDetails.lineups.away.gk.map(player => `<div class="player">${player}</div>`).join('')}
                                    </div>
                                </div>
                                <div class="position-group">
                                    <div class="position-label">DF</div>
                                    <div class="players-list">
                                        ${matchDetails.lineups.away.df.map(player => `<div class="player">${player}</div>`).join('')}
                                    </div>
                                </div>
                                <div class="position-group">
                                    <div class="position-label">MF</div>
                                    <div class="players-list">
                                        ${matchDetails.lineups.away.mf.map(player => `<div class="player">${player}</div>`).join('')}
                                    </div>
                                </div>
                                <div class="position-group">
                                    <div class="position-label">AT</div>
                                    <div class="players-list">
                                        ${matchDetails.lineups.away.at.map(player => `<div class="player">${player}</div>`).join('')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="tab-content" id="statsTab" style="display: none;">
                <div class="additional-stats">
                    <h3>경기 통계</h3>
                    <p>통계 정보가 현재 비활성화되었습니다.</p>
                </div>
            </div>
        </div>
    `;

    // 투표 관련 이벤트 리스너는 모두 제거 (버튼이 없기 때문)

    // Modified tab click handling
    const tabs = panelContent.querySelectorAll('.tab');
    const tabContents = panelContent.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove active class from all tabs
            tabs.forEach(t => t.classList.remove('active'));
            // Add active class to clicked tab
            this.classList.add('active');
            
            // Hide all tab contents
            tabContents.forEach(content => {
                content.style.display = 'none';
            });
            
            // Show selected tab content
            const tabName = this.getAttribute('data-tab');
            const activeTabContent = document.getElementById(tabName + 'Tab');
            if (activeTabContent) {
                activeTabContent.style.display = 'block';
            }
        });
    });
}

function getMatchDetailsById(matchId) {
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
                { type: "goal", player: "조우준", detail: "C103 선제골" },
                { type: "card", player: "홍현수", detail: "옐로카드" },
                { type: "goal", player: "소하윤", detail: "C104 동점골" },
                { type: "goal", player: "김주현", detail: "C103 추가골" }
            ],
            // Add lineup data
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
        // Add lineup data to other matches
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
                { type: "goal", player: "손준후", detail: "3반 선제골" }
            ],
            lineups: {
                home: {
                    gk: ["1"],
                    df: ["2", "3", "4", "5"],
                    mf: ["6", "7", "8"],
                    at: ["9", "10", "11"]
                },
                away: {
                    gk: [""],
                    df: ["", "", "", ""],
                    mf: ["", "", ""],
                    at: ["", "", ""]
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
                    gk: ["1"],
                    df: ["2", "3", "4", "5"],
                    mf: ["6", "7", "8"],
                    at: ["9", "10", "11"]
                },
                away: {
                    gk: [""],
                    df: ["", "", "", ""],
                    mf: ["", "", ""],
                    at: ["", "", ""]
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

function setupMatchClickListeners() {
    const matches = document.querySelectorAll('.match');
    matches.forEach(match => {
        match.addEventListener('click', () => {
            const matchId = match.getAttribute('data-match-id');
            openPanel(matchId);
        });
    });

    closePanelBtn.addEventListener('click', closePanel);
    overlay.addEventListener('click', closePanel);
}
