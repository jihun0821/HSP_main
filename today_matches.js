// 오늘의 경기 관리
class TodayMatchManager {
    constructor() {
        this.todayMatches = [];
        this.currentMatchIndex = 0;
        this.db = null;
        this.auth = null;
        this.initialized = false;
        this.chatUnsubscribe = null;
    }

    // Firebase 초기화 대기
    async waitForFirebase() {
        return new Promise((resolve) => {
            const checkFirebase = () => {
                if (window.firebase && window.db && window.auth) {
                    this.db = window.db;
                    this.auth = window.auth;
                    this.initialized = true;
                    console.log("TodayMatchManager - Firebase 초기화 완료");
                    resolve();
                } else {
                    setTimeout(checkFirebase, 100);
                }
            };
            checkFirebase();
        });
    }

    // 오늘 날짜를 YYYY-MM-DD 형식으로 반환
    getTodayDateString() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // 날짜 문자열을 비교 가능한 형식으로 변환
    normalizeDate(dateStr) {
        if (!dateStr) return '';
        
        if (dateStr.includes('.')) {
            return dateStr.replace(/\./g, '-');
        }
        if (dateStr.includes('/')) {
            return dateStr.replace(/\//g, '-');
        }
        if (/^\d{2}\/\d{2}$/.test(dateStr)) {
            const currentYear = new Date().getFullYear();
            return `${currentYear}-${dateStr.replace('/', '-')}`;
        }
        if (/^\d{1,2}\/\d{1,2}$/.test(dateStr)) {
            const currentYear = new Date().getFullYear();
            const [month, day] = dateStr.split('/');
            return `${currentYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        
        return dateStr;
    }

    // Firestore에서 오늘의 경기 가져오기
    async loadTodayMatches() {
        if (!this.initialized) {
            await this.waitForFirebase();
        }

        try {
            const todayStr = this.getTodayDateString();
            console.log("오늘 날짜:", todayStr);

            const querySnapshot = await window.firebase.getDocs(
                window.firebase.collection(this.db, "matches")
            );

            const allMatches = [];
            querySnapshot.forEach((doc) => {
                const matchData = { id: doc.id, ...doc.data() };
                allMatches.push(matchData);
            });

            console.log("전체 경기 수:", allMatches.length);

            this.todayMatches = allMatches.filter(match => {
                const normalizedDate = this.normalizeDate(match.date);
                const isToday = normalizedDate === todayStr;
                
                if (isToday) {
                    console.log("오늘의 경기 발견:", match);
                }
                
                return isToday;
            });

            console.log("오늘의 경기 수:", this.todayMatches.length);

            this.todayMatches.sort((a, b) => {
                if (a.time && b.time) {
                    return a.time.localeCompare(b.time);
                }
                return 0;
            });

            return this.todayMatches.length > 0;
        } catch (error) {
            console.error("오늘의 경기 로드 실패:", error);
            return false;
        }
    }

    // UI 업데이트 메서드
    updateTodayMatchUI() {
        const matchDate = document.getElementById('matchDate');
        const matchTeams = document.getElementById('matchTeams');
        const matchScore = document.getElementById('matchScore');
        const matchStatus = document.getElementById('matchStatus');
        const noMatches = document.getElementById('noMatches');
        const matchDisplay = document.getElementById('matchDisplay');

        if (this.todayMatches.length === 0) {
            if (matchDisplay) matchDisplay.style.display = 'none';
            if (noMatches) noMatches.style.display = 'block';
            return;
        }

        if (matchDisplay) matchDisplay.style.display = 'flex';
        if (noMatches) noMatches.style.display = 'none';

        const currentMatch = this.todayMatches[this.currentMatchIndex];
    
        if (matchDate) {
            matchDate.textContent = currentMatch.date;
        }
    
        if (matchTeams) {
            matchTeams.textContent = `${currentMatch.homeTeam} vs ${currentMatch.awayTeam}`;
        }

        this.updateNavigationButtons();
    }

    // 내비게이션 버튼 상태 업데이트
    updateNavigationButtons() {
        const prevBtn = document.getElementById('prevMatch');
        const nextBtn = document.getElementById('nextMatch');

        if (prevBtn) {
            prevBtn.disabled = this.currentMatchIndex === 0;
            prevBtn.style.opacity = this.currentMatchIndex === 0 ? '0.3' : '1';
        }

        if (nextBtn) {
            nextBtn.disabled = this.currentMatchIndex >= this.todayMatches.length - 1;
            nextBtn.style.opacity = this.currentMatchIndex >= this.todayMatches.length - 1 ? '0.3' : '1';
        }
    }

    // 이전 경기로 이동
    showPreviousMatch() {
        if (this.currentMatchIndex > 0) {
            this.currentMatchIndex--;
            this.updateTodayMatchUI();
        }
    }

    // 다음 경기로 이동
    showNextMatch() {
        if (this.currentMatchIndex < this.todayMatches.length - 1) {
            this.currentMatchIndex++;
            this.updateTodayMatchUI();
        }
    }

    // 현재 경기 클릭 시 상세 모달 열기
    openCurrentMatchDetails() {
        if (this.todayMatches.length > 0) {
            const currentMatch = this.todayMatches[this.currentMatchIndex];
            console.log("경기 상세 모달 열기:", currentMatch.id);
            this.loadMatchDetails(currentMatch.id);
        }
    }

    // 경기 상세 정보 로딩
    async loadMatchDetails(matchId) {
        const matchDetailsPanel = document.getElementById("matchDetailsPanel");
        const overlay = document.getElementById("overlay");
        const panelTitle = document.getElementById("panelTitle");
        const panelContent = document.getElementById("panelContent");

        if (!matchDetailsPanel || !overlay || !panelTitle || !panelContent) {
            console.error("경기 상세 패널 요소를 찾을 수 없습니다.");
            return;
        }

        const matchDetails = await this.getMatchDetailsById(matchId);
        if (!matchDetails) return;
        
        panelTitle.textContent = `${matchDetails.homeTeam} vs ${matchDetails.awayTeam}`;

        const isLoggedIn = !!(this.auth.currentUser);
        const userVoted = isLoggedIn ? await this.hasUserVoted(matchId) : false;
        const stats = await this.getVotingStatsFromFirestore(matchId);

        let predictionHtml = "";
        
        let isAdmin = false;
        if (isLoggedIn) {
            try {
                const adminDocRef = window.firebase.doc(this.db, "admins", this.auth.currentUser.email);
                const adminDoc = await window.firebase.getDoc(adminDocRef);
                isAdmin = adminDoc.exists();
            } catch (error) {
                console.error("관리자 권한 확인 실패:", error);
            }
        }

        // 관리자 수정 버튼 (상태 무관하게 항상 표시)
        const adminEditBtn = isAdmin ? `
            <button
                class="admin-edit-match-btn"
                onclick="todayMatchManager.openEditMatchModal('${matchId}')"
                style="
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    gap:6px;
                    margin: 0 auto 14px auto;
                    padding: 8px 22px;
                    background: #1a1a2e;
                    color: #fff;
                    border: 1.5px solid #27AE60;
                    border-radius: 8px;
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                    letter-spacing: 0.3px;
                    transition: background 0.2s, transform 0.1s;
                "
                onmouseover="this.style.background='#27AE60'"
                onmouseout="this.style.background='#1a1a2e'"
                onmousedown="this.style.transform='scale(0.97)'"
                onmouseup="this.style.transform='scale(1)'"
            >
                ✏️ 경기 수정 (관리자)
            </button>
        ` : '';
        
        if (matchDetails.status === "finished" && isAdmin && !matchDetails.adminResult) {
            predictionHtml = `
                ${adminEditBtn}
                <h3>경기 결과 설정 (관리자)</h3>
                <div class="admin-result-btns">
                    <button class="admin-result-btn home-win" onclick="todayMatchManager.setMatchResult('${matchId}', 'homeWin')">홈팀 승</button>
                    <button class="admin-result-btn draw" onclick="todayMatchManager.setMatchResult('${matchId}', 'draw')">무승부</button>
                    <button class="admin-result-btn away-win" onclick="todayMatchManager.setMatchResult('${matchId}', 'awayWin')">원정팀 승</button>
                </div>
                <h3>승부예측 결과</h3><div id="votingStats"></div>
            `;
        } else if (matchDetails.status === "finished" && matchDetails.adminResult) {
            const resultText = {
                'homeWin': '홈팀 승',
                'draw': '무승부', 
                'awayWin': '원정팀 승'
            }[matchDetails.adminResult] || '결과 미정';
            
            predictionHtml = `
                ${adminEditBtn}
                <h3>경기 결과: ${resultText}</h3>
                <h3>승부예측 결과</h3><div id="votingStats"></div>
            `;
        } else if (matchDetails.status === "scheduled") {
            if (!isLoggedIn || userVoted) {
                predictionHtml = `${adminEditBtn}<h3>승부예측 결과</h3><div id="votingStats"></div>`;
            } else {
                predictionHtml = `
                    ${adminEditBtn}
                    <h3>승부예측</h3>
                    <div class="prediction-btns">
                        <button class="prediction-btn home-win" data-vote="homeWin">1</button>
                        <button class="prediction-btn draw" data-vote="draw">X</button>
                        <button class="prediction-btn away-win" data-vote="awayWin">2</button>
                    </div>`;
            }
        } else {
            predictionHtml = `${adminEditBtn}<h3>승부예측 결과</h3><div id="votingStats"></div>`;
        }

        panelContent.innerHTML = `
            <div class="match-date">${matchDetails.date}</div>
            <div class="match-league">${matchDetails.league}</div>
            <div class="match-score">
                <div class="team-name">${matchDetails.homeTeam}</div>
                <div class="score-display">${matchDetails.homeScore} - ${matchDetails.awayScore}</div>
                <div class="team-name">${matchDetails.awayTeam}</div>
            </div>
            <div class="prediction-container">${predictionHtml}</div>
            ${await this.renderPanelTabs(matchDetails, matchId)}
        `;

        const statsContainer = panelContent.querySelector('#votingStats');
        if (statsContainer) this.renderVotingGraph(statsContainer, stats);

        this.setupPanelTabs(matchId);

        const buttons = panelContent.querySelectorAll('.prediction-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', async () => {
                const voteType = btn.getAttribute("data-vote");
                const success = await this.saveVoteToFirestore(matchId, voteType);
                if (success) {
                    const updatedStats = await this.getVotingStatsFromFirestore(matchId);
                    const container = btn.closest('.prediction-container');
                    container.innerHTML = `<h3>승부예측 결과</h3><div id="votingStats"></div>`;
                    this.renderVotingGraph(container.querySelector('#votingStats'), updatedStats);
                }
            });
        });

        matchDetailsPanel.classList.add("active");
        overlay.classList.add("active");
        document.body.style.overflow = "hidden";
    }

    // Firestore에서 단일 경기 정보 가져오기
    async getMatchDetailsById(matchId) {
        try {
            const docRef = window.firebase.doc(this.db, "matches", matchId);
            const docSnap = await window.firebase.getDoc(docRef);
            
            if (docSnap.exists()) {
                return docSnap.data();
            } else {
                console.warn(`경기 ID ${matchId}에 대한 데이터가 없습니다.`);
                return null;
            }
        } catch (error) {
            console.error("경기 정보 불러오기 실패:", error);
            return null;
        }
    }

    // teams 컬렉션에서 팀 라인업 가져오기
    async getTeamLineup(teamName) {
        try {
            const teamDocRef = window.firebase.doc(this.db, "teams", teamName);
            const teamDoc = await window.firebase.getDoc(teamDocRef);
            
            if (teamDoc.exists()) {
                const teamData = teamDoc.data();
                console.log(`${teamName} 팀 라인업 조회 성공:`, teamData.lineups);
                return teamData.lineups || { first: [], second: [], third: [] };
            } else {
                console.warn(`teams 컬렉션에서 ${teamName} 팀을 찾을 수 없습니다.`);
                return { first: [], second: [], third: [] };
            }
        } catch (error) {
            console.error(`${teamName} 팀 라인업 조회 실패:`, error);
            return { first: [], second: [], third: [] };
        }
    }

    // 경기 라인업 데이터 가져오기
    async getMatchLineups(matchDetails) {
        try {
            const homeTeamName = matchDetails.homeTeam;
            const awayTeamName = matchDetails.awayTeam;
            
            console.log(`라인업 조회 시작 - 홈팀: ${homeTeamName}, 원정팀: ${awayTeamName}`);
            
            const homeLineup = await this.getTeamLineup(homeTeamName);
            const awayLineup = await this.getTeamLineup(awayTeamName);
            
            const finalLineups = {
                home: homeLineup,
                away: awayLineup
            };
            
            if (!homeLineup.first.length && !homeLineup.second.length && !homeLineup.third.length) {
                console.log(`${homeTeamName} 팀의 teams 컬렉션 라인업이 비어있음, matches 컬렉션에서 폴백`);
                if (matchDetails.lineups && matchDetails.lineups.home) {
                    finalLineups.home = matchDetails.lineups.home;
                }
            }
            
            if (!awayLineup.first.length && !awayLineup.second.length && !awayLineup.third.length) {
                console.log(`${awayTeamName} 팀의 teams 컬렉션 라인업이 비어있음, matches 컬렉션에서 폴백`);
                if (matchDetails.lineups && matchDetails.lineups.away) {
                    finalLineups.away = matchDetails.lineups.away;
                }
            }
            
            console.log("최종 라인업 데이터:", finalLineups);
            return finalLineups;
            
        } catch (error) {
            console.error("라인업 조회 중 오류 발생:", error);
            return matchDetails.lineups || {
                home: { first: [], second: [], third: [] },
                away: { first: [], second: [], third: [] }
            };
        }
    }

    // 패널 탭 렌더링 (라인업 / 상대전적 / 채팅)
    async renderPanelTabs(matchDetails, matchId) {
        const lineups = await this.getMatchLineups(matchDetails);
        const h2hHtml = await this.renderH2HContent(matchDetails.homeTeam, matchDetails.awayTeam);
        
        return `
            <div class="tab-container">
                <div class="tabs">
                    <div class="tab active" data-tab="lineup">라인업</div>
                    <div class="tab" data-tab="h2h">상대전적</div>
                    <div class="tab" data-tab="chat">채팅</div>
                </div>
                <div class="tab-contents">
                    <div class="tab-content lineup-content active">
                        ${this.renderLineup(lineups)}
                    </div>
                    <div class="tab-content h2h-content">
                        ${h2hHtml}
                    </div>
                    <div class="tab-content chat-content">
                        ${this.renderChatBox(matchId)}
                    </div>
                </div>
            </div>
        `;
    }

    // 상대전적: Firestore에서 두 팀 간 모든 경기 조회
    async getH2HMatches(homeTeam, awayTeam) {
        try {
            const querySnapshot = await window.firebase.getDocs(
                window.firebase.collection(this.db, "matches")
            );

            const h2hMatches = [];
            querySnapshot.forEach((doc) => {
                const match = { id: doc.id, ...doc.data() };

                const isH2H =
                    (match.homeTeam === homeTeam && match.awayTeam === awayTeam) ||
                    (match.homeTeam === awayTeam  && match.awayTeam === homeTeam);

                const isFinished = match.status === "finished";

                if (isH2H && isFinished) {
                    h2hMatches.push(match);
                }
            });

            h2hMatches.sort((a, b) => {
                const da = this.normalizeDate(a.date || '');
                const db_ = this.normalizeDate(b.date || '');
                return db_.localeCompare(da);
            });

            return h2hMatches;
        } catch (error) {
            console.error("상대전적 조회 실패:", error);
            return [];
        }
    }

    getMatchResultForTeam(match, teamName) {
        const isHome = match.homeTeam === teamName;

        if (match.adminResult) {
            if (match.adminResult === 'draw') return 'draw';
            if (match.adminResult === 'homeWin') return isHome ? 'win' : 'loss';
            if (match.adminResult === 'awayWin') return isHome ? 'loss' : 'win';
        }

        const hs = parseInt(match.homeScore);
        const as_ = parseInt(match.awayScore);
        if (isNaN(hs) || isNaN(as_)) return null;

        if (hs === as_) return 'draw';
        if (hs > as_) return isHome ? 'win' : 'loss';
        return isHome ? 'loss' : 'win';
    }

    async renderH2HContent(homeTeam, awayTeam) {
        const allMatches = await this.getH2HMatches(homeTeam, awayTeam);

        if (allMatches.length === 0) {
            return `
                <div class="h2h-container">
                    <div class="h2h-empty">
                        <p>두 팀 간의 이전 경기 기록이 없습니다.</p>
                    </div>
                </div>
            `;
        }

        let wins = 0, draws = 0, losses = 0;
        allMatches.forEach(match => {
            const result = this.getMatchResultForTeam(match, homeTeam);
            if (result === 'win')   wins++;
            else if (result === 'draw')  draws++;
            else if (result === 'loss')  losses++;
        });

        const total    = wins + draws + losses;
        const winPct   = total ? Math.round((wins   / total) * 100) : 0;
        const drawPct  = total ? Math.round((draws  / total) * 100) : 0;
        const lossPct  = total ? Math.round((losses / total) * 100) : 0;

        const matchRowHtml = (match) => {
            const homeResult = this.getMatchResultForTeam(match, match.homeTeam);
            const awayResult = this.getMatchResultForTeam(match, match.awayTeam);

            const badgeClass = (r) => ({ win: 'h2h-win', draw: 'h2h-draw', loss: 'h2h-loss' }[r] || '');
            const badgeLabel = (r) => ({ win: '승', draw: '무', loss: '패' }[r] || '-');

            const scoreText =
                (match.homeScore !== undefined && match.homeScore !== '' &&
                 match.awayScore !== undefined && match.awayScore !== '')
                    ? `${match.homeScore} - ${match.awayScore}`
                    : '-';

            return `
                <div class="h2h-match-row">
                    <span class="h2h-match-date">${match.date || ''}</span>
                    <div class="h2h-match-body">
                        <div class="h2h-team-block">
                            <span class="h2h-result-badge ${badgeClass(homeResult)}">${badgeLabel(homeResult)}</span>
                            <span class="h2h-team-name">${this.escapeHtml(match.homeTeam)}</span>
                        </div>
                        <span class="h2h-score">${scoreText}</span>
                        <div class="h2h-team-block h2h-team-block--away">
                            <span class="h2h-team-name">${this.escapeHtml(match.awayTeam)}</span>
                            <span class="h2h-result-badge ${badgeClass(awayResult)}">${badgeLabel(awayResult)}</span>
                        </div>
                    </div>
                </div>
            `;
        };

        const recent5Html = allMatches.slice(0, 5).map(matchRowHtml).join('');

        const statsGraphHtml = `
            <div class="h2h-stats-graph">
                <div class="h2h-teams-label">
                    <span class="h2h-team-a">${this.escapeHtml(homeTeam)}</span>
                    <span class="h2h-team-b">${this.escapeHtml(awayTeam)}</span>
                </div>
                <div class="h2h-counts-row">
                    <span class="h2h-count-win">${wins}</span>
                    <span class="h2h-count-draw">${draws}</span>
                    <span class="h2h-count-loss">${losses}</span>
                </div>
                <div class="h2h-bar-wrap">
                    <div class="h2h-bar-win"  style="width:${winPct}%"  title="${homeTeam} 승 ${winPct}%"></div>
                    <div class="h2h-bar-draw" style="width:${drawPct}%" title="무승부 ${drawPct}%"></div>
                    <div class="h2h-bar-loss" style="width:${lossPct}%" title="${awayTeam} 승 ${lossPct}%"></div>
                </div>
                <div class="h2h-bar-labels">
                    <span class="h2h-label-win">${winPct}%</span>
                    <span class="h2h-label-draw">${drawPct}%</span>
                    <span class="h2h-label-loss">${lossPct}%</span>
                </div>
                <div class="h2h-total-count">총 ${total}경기 · ${wins} / ${draws} / ${losses}</div>
            </div>
        `;

        const allMatchesHtml = allMatches.map(matchRowHtml).join('');

        return `
            <div class="h2h-container">
                <div class="h2h-section">
                    <div class="h2h-section-title">최근 5경기</div>
                    <div class="h2h-match-list">${recent5Html}</div>
                </div>
                <div class="h2h-section">
                    <div class="h2h-section-title">역대 전적</div>
                    ${statsGraphHtml}
                    <div class="h2h-all-toggle" onclick="this.nextElementSibling.classList.toggle('open'); this.textContent = this.nextElementSibling.classList.contains('open') ? '▲ 경기 목록 접기' : '▼ 전체 경기 목록 보기'">▼ 전체 경기 목록 보기</div>
                    <div class="h2h-match-list h2h-all-list">${allMatchesHtml}</div>
                </div>
            </div>
        `;
    }

    escapeHtml(text) {
        if (!text) return "";
        return text.replace(/[&<>"'`]/g, s => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
            "`": "&#96;"
        }[s]));
    }

    renderLineup(lineups) {
        const players = (list) => {
            return `<div class="players-container">${list.map((n) => `<div class="player">${this.escapeHtml(n)}</div>`).join("")}</div>`;
        };
        
        const sideBlock = (side, data) => {
            return `
                <div class="lineup-team lineup-${side}">
                    <div class="lineup-group"><span class="position-label">3학년</span>${players(data.third || [])}</div>
                    <div class="lineup-group"><span class="position-label">2학년</span>${players(data.second || [])}</div>
                    <div class="lineup-group"><span class="position-label">1학년</span>${players(data.first || [])}</div>
                </div>
            `;
        };
        
        return `
            <div class="lineup-field">
                <div class="lineup-bg"></div>
                <div class="lineup-sides">
                    ${sideBlock("home", lineups.home)}
                    <div class="vs-label">VS</div>
                    ${sideBlock("away", lineups.away)}
                </div>
            </div>
        `;
    }

    renderChatBox(matchId) {
        return `
            <div class="chat-messages" id="chatMessages"></div>
            <form class="chat-form" id="chatForm">
                <input type="text" id="chatInput" autocomplete="off" maxlength="120" placeholder="메시지를 입력하세요" />
                <button type="submit" id="sendChatBtn">전송</button>
            </form>
            <div class="chat-login-notice" style="display:none;">
                <button class="login-btn" onclick="document.getElementById('loginModal').style.display='flex'">로그인 후 채팅하기</button>
            </div>
        `;
    }

    chatCollection(matchId) {
        return window.firebase.collection(this.db, 'match_chats', matchId, 'messages');
    }

    setupPanelTabs(matchId) {
        const tabs = document.querySelectorAll('.tab');
        const contents = document.querySelectorAll('.tab-content');
        
        tabs.forEach((tab, index) => {
            tab.onclick = () => {
                tabs.forEach(t => t.classList.remove('active'));
                contents.forEach(c => c.classList.remove('active'));
                
                tab.classList.add('active');
                contents[index].classList.add('active');
                
                if (tab.dataset.tab === "chat") {
                    this.setupChat(matchId);
                }
            };
        });
        
        if (tabs.length > 0 && contents.length > 0) {
            tabs[0].classList.add('active');
            contents[0].classList.add('active');
        }
    }

    setupChat(matchId) {
        const chatBox = document.getElementById('chatMessages');
        const chatForm = document.getElementById('chatForm');
        const chatInput = document.getElementById('chatInput');
        const loginNotice = document.querySelector('.chat-login-notice');
        chatBox.innerHTML = "";

        if (!this.auth.currentUser) {
            loginNotice.style.display = "block";
            chatForm.style.display = "none";
            chatBox.innerHTML = "<p style='text-align:center;color:#aaa;'>로그인 후 채팅을 이용할 수 있습니다.</p>";
            return;
        } else {
            loginNotice.style.display = "none";
            chatForm.style.display = "flex";
        }

        if (this.chatUnsubscribe) {
            this.chatUnsubscribe();
        }

        this.chatUnsubscribe = window.firebase.onSnapshot(
            window.firebase.query(
                this.chatCollection(matchId),
                window.firebase.where('matchId', '==', matchId)
            ),
            (snapshot) => {
                let html = '';
                snapshot.forEach(doc => {
                    const msg = doc.data();
                    const isMe = msg.uid === this.auth.currentUser.uid;
                    html += `
                        <div class="chat-msg${isMe ? " me" : ""}">
                            <span class="chat-nick">${this.escapeHtml(msg.nickname)}</span>
                            <span class="chat-text">${this.escapeHtml(msg.text)}</span>
                            <span class="chat-time">${msg.time ? new Date(msg.time.seconds * 1000).toLocaleTimeString() : ""}</span>
                        </div>
                    `;
                });
                chatBox.innerHTML = html;
                chatBox.scrollTop = chatBox.scrollHeight;
            }
        );

        chatForm.onsubmit = async (e) => {
            e.preventDefault();
            const text = chatInput.value.trim();
            if (!text) return;
            const user = this.auth.currentUser;
            if (!user) return;
            
            const profileSnap = await window.firebase.getDoc(window.firebase.doc(this.db, 'profiles', user.uid));
            const nickname = profileSnap.exists() ? profileSnap.data().nickname : user.email.split('@')[0];
            
            await window.firebase.setDoc(
                window.firebase.doc(this.chatCollection(matchId), Date.now().toString() + "_" + user.uid),
                {
                    matchId,
                    uid: user.uid,
                    nickname,
                    text,
                    time: new Date()
                }
            );
            chatInput.value = "";
            setTimeout(() => { chatBox.scrollTop = chatBox.scrollHeight; }, 100);
        };
    }

    async saveVoteToFirestore(matchId, voteType) {
        const user = this.auth.currentUser;
        if (!user) return;

        const voteRef = window.firebase.doc(this.db, 'votes', `${matchId}_${user.uid}`);
        const voteSnap = await window.firebase.getDoc(voteRef);

        if (voteSnap.exists()) return null;

        await window.firebase.setDoc(voteRef, {
            matchId,
            uid: user.uid,
            voteType,
            votedAt: new Date()
        });

        const pointRef = window.firebase.doc(this.db, 'user_points', user.uid);
        const pointSnap = await window.firebase.getDoc(pointRef);
        if (!pointSnap.exists()) {
            await window.firebase.setDoc(pointRef, {
                points: 0,
                uid: user.uid
            });
        }

        return true;
    }

    async getVotingStatsFromFirestore(matchId) {
        const stats = { homeWin: 0, draw: 0, awayWin: 0, total: 0 };
        const querySnapshot = await window.firebase.getDocs(
            window.firebase.query(
                window.firebase.collection(this.db, 'votes'),
                window.firebase.where('matchId', '==', matchId)
            )
        );

        querySnapshot.forEach(doc => {
            const data = doc.data();
            if (data.voteType in stats) {
                stats[data.voteType]++;
                stats.total++;
            }
        });

        return stats;
    }

    async hasUserVoted(matchId) {
        const user = this.auth.currentUser;
        if (!user) return false;

        const voteRef = window.firebase.doc(this.db, 'votes', `${matchId}_${user.uid}`);
        const voteSnap = await window.firebase.getDoc(voteRef);
        return voteSnap.exists();
    }

    renderVotingGraph(container, stats) {
        const totalVotes = stats.total;
        
        if (totalVotes === 0) {
            container.innerHTML = `
                <div class="voting-stats">
                    <div class="no-votes-message">
                        <p>아직 투표가 없습니다.</p>
                    </div>
                </div>
            `;
            return;
        }
        
        const homePercent = Math.round((stats.homeWin / totalVotes) * 100);
        const drawPercent = Math.round((stats.draw / totalVotes) * 100);
        const awayPercent = Math.round((stats.awayWin / totalVotes) * 100);

        container.innerHTML = `
            <div class="voting-stats">
                <div class="stat-row">
                    <div class="stat-value">${homePercent}%</div>
                    <div class="stat-bar">
                        <div class="home-stat" style="width: ${homePercent}%"></div>
                        <div class="draw-stat" style="width: ${drawPercent}%"></div>
                        <div class="away-stat" style="width: ${awayPercent}%"></div>
                    </div>
                    <div class="stat-value">${awayPercent}%</div>
                </div>
                <div class="stat-labels">
                    <span class="home-label">홈 승 (${stats.homeWin})</span>
                    <span class="draw-label">무승부 (${stats.draw})</span>
                    <span class="away-label">원정 승 (${stats.awayWin})</span>
                </div>
            </div>
        `;
    }

    async setMatchResult(matchId, result) {
        const user = this.auth.currentUser;
        if (!user) {
            alert('로그인 필요');
            return;
        }
        
        const adminDocRef = window.firebase.doc(this.db, "admins", user.email);
        const adminDoc = await window.firebase.getDoc(adminDocRef);
        if (!adminDoc.exists()) {
            alert("관리자만 결과 설정 가능");
            return;
        }

        try {
            const matchRef = window.firebase.doc(this.db, "matches", matchId);
            await window.firebase.setDoc(matchRef, {
                status: "finished",
                adminResult: result
            }, { merge: true });

            const votesQuery = window.firebase.query(
                window.firebase.collection(this.db, "votes"),
                window.firebase.where("matchId", "==", matchId)
            );
            const votesSnapshot = await window.firebase.getDocs(votesQuery);
            const winners = [];
            votesSnapshot.forEach(doc => {
                if (doc.data().voteType === result) {
                    winners.push(doc.data().uid);
                }
            });

            console.log("승자 목록:", winners);

            for (const uid of winners) {
                await this.updateUserPoints(uid, 100);
            }
            
            alert(`${winners.length}명에게 100포인트 지급 완료!`);
            this.loadMatchDetails(matchId);
            
        } catch (error) {
            console.error("경기 결과 설정 중 오류:", error);
            alert("경기 결과 설정에 실패했습니다.");
        }
    }

    async updateUserPoints(uid, pointsToAdd) {
        try {
            console.log(`포인트 업데이트 시작 - UID: ${uid}, 추가 포인트: ${pointsToAdd}`);
            
            const pointRef = window.firebase.doc(this.db, "user_points", uid);
            
            const updatedPoints = await window.firebase.runTransaction(async (transaction) => {
                const pointDoc = await transaction.get(pointRef);
                let currentPoints = 0;
                
                if (pointDoc.exists()) {
                    currentPoints = pointDoc.data().points || 0;
                }
                
                const newPoints = currentPoints + pointsToAdd;
                
                transaction.set(pointRef, {
                    points: newPoints,
                    uid: uid,
                    lastUpdated: new Date()
                }, { merge: true });
                
                return newPoints;
            });
            
            console.log(`포인트 업데이트 완료 - 새 포인트: ${updatedPoints}`);
            return updatedPoints;
        } catch (error) {
            console.error("포인트 업데이트 실패:", error);
            
            try {
                console.log("트랜잭션 실패, 일반 업데이트로 재시도");
                const pointRef = window.firebase.doc(this.db, "user_points", uid);
                const pointDoc = await window.firebase.getDoc(pointRef);
                let currentPoints = 0;
                
                if (pointDoc.exists()) {
                    currentPoints = pointDoc.data().points || 0;
                }
                
                const newPoints = currentPoints + pointsToAdd;
                
                await window.firebase.setDoc(pointRef, {
                    points: newPoints,
                    uid: uid,
                    lastUpdated: new Date()
                }, { merge: true });
                
                console.log(`일반 업데이트 완료 - 새 포인트: ${newPoints}`);
                return newPoints;
            } catch (fallbackError) {
                console.error("일반 업데이트도 실패:", fallbackError);
                throw fallbackError;
            }
        }
    }

    // ── 경기 수정 모달 열기 (관리자 전용) ──────────────────────────────────
    async openEditMatchModal(matchId) {
        const modal = document.getElementById('editMatchModal');
        if (!modal) { console.error('editMatchModal 없음 — index.html에 모달 HTML을 추가했는지 확인하세요.'); return; }

        // 현재 경기 데이터 로드
        const matchData = await this.getMatchDetailsById(matchId);
        if (!matchData) { alert('경기 데이터를 불러오지 못했습니다.'); return; }

        // 부제목 (어떤 경기인지 표시)
        const subtitle = document.getElementById('editMatchSubtitle');
        if (subtitle) subtitle.textContent = `${matchData.homeTeam || ''} vs ${matchData.awayTeam || ''} · ID: ${matchId}`;

        // 헬퍼
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = (val !== undefined && val !== null) ? val : ''; };

        // 기본 필드
        set('editMatchStatus',    matchData.status    || 'scheduled');
        set('editMatchDate',      matchData.date      || '');
        set('editMatchTime',      matchData.time      || '');
        set('editMatchHome',      matchData.homeTeam  || '');
        set('editMatchAway',      matchData.awayTeam  || '');
        set('editMatchHomeScore', matchData.homeScore ?? 0);
        set('editMatchAwayScore', matchData.awayScore ?? 0);
        set('editMatchLeague',    matchData.league    || '');

        // 라인업
        const hl = matchData.lineups?.home || {};
        const al = matchData.lineups?.away || {};
        set('editHomeThird',  (hl.third  || []).join(', '));
        set('editHomeSecond', (hl.second || []).join(', '));
        set('editHomeFirst',  (hl.first  || []).join(', '));
        set('editAwayThird',  (al.third  || []).join(', '));
        set('editAwaySecond', (al.second || []).join(', '));
        set('editAwayFirst',  (al.first  || []).join(', '));

        // 스탯
        const st = matchData.stats || {};
        set('editHomePoss',  st.homePossession ?? 50);
        set('editAwayPoss',  st.awayPossession ?? 50);
        set('editHomeShots', st.homeShots      ?? 0);
        set('editAwayShots', st.awayShots      ?? 0);

        // 이벤트
        const evEl = document.getElementById('editMatchEvents');
        if (evEl) evEl.value = (matchData.events || []).join('\n');

        // 메시지 초기화
        const msg = document.getElementById('editMatchMsg');
        if (msg) { msg.style.display = 'none'; msg.textContent = ''; }

        // 저장 버튼에 현재 matchId 바인딩
        const saveBtn = document.getElementById('saveEditMatchBtn');
        if (saveBtn) saveBtn.onclick = () => this.saveMatchEdit(matchId);

        // 닫기/취소
        const closeFn = () => { modal.style.display = 'none'; };
        const closeBtn  = document.getElementById('closeEditMatchModal');
        const cancelBtn = document.getElementById('cancelEditMatchBtn');
        if (closeBtn)  closeBtn.onclick  = closeFn;
        if (cancelBtn) cancelBtn.onclick = closeFn;

        // 모달 배경 클릭 닫기 (once: true 로 중복 등록 방지)
        const bgClose = (e) => { if (e.target === modal) closeFn(); };
        modal.removeEventListener('click', bgClose);
        modal.addEventListener('click', bgClose);

        modal.style.display = 'flex';
    }

    // ── 경기 수정 저장 ──────────────────────────────────────────────────────
    async saveMatchEdit(matchId) {
        const modal   = document.getElementById('editMatchModal');
        const msg     = document.getElementById('editMatchMsg');
        const saveBtn = document.getElementById('saveEditMatchBtn');

        const showMsg = (text, color) => {
            if (!msg) return;
            msg.textContent = text;
            msg.style.color = color || '#333';
            msg.style.display = 'block';
        };

        try {
            if (saveBtn) saveBtn.disabled = true;
            showMsg('저장 중...', '#27AE60');

            // 관리자 재확인 (보안)
            const user = this.auth.currentUser;
            if (!user) { showMsg('로그인이 필요합니다.', '#e74c3c'); return; }
            const adminSnap = await window.firebase.getDoc(window.firebase.doc(this.db, 'admins', user.email));
            if (!adminSnap.exists()) { showMsg('관리자 권한이 없습니다.', '#e74c3c'); return; }

            const get    = (id) => document.getElementById(id)?.value ?? '';
            const csvArr = (str) => str.split(',').map(s => s.trim()).filter(Boolean);

            const updateData = {
                status:    get('editMatchStatus'),
                date:      get('editMatchDate'),
                time:      get('editMatchTime'),
                homeTeam:  get('editMatchHome').trim(),
                awayTeam:  get('editMatchAway').trim(),
                homeScore: parseInt(get('editMatchHomeScore'), 10) || 0,
                awayScore: parseInt(get('editMatchAwayScore'), 10) || 0,
                league:    get('editMatchLeague').trim(),
                lineups: {
                    home: {
                        third:  csvArr(get('editHomeThird')),
                        second: csvArr(get('editHomeSecond')),
                        first:  csvArr(get('editHomeFirst')),
                    },
                    away: {
                        third:  csvArr(get('editAwayThird')),
                        second: csvArr(get('editAwaySecond')),
                        first:  csvArr(get('editAwayFirst')),
                    }
                },
                stats: {
                    homePossession: Number(get('editHomePoss'))  || 0,
                    awayPossession: Number(get('editAwayPoss'))  || 0,
                    homeShots:      Number(get('editHomeShots')) || 0,
                    awayShots:      Number(get('editAwayShots')) || 0,
                },
                events:    (get('editMatchEvents') || '').split('\n').map(s => s.trim()).filter(Boolean),
                updatedBy: user.email,
                updatedAt: new Date(),
            };

            const matchRef = window.firebase.doc(this.db, 'matches', matchId);
            await window.firebase.setDoc(matchRef, updateData, { merge: true });

            showMsg('✅ 저장 완료!', '#27AE60');

            // 1.3초 후 모달 닫고 패널 새로고침
            setTimeout(async () => {
                if (modal) modal.style.display = 'none';
                await this.loadMatchDetails(matchId);
            }, 1300);

        } catch (err) {
            console.error('경기 수정 저장 실패:', err);
            showMsg('❌ 저장 실패: ' + err.message, '#e74c3c');
        } finally {
            if (saveBtn) saveBtn.disabled = false;
        }
    }

    // 패널 닫기
    closePanel() {
        const matchDetailsPanel = document.getElementById("matchDetailsPanel");
        const overlay = document.getElementById("overlay");
        
        if (matchDetailsPanel) matchDetailsPanel.classList.remove("active");
        if (overlay) overlay.classList.remove("active");
        document.body.style.overflow = "";
        
        if (this.chatUnsubscribe) {
            this.chatUnsubscribe();
            this.chatUnsubscribe = null;
        }
    }

    setupEventListeners() {
        const prevBtn = document.getElementById('prevMatch');
        const nextBtn = document.getElementById('nextMatch');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.showPreviousMatch());
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.showNextMatch());
        }

        const matchInfo = document.getElementById('matchInfo');
        if (matchInfo) {
            matchInfo.style.cursor = 'pointer';
            matchInfo.addEventListener('click', () => this.openCurrentMatchDetails());
            
            matchInfo.addEventListener('mouseenter', () => {
                matchInfo.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                matchInfo.style.borderRadius = '8px';
            });
            
            matchInfo.addEventListener('mouseleave', () => {
                matchInfo.style.backgroundColor = 'transparent';
            });
        }

        const closePanelBtn = document.getElementById("closePanelBtn");
        const overlay = document.getElementById("overlay");

        if (closePanelBtn) {
            closePanelBtn.addEventListener("click", () => this.closePanel());
        }
        
        if (overlay) {
            overlay.addEventListener("click", () => this.closePanel());
        }
    }

    async initialize() {
        console.log("TodayMatchManager 초기화 시작");
        
        await this.waitForFirebase();
        
        const hasMatches = await this.loadTodayMatches();
        this.updateTodayMatchUI();
        this.setupEventListeners();

        console.log("TodayMatchManager 초기화 완료");
        return hasMatches;
    }

    setupRealtimeUpdates() {
        if (!this.initialized) return;

        console.log("실시간 업데이트 리스너 설정");

        const unsubscribe = window.firebase.onSnapshot(
            window.firebase.collection(this.db, "matches"),
            (snapshot) => {
                console.log("경기 데이터 변경 감지");
                this.loadTodayMatches().then(() => {
                    this.updateTodayMatchUI();
                });
            },
            (error) => {
                console.error("실시간 업데이트 오류:", error);
            }
        );

        window.addEventListener('beforeunload', () => {
            if (unsubscribe) unsubscribe();
            if (this.chatUnsubscribe) this.chatUnsubscribe();
        });
    }
}

// 전역 인스턴스 생성
const todayMatchManager = new TodayMatchManager();

document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM 로드 완료 - TodayMatchManager 초기화");
    
    setTimeout(async () => {
        try {
            await todayMatchManager.initialize();
            todayMatchManager.setupRealtimeUpdates();
        } catch (error) {
            console.error("TodayMatchManager 초기화 실패:", error);
        }
    }, 1000);
});

window.todayMatchManager = todayMatchManager;
