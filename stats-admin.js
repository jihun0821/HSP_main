// stats-admin.js - 관리자용 득점/도움 순위 편집 기능

// ─── 관리자 모달 열기 ────────────────────────────────────────────────────────

function openStatsEditModal() {
    const modal = document.getElementById('statsEditModal');
    if (!modal) return;

    // 현재 데이터로 폼 채우기
    populateStatsEditForm();

    modal.style.display = 'flex';
}

function closeStatsEditModal() {
    const modal = document.getElementById('statsEditModal');
    if (modal) modal.style.display = 'none';
    clearStatsEditMsg();
}

// ─── 폼 채우기 ───────────────────────────────────────────────────────────────

function populateStatsEditForm() {
    const goalsData = window.statsLeaderboardData?.goals || [];
    const assistsData = window.statsLeaderboardData?.assists || [];

    // 득점 순위 5개 채우기
    for (let i = 1; i <= 5; i++) {
        const player = goalsData[i - 1] || { name: '', value: 0 };
        const nameInput = document.getElementById(`goalName${i}`);
        const valueInput = document.getElementById(`goalValue${i}`);
        if (nameInput) nameInput.value = player.name === '---' ? '' : player.name;
        if (valueInput) valueInput.value = player.value || 0;
    }

    // 도움 순위 5개 채우기
    for (let i = 1; i <= 5; i++) {
        const player = assistsData[i - 1] || { name: '', value: 0 };
        const nameInput = document.getElementById(`assistName${i}`);
        const valueInput = document.getElementById(`assistValue${i}`);
        if (nameInput) nameInput.value = player.name === '---' ? '' : player.name;
        if (valueInput) valueInput.value = player.value || 0;
    }
}

// ─── 저장 ────────────────────────────────────────────────────────────────────
// 득점 → 2026_stats/score   /   도움 → 2026_stats/assist

async function saveStatsToFirebase() {
    const db = window.db;
    if (!db) {
        showStatsEditMsg('Firebase가 준비되지 않았습니다.', 'error');
        return;
    }

    // 득점 데이터 수집
    const goals = [];
    for (let i = 1; i <= 5; i++) {
        const name  = document.getElementById(`goalName${i}`)?.value.trim() || '';
        const value = parseInt(document.getElementById(`goalValue${i}`)?.value) || 0;
        goals.push({ name: name || '---', value });
    }

    // 도움 데이터 수집
    const assists = [];
    for (let i = 1; i <= 5; i++) {
        const name  = document.getElementById(`assistName${i}`)?.value.trim() || '';
        const value = parseInt(document.getElementById(`assistValue${i}`)?.value) || 0;
        assists.push({ name: name || '---', value });
    }

    // 값 기준 내림차순 정렬
    goals.sort((a, b) => b.value - a.value);
    assists.sort((a, b) => b.value - a.value);

    try {
        showStatsEditMsg('저장 중...', 'info');

        const meta = {
            updatedAt: new Date(),
            updatedBy: window.auth?.currentUser?.email || 'unknown'
        };

        // 2026_stats/score 에 득점 저장
        const scoreRef = window.firebase.doc(db, '2026_stats', 'score');
        await window.firebase.setDoc(scoreRef, {
            players: goals,
            ...meta
        }, { merge: true });

        // 2026_stats/assist 에 도움 저장
        const assistRef = window.firebase.doc(db, '2026_stats', 'assist');
        await window.firebase.setDoc(assistRef, {
            players: assists,
            ...meta
        }, { merge: true });

        console.log('2026_stats/score, 2026_stats/assist 저장 완료');
        showStatsEditMsg('✅ 저장되었습니다!', 'success');

        setTimeout(() => {
            closeStatsEditModal();
        }, 1200);

    } catch (error) {
        console.error('순위 저장 실패:', error);
        showStatsEditMsg('❌ 저장에 실패했습니다: ' + error.message, 'error');
    }
}

// ─── 메시지 표시 ─────────────────────────────────────────────────────────────

function showStatsEditMsg(msg, type = 'info') {
    const el = document.getElementById('statsEditMsg');
    if (!el) return;

    const colors = { success: '#27AE60', error: '#E74C3C', info: '#2980B9' };
    el.textContent = msg;
    el.style.color = colors[type] || '#333';
    el.style.display = 'block';
}

function clearStatsEditMsg() {
    const el = document.getElementById('statsEditMsg');
    if (el) { el.textContent = ''; el.style.display = 'none'; }
}

// ─── 탭 전환 ─────────────────────────────────────────────────────────────────

function switchStatsEditTab(tab) {
    const goalsSection = document.getElementById('statsEditGoals');
    const assistsSection = document.getElementById('statsEditAssists');
    const goalTab = document.getElementById('tabGoals');
    const assistTab = document.getElementById('tabAssists');

    if (tab === 'goals') {
        if (goalsSection) goalsSection.style.display = 'block';
        if (assistsSection) assistsSection.style.display = 'none';
        if (goalTab) goalTab.classList.add('active-tab');
        if (assistTab) assistTab.classList.remove('active-tab');
    } else {
        if (goalsSection) goalsSection.style.display = 'none';
        if (assistsSection) assistsSection.style.display = 'block';
        if (goalTab) goalTab.classList.remove('active-tab');
        if (assistTab) assistTab.classList.add('active-tab');
    }
}

// ─── 초기화 ─────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    // 닫기 버튼
    const closeBtn = document.getElementById('closeStatsEditModal');
    if (closeBtn) closeBtn.addEventListener('click', closeStatsEditModal);

    // 저장 버튼
    const saveBtn = document.getElementById('saveStatsBtn');
    if (saveBtn) saveBtn.addEventListener('click', saveStatsToFirebase);

    // 취소 버튼
    const cancelBtn = document.getElementById('cancelStatsBtn');
    if (cancelBtn) cancelBtn.addEventListener('click', closeStatsEditModal);

    // 탭 버튼
    const tabGoals = document.getElementById('tabGoals');
    const tabAssists = document.getElementById('tabAssists');
    if (tabGoals) tabGoals.addEventListener('click', () => switchStatsEditTab('goals'));
    if (tabAssists) tabAssists.addEventListener('click', () => switchStatsEditTab('assists'));

    // 모달 배경 클릭 시 닫기
    const modal = document.getElementById('statsEditModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeStatsEditModal();
        });
    }

    // 관리자 순위 편집 버튼 (사이드바) — 동적으로 생성될 수 있으므로 위임
    document.body.addEventListener('click', (e) => {
        if (e.target && e.target.id === 'editStatsBtn') {
            openStatsEditModal();
        }
    });
});

// 관리자 상태 변경 시 편집 버튼 다시 렌더링
window.addEventListener('adminStatusChanged', () => {
    // stats-leaderboard.js의 renderStatsLeaderboard가 처리
});

// ─── 전역 노출 ───────────────────────────────────────────────────────────────

window.openStatsEditModal = openStatsEditModal;
window.closeStatsEditModal = closeStatsEditModal;
window.saveStatsToFirebase = saveStatsToFirebase;
window.switchStatsEditTab = switchStatsEditTab;
