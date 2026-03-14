// personal-stats.js
// ─────────────────────────────────────────────────────────────────────────────
// 개인 기록 카드 (사이드바 "게시판" 영역을 대체)
// Firestore 컬렉션: personal_stats / 문서 ID: uid
// 필드: prediction_count | correct_count | max_streak | best_rank | updated_at
//
// 기존 파일 무수정 원칙
//  - today_matches.js의 saveVoteToFirestore / setMatchResult 를
//    파일 로드 완료 후 패치(monkey-patch)하여 후킹
//  - auth.js / modal-ui.js 등 다른 파일과 전역 변수 충돌 없음
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  'use strict';

  // ── 1. 내부 유틸 ────────────────────────────────────────────────────────────

  function waitReady() {
    return new Promise((resolve) => {
      const check = () => {
        if (window.firebase && window.db && window.auth) resolve();
        else setTimeout(check, 100);
      };
      check();
    });
  }

  // todayMatchManager 인스턴스가 생길 때까지 대기
  function waitForManager() {
    return new Promise((resolve) => {
      const check = () => {
        if (window.todayMatchManager) resolve(window.todayMatchManager);
        else setTimeout(check, 150);
      };
      check();
    });
  }

  // ── 2. Firestore CRUD ────────────────────────────────────────────────────────

  async function fetchStats(uid) {
    const ref = window.firebase.doc(window.db, 'personal_stats', uid);
    const snap = await window.firebase.getDoc(ref);
    if (snap.exists()) return snap.data();
    return { prediction_count: 0, correct_count: 0, max_streak: 0, best_rank: null };
  }

  async function saveStats(uid, data) {
    const ref = window.firebase.doc(window.db, 'personal_stats', uid);
    await window.firebase.setDoc(ref, { ...data, updated_at: new Date() }, { merge: true });
  }

  // ── 3. 연속 적중 스트릭 계산 ────────────────────────────────────────────────
  // 해당 유저의 votes를 전부 읽고 각 경기 adminResult와 대조해
  // 최신순으로 정렬한 뒤 연속 적중 수를 반환
  async function calcCurrentStreak(uid) {
    try {
      const snap = await window.firebase.getDocs(
        window.firebase.query(
          window.firebase.collection(window.db, 'votes'),
          window.firebase.where('uid', '==', uid)
        )
      );

      const votes = [];
      snap.forEach(doc => votes.push(doc.data()));

      const results = await Promise.all(votes.map(async (v) => {
        const matchSnap = await window.firebase.getDoc(
          window.firebase.doc(window.db, 'matches', v.matchId)
        );
        if (!matchSnap.exists()) return null;
        const match = matchSnap.data();
        if (!match.adminResult) return null; // 결과 미확정은 제외
        return {
          correct:  v.voteType === match.adminResult,
          votedAt:  v.votedAt?.seconds ?? 0,
        };
      }));

      // 결과 확정된 것만, 최신순 정렬
      const settled = results
        .filter(Boolean)
        .sort((a, b) => b.votedAt - a.votedAt);

      let streak = 0;
      for (const r of settled) {
        if (r.correct) streak++;
        else break;
      }
      return streak;
    } catch (e) {
      console.warn('[personal-stats] 스트릭 계산 실패:', e);
      return 0;
    }
  }

  // 현재 유저의 포인트 순위 계산
  async function calcCurrentRank(uid) {
    try {
      const snap = await window.firebase.getDocs(
        window.firebase.collection(window.db, 'user_points')
      );
      const list = [];
      snap.forEach(doc => list.push(doc.data()));
      list.sort((a, b) => (b.points || 0) - (a.points || 0));
      const idx = list.findIndex(u => u.uid === uid);
      return idx >= 0 ? idx + 1 : null;
    } catch (e) {
      console.warn('[personal-stats] 순위 계산 실패:', e);
      return null;
    }
  }

  // ── 4. 기록 업데이트 로직 ───────────────────────────────────────────────────

  // 투표 참여 시 → prediction_count +1
  async function onVoteSubmitted(uid) {
    await waitReady();
    const prev = await fetchStats(uid);
    await saveStats(uid, {
      prediction_count: (prev.prediction_count || 0) + 1,
      correct_count:    prev.correct_count  || 0,
      max_streak:       prev.max_streak     || 0,
      best_rank:        prev.best_rank      ?? null,
    });
    loadAndRender();
  }

  // 경기 결과 확정 후 → 적중자 correct_count / max_streak / best_rank 갱신
  async function onMatchResultSet(matchId, result, winnersUidArray) {
    await waitReady();

    for (const uid of winnersUidArray) {
      const prev   = await fetchStats(uid);
      const streak = await calcCurrentStreak(uid);
      const rank   = await calcCurrentRank(uid);

      const newCorrect  = (prev.correct_count || 0) + 1;
      const newStreak   = Math.max(prev.max_streak || 0, streak);
      const newBestRank =
        prev.best_rank == null
          ? rank
          : rank != null
            ? Math.min(prev.best_rank, rank)
            : prev.best_rank;

      await saveStats(uid, {
        prediction_count: prev.prediction_count || 0,
        correct_count:    newCorrect,
        max_streak:       newStreak,
        best_rank:        newBestRank,
      });
    }

    // 로그인한 유저가 이 경기 참여자라면 카드 갱신
    if (window.auth.currentUser) loadAndRender();
  }

  // ── 5. today_matches.js 후킹 (monkey-patch) ─────────────────────────────────

  async function patchTodayMatchManager() {
    const mgr = await waitForManager();

    // ① saveVoteToFirestore 래핑 → 투표 성공(true 반환) 시 참여 횟수 +1
    const _origSave = mgr.saveVoteToFirestore.bind(mgr);
    mgr.saveVoteToFirestore = async function (matchId, voteType) {
      const result = await _origSave(matchId, voteType);
      if (result === true) {
        const uid = window.auth.currentUser?.uid;
        if (uid) onVoteSubmitted(uid).catch(console.error);
      }
      return result;
    };

    // ② setMatchResult 래핑 → 기존 로직 완료 후 적중자 기록 반영
    const _origResult = mgr.setMatchResult.bind(mgr);
    mgr.setMatchResult = async function (matchId, result) {
      await _origResult(matchId, result);

      // 기존 로직이 포인트까지 지급 완료한 뒤 votes 재조회
      try {
        const snap = await window.firebase.getDocs(
          window.firebase.query(
            window.firebase.collection(window.db, 'votes'),
            window.firebase.where('matchId', '==', matchId)
          )
        );
        const winners = [];
        snap.forEach(doc => {
          const d = doc.data();
          if (d.voteType === result) winners.push(d.uid);
        });
        if (winners.length > 0) {
          await onMatchResultSet(matchId, result, winners);
        }
      } catch (e) {
        console.error('[personal-stats] 결과 반영 실패:', e);
      }
    };

    console.log('[personal-stats] todayMatchManager 패치 완료');
  }

  // ── 6. DOM 렌더링 ────────────────────────────────────────────────────────────

  function calcAccuracy(correct, total) {
    if (!total) return '0.0%';
    return ((correct / total) * 100).toFixed(1) + '%';
  }

  function findBoardCard() {
    const cards = document.querySelectorAll('.list-card');
    for (const card of cards) {
      const title = card.querySelector('.list-title');
      if (title && title.textContent.includes('게시판')) return card;
    }
    return null;
  }

  function renderCard(stats, isLoggedIn) {
    const card = findBoardCard();
    if (!card) return;

    if (!isLoggedIn) {
      card.innerHTML = `
        <h4 class="list-title">내 기록</h4>
        <ul class="list-items">
          <li class="list-item" style="text-align:center; color:#aaa; padding:14px 0; font-size:13px;">
            로그인 후 확인할 수 있습니다.
          </li>
        </ul>`;
      return;
    }

    const rows = [
      { label: ' 승부예측 참여',  value: (stats.prediction_count || 0) + '회' },
      { label: ' 적중 횟수',      value: (stats.correct_count    || 0) + '회' },
      { label: ' 적중률',         value: calcAccuracy(stats.correct_count, stats.prediction_count) },
      { label: ' 최대 연속 적중', value: (stats.max_streak        || 0) + '회' },
      { label: ' 내 최고 순위',   value: stats.best_rank != null ? stats.best_rank + '위' : '-' },
    ];

    const liHTML = rows.map(({ label, value }) => `
      <li class="list-item" style="display:flex; justify-content:space-between; align-items:center; padding:6px 0;">
        <span style="color:#888; font-size:13px;">${label}</span>
        <span style="font-weight:700; font-size:14px;">${value}</span>
      </li>`).join('');

    card.innerHTML = `
      <h4 class="list-title" style="display:flex; align-items:center; justify-content:space-between;">
        내 기록
        <button id="psRefreshBtn" title="새로고침"
          style="background:none; border:none; cursor:pointer; font-size:16px; color:#27AE60; padding:0; line-height:1;">↺</button>
      </h4>
      <ul class="list-items">${liHTML}</ul>`;

    document.getElementById('psRefreshBtn')
      ?.addEventListener('click', loadAndRender);
  }

  async function loadAndRender() {
    const user = window.auth?.currentUser;
    if (!user) { renderCard(null, false); return; }
    try {
      const stats = await fetchStats(user.uid);
      renderCard(stats, true);
    } catch (e) {
      console.error('[personal-stats] 렌더 실패:', e);
      renderCard({ prediction_count:0, correct_count:0, max_streak:0, best_rank:null }, true);
    }
  }

  // ── 7. 공개 API ─────────────────────────────────────────────────────────────

  window.personalStats = {
    load:  loadAndRender,
    fetch: fetchStats,
    save:  saveStats,
  };

  // ── 8. 진입점 ────────────────────────────────────────────────────────────────

  waitReady().then(() => {
    // 인증 상태 변화마다 카드 갱신
    window.firebase.onAuthStateChanged(window.auth, (user) => {
      if (user) loadAndRender();
      else      renderCard(null, false);
    });

    // todayMatchManager 메서드 후킹
    patchTodayMatchManager().catch(console.error);
  });

})();
