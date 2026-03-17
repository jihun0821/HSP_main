// stats-leaderboard.js - 득점/도움 순위 자동 전환 시스템 (Firebase 연동)

let statsLeaderboardData = {
    goals: [
        { rank: 1, name: "---", value: 0, unit: "골" },
        { rank: 2, name: "---", value: 0, unit: "골" },
        { rank: 3, name: "---", value: 0, unit: "골" },
        { rank: 4, name: "---", value: 0, unit: "골" },
        { rank: 5, name: "---", value: 0, unit: "골" }
    ],
    assists: [
        { rank: 1, name: "---", value: 0, unit: "도움" },
        { rank: 2, name: "---", value: 0, unit: "도움" },
        { rank: 3, name: "---", value: 0, unit: "도움" },
        { rank: 4, name: "---", value: 0, unit: "도움" },
        { rank: 5, name: "---", value: 0, unit: "도움" }
    ]
};

let currentStatsType = 'goals';
let statsAutoSwitchInterval;
let currentStatsIndex = 0;
const statsTypes = ['goals', 'assists'];
const totalStatsPages = 2;

// ─── Firebase 경로 상수 ──────────────────────────────────────────────────────
// 컬렉션: 2026_stats  /  문서: score(득점), assist(도움)

const STATS_COLLECTION = '2026_stats';
const SCORE_DOC        = 'score';
const ASSIST_DOC       = 'assist';

// 기본 빈 데이터 (문서가 없을 때 자동 생성용)
const DEFAULT_PLAYERS = Array.from({ length: 5 }, () => ({ name: '---', value: 0 }));

// ─── Firebase에서 순위 데이터 불러오기 ───────────────────────────────────────

async function loadStatsFromFirebase() {
    try {
        const db = window.db;
        if (!db) {
            console.warn("db가 아직 준비되지 않았습니다. 재시도...");
            setTimeout(loadStatsFromFirebase, 1000);
            return;
        }

        const scoreRef  = window.firebase.doc(db, STATS_COLLECTION, SCORE_DOC);
        const assistRef = window.firebase.doc(db, STATS_COLLECTION, ASSIST_DOC);

        const [scoreSnap, assistSnap] = await Promise.all([
            window.firebase.getDoc(scoreRef),
            window.firebase.getDoc(assistRef)
        ]);

        // ── 득점(score) 문서 처리 ──
        if (scoreSnap.exists()) {
            const data = scoreSnap.data();
            if (data.players && Array.isArray(data.players)) {
                statsLeaderboardData.goals = data.players.map((p, i) => ({
                    rank: i + 1,
                    name: p.name || '---',
                    value: p.value || 0,
                    unit: '골'
                }));
            }
            console.log("득점 순위 불러오기 완료");
        } else {
            // 문서가 없으면 2026_stats/score 자동 생성
            console.log("2026_stats/score 문서가 없습니다. 기본값으로 자동 생성합니다.");
            await window.firebase.setDoc(scoreRef, {
                players: DEFAULT_PLAYERS,
                createdAt: new Date(),
                updatedAt: new Date()
            });
        }

        // ── 도움(assist) 문서 처리 ──
        if (assistSnap.exists()) {
            const data = assistSnap.data();
            if (data.players && Array.isArray(data.players)) {
                statsLeaderboardData.assists = data.players.map((p, i) => ({
                    rank: i + 1,
                    name: p.name || '---',
                    value: p.value || 0,
                    unit: '도움'
                }));
            }
            console.log("도움 순위 불러오기 완료");
        } else {
            // 문서가 없으면 2026_stats/assist 자동 생성
            console.log("2026_stats/assist 문서가 없습니다. 기본값으로 자동 생성합니다.");
            await window.firebase.setDoc(assistRef, {
                players: DEFAULT_PLAYERS,
                createdAt: new Date(),
                updatedAt: new Date()
            });
        }

        renderStatsLeaderboard();

    } catch (error) {
        console.error("Firebase 순위 불러오기 실패:", error);
        renderStatsLeaderboard(); // 실패해도 기본값으로 렌더링
    }
}

// Firebase 실시간 구독 (데이터 변경 시 자동 반영)
// score, assist 문서를 각각 별도로 구독해서 하나만 바뀌어도 즉시 반영
function subscribeStatsLeaderboard() {
    const db = window.db;
    if (!db) {
        setTimeout(subscribeStatsLeaderboard, 1000);
        return;
    }

    const scoreRef  = window.firebase.doc(db, STATS_COLLECTION, SCORE_DOC);
    const assistRef = window.firebase.doc(db, STATS_COLLECTION, ASSIST_DOC);

    // 득점 구독
    window.firebase.onSnapshot(scoreRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.players && Array.isArray(data.players)) {
                statsLeaderboardData.goals = data.players.map((p, i) => ({
                    rank: i + 1,
                    name: p.name || '---',
                    value: p.value || 0,
                    unit: '골'
                }));
            }
            console.log("득점 순위 실시간 업데이트됨");
            renderStatsLeaderboard();
        }
    }, (error) => {
        console.error("득점 순위 실시간 구독 오류:", error);
    });

    // 도움 구독
    window.firebase.onSnapshot(assistRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.players && Array.isArray(data.players)) {
                statsLeaderboardData.assists = data.players.map((p, i) => ({
                    rank: i + 1,
                    name: p.name || '---',
                    value: p.value || 0,
                    unit: '도움'
                }));
            }
            console.log("도움 순위 실시간 업데이트됨");
            renderStatsLeaderboard();
        }
    }, (error) => {
        console.error("도움 순위 실시간 구독 오류:", error);
    });
}

// ─── 초기화 ─────────────────────────────────────────────────────────────────

window.addEventListener('DOMContentLoaded', () => {
    initializeStatsLeaderboard();
});

function initializeStatsLeaderboard() {
    console.log("득점/도움 순위 자동 전환 시스템 초기화");

    // Firebase 준비될 때까지 대기 후 구독
    if (window.db) {
        subscribeStatsLeaderboard();
    } else {
        window.addEventListener('firebase-ready', () => {
            subscribeStatsLeaderboard();
        });
    }

    // 초기 렌더링 (데이터 불러오기 전에도 UI 표시)
    renderStatsLeaderboard();
    startStatsAutoSwitch();
}

// ─── 렌더링 ─────────────────────────────────────────────────────────────────

function renderStatsLeaderboard() {
    const statsCard = document.querySelector('.side-lists .list-card:nth-child(2)');
    if (!statsCard) return;

    const titleElement = statsCard.querySelector('.list-title');
    const listItems = statsCard.querySelector('.list-items');
    if (!titleElement || !listItems) return;

    const currentData = statsLeaderboardData[currentStatsType];
    const title = currentStatsType === 'goals' ? '득점 순위' : '도움 순위';

    listItems.classList.add('fade-out');

    setTimeout(() => {
        titleElement.innerHTML = `${title} <button id="editStatsBtn" class="add-match-btn" style="display:none; margin-left:12px; font-size:12px; padding:4px 8px;">순위 편집</button>`;

        // 관리자 버튼 표시 여부
        const editBtn = document.getElementById('editStatsBtn');
        if (editBtn) {
            if (window.isAdmin) {
                editBtn.style.display = 'inline-block';
            }
            editBtn.addEventListener('click', () => {
                openStatsEditModal();
            });
        }

        listItems.innerHTML = '';

        currentData.forEach((player) => {
            const listItem = document.createElement('li');
            listItem.className = 'list-item';

            if (player.rank <= 3) listItem.classList.add('top-rank');

            let icon = '';
            if (player.rank === 1) icon = currentStatsType === 'goals' ? '⚽ ' : '🅰️ ';
            else if (player.rank === 2) icon = '🥈 ';
            else if (player.rank === 3) icon = '🥉 ';

            listItem.innerHTML = `
                <span>${icon}${player.rank}. ${escapeHtml(player.name)}</span>
                <span class="stats-value">${player.value}${player.unit}</span>
            `;

            listItems.appendChild(listItem);
        });

        updateStatsPageIndicator(statsCard);

        listItems.classList.remove('fade-out');
        listItems.classList.add('fade-in');
        setTimeout(() => listItems.classList.remove('fade-in'), 400);

    }, 200);
}

// 관리자 상태 변경 감지 → 편집 버튼 표시
window.addEventListener('adminStatusChanged', () => {
    renderStatsLeaderboard();
});

// ─── 페이지 인디케이터 ───────────────────────────────────────────────────────

function updateStatsPageIndicator(statsCard) {
    let indicator = statsCard.querySelector('.page-indicator');

    if (!indicator) {
        indicator = document.createElement('div');
        indicator.className = 'page-indicator';
        statsCard.appendChild(indicator);
    }

    indicator.style.display = 'flex';
    indicator.innerHTML = '';

    const statsLabels = ['득점', '도움'];

    statsTypes.forEach((type, index) => {
        const dot = document.createElement('span');
        dot.className = 'page-dot';
        dot.setAttribute('data-type', type);
        dot.setAttribute('title', `${statsLabels[index]} 순위`);

        if (index === currentStatsIndex) dot.classList.add('active');

        dot.addEventListener('click', () => switchToStatsType(type));
        indicator.appendChild(dot);
    });
}

// ─── 자동 전환 ───────────────────────────────────────────────────────────────

function startStatsAutoSwitch() {
    if (statsAutoSwitchInterval) clearInterval(statsAutoSwitchInterval);

    statsAutoSwitchInterval = setInterval(() => {
        currentStatsIndex = (currentStatsIndex + 1) % totalStatsPages;
        currentStatsType = statsTypes[currentStatsIndex];
        renderStatsLeaderboard();
    }, 10000);
}

function stopStatsAutoSwitch() {
    if (statsAutoSwitchInterval) {
        clearInterval(statsAutoSwitchInterval);
        statsAutoSwitchInterval = null;
    }
}

function switchToStatsType(type) {
    if (type === 'goals' || type === 'assists') {
        currentStatsIndex = statsTypes.indexOf(type);
        currentStatsType = type;
        renderStatsLeaderboard();
        startStatsAutoSwitch();
    }
}

function switchToStatsIndex(index) {
    if (index >= 0 && index < totalStatsPages) {
        currentStatsIndex = index;
        currentStatsType = statsTypes[currentStatsIndex];
        renderStatsLeaderboard();
    }
}

function nextStatsPage() {
    switchToStatsIndex((currentStatsIndex + 1) % totalStatsPages);
    startStatsAutoSwitch();
}

function prevStatsPage() {
    switchToStatsIndex((currentStatsIndex - 1 + totalStatsPages) % totalStatsPages);
    startStatsAutoSwitch();
}

// ─── 유틸 ────────────────────────────────────────────────────────────────────

function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function updateStatsData(newGoalsData, newAssistsData) {
    if (newGoalsData && Array.isArray(newGoalsData)) statsLeaderboardData.goals = newGoalsData;
    if (newAssistsData && Array.isArray(newAssistsData)) statsLeaderboardData.assists = newAssistsData;
    renderStatsLeaderboard();
}

// ─── 전역 노출 ───────────────────────────────────────────────────────────────

window.updateStatsData = updateStatsData;
window.stopStatsAutoSwitch = stopStatsAutoSwitch;
window.startStatsAutoSwitch = startStatsAutoSwitch;
window.switchToStatsType = switchToStatsType;
window.nextStatsPage = nextStatsPage;
window.prevStatsPage = prevStatsPage;
window.loadStatsFromFirebase = loadStatsFromFirebase;

// ─── 이벤트 핸들러 ───────────────────────────────────────────────────────────

window.addEventListener('beforeunload', () => stopStatsAutoSwitch());

document.addEventListener('keydown', (event) => {
    if (event.ctrlKey) {
        if (event.key === 'ArrowLeft') { event.preventDefault(); prevStatsPage(); }
        if (event.key === 'ArrowRight') { event.preventDefault(); nextStatsPage(); }
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const statsCard = document.querySelector('.side-lists .list-card:nth-child(2)');
    if (statsCard) {
        let hoverTimeout;
        statsCard.addEventListener('mouseenter', () => stopStatsAutoSwitch());
        statsCard.addEventListener('mouseleave', () => {
            clearTimeout(hoverTimeout);
            hoverTimeout = setTimeout(() => startStatsAutoSwitch(), 2000);
        });
    }
});
