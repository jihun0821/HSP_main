// ────────────────────────────────────────────────────────────────────────────
// 조별 순위표 모듈
// - 컬렉션명만 바꾸면 연도 전환 가능 (STANDINGS_COLLECTION 상수)
// - Firestore: {STANDINGS_COLLECTION}/group1~4/teams/{teamId}
//   각 팀 문서: { name: "C205", points: 9, rank: 1 }
// - today_matches 컬렉션의 오늘 경기 결과를 감지 → 승점 자동 반영
// ────────────────────────────────────────────────────────────────────────────

// ★ 연도 전환 시 이 값만 바꾸면 됩니다
const STANDINGS_COLLECTION = "2026_group";

// 조 ID 목록 (Firestore 문서 ID)
const GROUP_IDS = ["group1", "group2", "group3", "group4"];

// 초기 조 편성 데이터 (Firestore 초기화용 - 처음 한 번만 사용)
const INITIAL_GROUP_DATA = {
    group1: ["C205", "C204", "C207", "C206", "C304"],
    group2: ["C101", "C103", "C202", "C302", "C203"],
    group3: ["C105", "C104", "C307", "C305", "C106"],
    group4: ["C303", "C201", "C306", "C102", "C301"]
};

// ────────────────────────────────────────────────────────────────────────────
// GroupStandingsManager 클래스
// ────────────────────────────────────────────────────────────────────────────
class GroupStandingsManager {
    constructor() {
        this.db = null;
        this.initialized = false;
        this.unsubscribers = [];   // 실시간 리스너 해제 함수 목록
        this.standingsData = {};   // { group1: [{name, points, rank}, ...], ... }
    }

    // ── Firebase 준비 대기 ──────────────────────────────────────────────────
    async waitForFirebase() {
        return new Promise((resolve) => {
            const check = () => {
                if (window.firebase && window.db) {
                    this.db = window.db;
                    this.initialized = true;
                    resolve();
                } else {
                    setTimeout(check, 100);
                }
            };
            check();
        });
    }

    // ── 오늘 날짜 YYYY-MM-DD ────────────────────────────────────────────────
    getTodayDateString() {
        const today = new Date();
        const y = today.getFullYear();
        const m = String(today.getMonth() + 1).padStart(2, "0");
        const d = String(today.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
    }

    normalizeDate(dateStr) {
        if (!dateStr) return "";
        return dateStr.replace(/\./g, "-").replace(/\//g, "-");
    }

    // ── Firestore 초기 데이터 세팅 (팀이 없을 때만 실행) ───────────────────
    async initializeGroupDataIfNeeded() {
        for (const groupId of GROUP_IDS) {
            const teamsColRef = window.firebase.collection(
                this.db, STANDINGS_COLLECTION, groupId, "teams"
            );
            const snap = await window.firebase.getDocs(teamsColRef);

            if (snap.empty) {
                console.log(`[GroupStandings] ${groupId} 초기 데이터 세팅`);
                const teams = INITIAL_GROUP_DATA[groupId] || [];
                for (let i = 0; i < teams.length; i++) {
                    const teamName = teams[i];
                    await window.firebase.setDoc(
                        window.firebase.doc(teamsColRef, teamName),
                        { name: teamName, points: 0, rank: i + 1 }
                    );
                }
            }
        }
    }

    // ── 단일 그룹의 팀 목록 읽기 ───────────────────────────────────────────
    async fetchGroupTeams(groupId) {
        const teamsColRef = window.firebase.collection(
            this.db, STANDINGS_COLLECTION, groupId, "teams"
        );
        const snap = await window.firebase.getDocs(teamsColRef);
        const teams = [];
        snap.forEach(doc => teams.push({ id: doc.id, ...doc.data() }));
        // 승점 내림차순 → 이름 오름차순 정렬
        teams.sort((a, b) => (b.points - a.points) || a.name.localeCompare(b.name));
        return teams;
    }

    // ── 전체 그룹 데이터 읽기 ──────────────────────────────────────────────
    async fetchAllGroups() {
        const result = {};
        for (const groupId of GROUP_IDS) {
            result[groupId] = await this.fetchGroupTeams(groupId);
        }
        this.standingsData = result;
        return result;
    }

    // ── 어느 조에 속한 팀인지 반환 (없으면 null) ───────────────────────────
    findGroupForTeam(teamName) {
        for (const [groupId, teams] of Object.entries(this.standingsData)) {
            if (teams.some(t => t.name === teamName)) return groupId;
        }
        return null;
    }

    // ── 승점 업데이트 ──────────────────────────────────────────────────────
    async addPoints(groupId, teamName, pointsToAdd) {
        if (pointsToAdd === 0) return;
        const teamRef = window.firebase.doc(
            this.db, STANDINGS_COLLECTION, groupId, "teams", teamName
        );
        const snap = await window.firebase.getDoc(teamRef);
        if (!snap.exists()) {
            console.warn(`[GroupStandings] 팀 문서 없음: ${groupId}/${teamName}`);
            return;
        }
        const current = snap.data().points || 0;
        await window.firebase.setDoc(teamRef, { points: current + pointsToAdd }, { merge: true });
        console.log(`[GroupStandings] ${teamName} +${pointsToAdd}점 (합계 ${current + pointsToAdd})`);
    }

    // ── 그룹 내 순위 재계산 후 저장 ────────────────────────────────────────
    async recalcRanks(groupId) {
        const teams = await this.fetchGroupTeams(groupId);
        for (let i = 0; i < teams.length; i++) {
            const teamRef = window.firebase.doc(
                this.db, STANDINGS_COLLECTION, groupId, "teams", teams[i].id
            );
            await window.firebase.setDoc(teamRef, { rank: i + 1 }, { merge: true });
        }
    }

    // ── 오늘 경기 결과 처리 ────────────────────────────────────────────────
    // adminResult: 'homeWin' | 'awayWin' | 'draw'
    async processMatchResult(match) {
        // 이미 처리된 경기는 건너뜀
        if (match.standingsProcessed) {
            console.log(`[GroupStandings] 이미 처리된 경기: ${match.id}`);
            return;
        }
        if (match.status !== "finished" || !match.adminResult) return;

        const homeTeam = match.homeTeam;
        const awayTeam = match.awayTeam;
        const result   = match.adminResult;

        // 데이터 최신 상태로 갱신
        await this.fetchAllGroups();

        const homeGroup = this.findGroupForTeam(homeTeam);
        const awayGroup = this.findGroupForTeam(awayTeam);

        if (!homeGroup || !awayGroup) {
            console.warn(`[GroupStandings] 조 정보 없음 - 홈: ${homeGroup}, 원정: ${awayGroup}`);
            return;
        }

        // 승점 부여
        if (result === "homeWin") {
            await this.addPoints(homeGroup, homeTeam, 3);
        } else if (result === "awayWin") {
            await this.addPoints(awayGroup, awayTeam, 3);
        } else if (result === "draw") {
            await this.addPoints(homeGroup, homeTeam, 1);
            await this.addPoints(awayGroup, awayTeam, 1);
        }

        // 순위 재계산 (같은 조면 한 번만)
        const groupsToRecalc = [...new Set([homeGroup, awayGroup])];
        for (const g of groupsToRecalc) await this.recalcRanks(g);

        // 처리 완료 플래그
        const matchRef = window.firebase.doc(this.db, "matches", match.id);
        await window.firebase.setDoc(matchRef, { standingsProcessed: true }, { merge: true });

        console.log(`[GroupStandings] 경기 처리 완료: ${homeTeam} vs ${awayTeam} → ${result}`);
    }

    // ── 오늘 경기 전체 스캔 & 처리 ────────────────────────────────────────
    async processTodayMatches() {
        const todayStr = this.getTodayDateString();
        const snap = await window.firebase.getDocs(
            window.firebase.collection(this.db, "matches")
        );
        snap.forEach(doc => {
            const match = { id: doc.id, ...doc.data() };
            const normalized = this.normalizeDate(match.date || "");
            if (normalized === todayStr && match.status === "finished" && match.adminResult) {
                this.processMatchResult(match);
            }
        });
    }

    // ── UI 렌더링 ──────────────────────────────────────────────────────────
    renderStandings() {
        GROUP_IDS.forEach((groupId, idx) => {
            const groupNum  = idx + 1;
            // .group-card 중 n번째
            const groupCard = document.querySelectorAll(".group-card")[idx];
            if (!groupCard) return;

            const teamList = groupCard.querySelector(".team-list");
            if (!teamList) return;

            const teams = this.standingsData[groupId] || [];

            teamList.innerHTML = teams.map((team, i) => `
                <li class="team-item">
                    <span class="team-rank">${i + 1}</span>
                    <span class="team-name">${team.name || "-"}</span>
                    <span class="team-points">${team.points ?? 0}</span>
                </li>
            `).join("");

            // 팀이 없을 때 placeholder
            if (teams.length === 0) {
                teamList.innerHTML = `
                    <li class="team-item">
                        <span class="team-name" style="color:#999">데이터 없음</span>
                    </li>`;
            }
        });
    }

    // ── 실시간 리스너 설정 ─────────────────────────────────────────────────
    setupRealtimeListeners() {
        // 각 조의 teams 서브컬렉션 실시간 감지
        GROUP_IDS.forEach((groupId, idx) => {
            const teamsColRef = window.firebase.collection(
                this.db, STANDINGS_COLLECTION, groupId, "teams"
            );
            const unsub = window.firebase.onSnapshot(teamsColRef, (snap) => {
                const teams = [];
                snap.forEach(doc => teams.push({ id: doc.id, ...doc.data() }));
                teams.sort((a, b) => (b.points - a.points) || a.name.localeCompare(b.name));
                this.standingsData[groupId] = teams;
                this.renderStandings();
            });
            this.unsubscribers.push(unsub);
        });

        // matches 컬렉션 실시간 감지 → 경기 결과 자동 처리
        const matchesUnsub = window.firebase.onSnapshot(
            window.firebase.collection(this.db, "matches"),
            (snap) => {
                const todayStr = this.getTodayDateString();
                snap.forEach(doc => {
                    const match = { id: doc.id, ...doc.data() };
                    const normalized = this.normalizeDate(match.date || "");
                    if (
                        normalized === todayStr &&
                        match.status === "finished" &&
                        match.adminResult &&
                        !match.standingsProcessed
                    ) {
                        this.processMatchResult(match);
                    }
                });
            }
        );
        this.unsubscribers.push(matchesUnsub);
    }

    // ── 리스너 해제 ────────────────────────────────────────────────────────
    destroy() {
        this.unsubscribers.forEach(fn => fn());
        this.unsubscribers = [];
    }

    // ── 진입점 ─────────────────────────────────────────────────────────────
    async initialize() {
        console.log("[GroupStandings] 초기화 시작, 컬렉션:", STANDINGS_COLLECTION);
        await this.waitForFirebase();
        await this.initializeGroupDataIfNeeded();
        await this.fetchAllGroups();
        this.renderStandings();
        this.setupRealtimeListeners();
        // 혹시 처리 안 된 오늘 경기가 있으면 처리
        await this.processTodayMatches();
        console.log("[GroupStandings] 초기화 완료");
    }
}

// ── 전역 인스턴스 ──────────────────────────────────────────────────────────
const groupStandingsManager = new GroupStandingsManager();
window.groupStandingsManager = groupStandingsManager;

// ── DOM 준비 후 실행 ───────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
    // Firebase 초기화(auth.js) 이후에 실행되도록 약간 지연
    setTimeout(() => {
        groupStandingsManager.initialize().catch(err => {
            console.error("[GroupStandings] 초기화 실패:", err);
        });
    }, 1200);

    // 페이지 종료 시 리스너 해제
    window.addEventListener("beforeunload", () => groupStandingsManager.destroy());
});
