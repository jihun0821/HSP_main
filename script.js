
const toggleThemeBtn = document.getElementById("toggleThemeBtn");
const matchDetailsPanel = document.getElementById("matchDetailsPanel");
const overlay = document.getElementById("overlay");
const closePanelBtn = document.getElementById("closePanelBtn");
const panelContent = document.getElementById("panelContent");
const panelTitle = document.getElementById("panelTitle");

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
};

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

function loadMatchDetails(matchId) {
    const matchDetails = getMatchDetailsById(matchId);
    panelTitle.textContent = `${matchDetails.homeTeam} vs ${matchDetails.awayTeam}`;

    let predictionHtml = '';
    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    }
    
    function getVotingStats(matchId) {
        return {
            home: 0,
            draw: 0,
            away: 0,
            total: 0
        };
    }
    
    if (matchDetails.status === "scheduled") {
        predictionHtml = `
            <div class="prediction-container">
                <h3>승부예측</h3>
                <div id="votingStats">
                    <p>승부예측 기능이 현재 비활성화되었습니다.</p>
                </div>
            </div>
        `;
    } else if (matchDetails.status === "live") {
        predictionHtml = `
            <div class="prediction-container">
                <h3>승부예측 결과</h3>
                <div id="votingStats">
                    <p>승부예측 기능이 현재 비활성화되었습니다.</p>
                </div>
            </div>
        `;
    } else {
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
                        ? '<img src="images/c103-logo.jpg" alt="C103 팀 로고" style="width: 100%; height: 100%; object-fit: cover;">'
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
                        ? '<img src="images/c103-logo.jpg" alt="C103 팀 로고" style="width: 100%; height: 100%; object-fit: cover;">'
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

    const tabs = panelContent.querySelectorAll('.tab');
    const tabContents = panelContent.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            tabContents.forEach(content => {
                content.style.display = 'none';
            });
            
            const tabName = this.getAttribute('data-tab');
            const activeTabContent = document.getElementById(tabName + 'Tab');
            if (activeTabContent) {
                activeTabContent.style.display = 'block';
            }
        });
    });
}

function setupMatchClickListeners() {
    const matches = document.querySelectorAll('.match');
    matches.forEach(match => {
        match.addEventListener('click', () => {
            openPanel(match.getAttribute('data-match-id'));
        });
    });

    closePanelBtn.addEventListener('click', closePanel);
    overlay.addEventListener('click', closePanel);
}
