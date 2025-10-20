// upcoming-matches.js - 예정된 경기 일정을 표시하는 스크립트 (오늘 제외, 가장 가까운 5경기, 클릭 시 상세 패널 오픈)
// 관리자 전용: 경기 추가 버튼 표시 및 경기 추가 기능
// 확장: 모달에서 id, scores, lineups, stats, events 등 입력 가능하도록 처리

(function() {
  console.log('upcoming-matches.js 로드됨');

  function waitForFirebase() {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 50;
      const checkInterval = setInterval(() => {
        attempts++;
        if (window.firebase && window.db) {
          clearInterval(checkInterval);
          resolve();
        } else if (attempts >= maxAttempts) {
          clearInterval(checkInterval);
          reject(new Error('Firebase 초기화 실패'));
        }
      }, 100);
    });
  }

  function formatDateShort(date) {
    try {
      const month = date.getMonth() + 1;
      const day = date.getDate();
      return `${month}/${day}`;
    } catch (e) {
      return '-';
    }
  }

  function parseMatchDate(dateField) {
    if (!dateField) return null;
    if (typeof dateField === 'object' && typeof dateField.toDate === 'function') {
      try { return dateField.toDate(); } catch (e) { return null; }
    }
    if (dateField instanceof Date) return dateField;
    if (typeof dateField === 'string') {
      let s = dateField.trim();
      s = s.replace(/\./g, '-').replace(/\//g, '-');
      if (/^\d{1,2}-\d{1,2}$/.test(s)) {
        const y = new Date().getFullYear();
        s = `${y}-${s}`;
      }
      const d = new Date(s);
      if (!isNaN(d.getTime())) return d;
      const num = Number(dateField);
      if (!isNaN(num)) {
        const d2 = new Date(num);
        if (!isNaN(d2.getTime())) return d2;
      }
    }
    return null;
  }

  function getTodayStart() {
    const t = new Date();
    t.setHours(0,0,0,0);
    return t;
  }

  // 관리자 체크
  async function checkIfAdmin() {
    try {
      const auth = window.auth;
      const db = window.db;
      if (!auth || !auth.currentUser) return false;
      const email = auth.currentUser.email;
      if (!email) return false;
      const adminDocRef = window.firebase.doc(db, 'admins', email);
      const adminSnap = await window.firebase.getDoc(adminDocRef);
      return adminSnap.exists();
    } catch (e) {
      console.error('관리자 체크 실패:', e);
      return false;
    }
  }

  function showAddMatchButton(show) {
    const btn = document.getElementById('addMatchBtn');
    if (!btn) return;
    btn.style.display = show ? 'inline-block' : 'none';
  }

  async function loadUpcomingMatches() {
    try {
      await waitForFirebase();
      const db = window.db;
      const qSnap = await window.firebase.getDocs(
        window.firebase.query(
          window.firebase.collection(db, 'matches'),
          window.firebase.where('status', '==', 'scheduled')
        )
      );

      const todayStart = getTodayStart();
      const matches = [];
      qSnap.forEach((doc) => {
        const data = doc.data();
        const parsedDate = parseMatchDate(data.date);
        if (!parsedDate) return;
        const dOnly = new Date(parsedDate);
        dOnly.setHours(0,0,0,0);
        if (dOnly > todayStart) {
          matches.push({
            id: doc.id,
            raw: data,
            dateObj: parsedDate
          });
        }
      });

      matches.sort((a, b) => a.dateObj - b.dateObj);
      const upcomingMatches = matches.slice(0,5);
      displayUpcomingMatches(upcomingMatches);

    } catch (error) {
      console.error('경기 일정 로딩 오류:', error);
      displayError();
    }
  }

  function displayUpcomingMatches(matches) {
    const listCards = document.querySelectorAll('.side-lists .list-card');
    let container = null;

    listCards.forEach(card => {
      const titleEl = card.querySelector('.list-title');
      if (!titleEl) return;
      const rawText = titleEl.textContent || '';
      const compact = rawText.replace(/\s+/g, ' ').trim();
      if (compact.indexOf('경기일정') !== -1) {
        container = card.querySelector('.list-items');
      }
    });

    if (!container) {
      console.error('경기일정 컨테이너를 찾을 수 없습니다 (displayUpcomingMatches)');
      return;
    }

    container.innerHTML = '';
    if (!matches || matches.length === 0) {
      const li = document.createElement('li');
      li.className = 'list-item';
      const span = document.createElement('span');
      span.style.color = '#666';
      span.textContent = '예정된 경기가 없습니다';
      li.appendChild(span);
      container.appendChild(li);
      return;
    }

    matches.forEach(match => {
      const li = document.createElement('li');
      li.className = 'list-item upcoming-match-item';
      li.dataset.matchId = match.id;

      const dateSpan = document.createElement('span');
      dateSpan.textContent = formatDateShort(match.dateObj);

      const teamsSpan = document.createElement('span');
      const home = match.raw.homeTeam || '미정';
      const away = match.raw.awayTeam || '미정';
      teamsSpan.textContent = `${home} vs ${away}`;

      li.appendChild(dateSpan);
      li.appendChild(teamsSpan);

      li.addEventListener('click', (e) => {
        e.preventDefault();
        const mid = li.dataset.matchId;
        if (!mid) return;
        if (window.todayMatchManager && typeof window.todayMatchManager.loadMatchDetails === 'function') {
          window.todayMatchManager.loadMatchDetails(mid).catch(err => {
            console.error('상세정보 로드 실패:', err);
            alert('경기 상세정보를 불러오지 못했습니다.');
          });
        } else {
          console.warn('todayMatchManager가 준비되지 않았습니다. matchId:', mid);
        }
      });

      container.appendChild(li);
    });
  }

  function displayError() {
    const listCards = document.querySelectorAll('.side-lists .list-card');
    let container = null;
    listCards.forEach(card => {
      const title = card.querySelector('.list-title');
      if (title && (title.textContent || '').replace(/\s+/g,' ').trim().indexOf('경기일정') !== -1) {
        container = card.querySelector('.list-items');
      }
    });
    if (!container) {
      console.error('경기일정 컨테이너를 찾을 수 없습니다 (displayError)');
      return;
    }
    container.innerHTML = '';
    const li = document.createElement('li');
    li.className = 'list-item';
    const span = document.createElement('span');
    span.style.color = '#e74c3c';
    span.textContent = '불러오기 실패';
    li.appendChild(span);
    container.appendChild(li);
  }

  // ---------- 관리자: 경기 추가 처리 (확장된 필드 포함) ----------
  function openAddMatchModal() {
    const modal = document.getElementById('addMatchModal');
    if (!modal) return;
    modal.style.display = 'flex';
  }

  function closeAddMatchModal() {
    const modal = document.getElementById('addMatchModal');
    if (!modal) return;
    modal.style.display = 'none';
    // 초기화
    const ids = [
      'addMatchId','addMatchDate','addMatchTime','addMatchHome','addMatchAway','addMatchLeague','addMatchStatus',
      'addMatchHomeScore','addMatchAwayScore',
      'addHomeThird','addHomeSecond','addHomeFirst','addAwayThird','addAwaySecond','addAwayFirst',
      'addHomePoss','addAwayPoss','addHomeShots','addAwayShots','addMatchEvents'
    ];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') el.value = '';
      }
    });
    // 기본값 복원
    const hs = document.getElementById('addMatchHomeScore'); if (hs) hs.value = 0;
    const as = document.getElementById('addMatchAwayScore'); if (as) as.value = 0;
    const hp = document.getElementById('addHomePoss'); if (hp) hp.value = 50;
    const ap = document.getElementById('addAwayPoss'); if (ap) ap.value = 50;
    const hsht = document.getElementById('addHomeShots'); if (hsht) hsht.value = 0;
    const asht = document.getElementById('addAwayShots'); if (asht) asht.value = 0;
  }

  // CSV -> 배열 유틸
  function csvToArray(str) {
    if (!str) return [];
    return str.split(',').map(s => s.trim()).filter(s => s.length>0);
  }

  async function addMatchToFirestore() {
    try {
      const auth = window.auth;
      const db = window.db;
      if (!auth || !auth.currentUser) {
        alert('로그인된 관리자만 경기 추가가 가능합니다.');
        return;
      }

      const isAdmin = await checkIfAdmin();
      if (!isAdmin) {
        alert('관리자 권한이 필요합니다.');
        showAddMatchButton(false);
        return;
      }

      // 폼 값 수집
      const manualId = (document.getElementById('addMatchId')?.value || '').trim();
      const dateVal = document.getElementById('addMatchDate')?.value || '';
      const timeVal = document.getElementById('addMatchTime')?.value || '';
      const homeVal = (document.getElementById('addMatchHome')?.value || '').trim();
      const awayVal = (document.getElementById('addMatchAway')?.value || '').trim();
      const leagueVal = (document.getElementById('addMatchLeague')?.value || '').trim();
      const statusVal = (document.getElementById('addMatchStatus')?.value || 'scheduled');

      const homeScore = parseInt(document.getElementById('addMatchHomeScore')?.value || '0', 10) || 0;
      const awayScore = parseInt(document.getElementById('addMatchAwayScore')?.value || '0', 10) || 0;

      // lineups
      const homeFirst = csvToArray(document.getElementById('addHomeFirst')?.value || '');
      const homeSecond = csvToArray(document.getElementById('addHomeSecond')?.value || '');
      const homeThird = csvToArray(document.getElementById('addHomeThird')?.value || '');
      const awayFirst = csvToArray(document.getElementById('addAwayFirst')?.value || '');
      const awaySecond = csvToArray(document.getElementById('addAwaySecond')?.value || '');
      const awayThird = csvToArray(document.getElementById('addAwayThird')?.value || '');

      // stats
      const homePoss = Number(document.getElementById('addHomePoss')?.value || 0) || 0;
      const awayPoss = Number(document.getElementById('addAwayPoss')?.value || 0) || 0;
      const homeShots = Number(document.getElementById('addHomeShots')?.value || 0) || 0;
      const awayShots = Number(document.getElementById('addAwayShots')?.value || 0) || 0;

      // events: 한 줄씩
      const eventsRaw = (document.getElementById('addMatchEvents')?.value || '').trim();
      const events = eventsRaw ? eventsRaw.split('\n').map(s => s.trim()).filter(s => s) : [];

      if (!dateVal || !homeVal || !awayVal) {
        alert('날짜, 홈팀, 원정팀은 필수입니다.');
        return;
      }

      // date 저장 포맷: YYYY-MM-DD (string) — 사용자가 요구한 형식과 호환
      const dateStr = dateVal; // e.g. "2025-05-23"

      // matches 문서 데이터 생성
      const docData = {
        date: dateStr,
        time: timeVal || '',
        homeTeam: homeVal,
        awayTeam: awayVal,
        league: leagueVal || '',
        status: statusVal,
        homeScore: homeScore,
        awayScore: awayScore,
        events: events,
        lineups: {
          home: {
            first: homeFirst,
            second: homeSecond,
            third: homeThird
          },
          away: {
            first: awayFirst,
            second: awaySecond,
            third: awayThird
          }
        },
        stats: {
          homePossession: homePoss,
          awayPossession: awayPoss,
          homeShots: homeShots,
          awayShots: awayShots
        },
        createdBy: auth.currentUser.email,
        createdAt: new Date()
      };

      // 문서 ID 처리: 수동 ID가 있으면 그걸 사용, 없으면 Date.now() 기반 ID (원하면 addDoc로 변경)
      const dbRef = window.firebase;
      let matchRef;
      if (manualId) {
        matchRef = dbRef.doc(db, 'matches', manualId);
        await dbRef.setDoc(matchRef, docData, { merge: true });
      } else {
        // 자동 ID: Date.now().toString()
        const newId = Date.now().toString();
        matchRef = dbRef.doc(db, 'matches', newId);
        await dbRef.setDoc(matchRef, docData, { merge: true });
      }

      alert('경기가 추가되었습니다.');
      closeAddMatchModal();
      await loadUpcomingMatches();

    } catch (err) {
      console.error('경기 추가 실패:', err);
      alert('경기 추가에 실패했습니다. 콘솔을 확인하세요.');
    }
  }

  function setupAdminUIHandlers() {
    const addBtn = document.getElementById('addMatchBtn');
    const closeBtn = document.getElementById('closeAddMatchModal');
    const cancelBtn = document.getElementById('cancelAddMatchBtn');
    const submitBtn = document.getElementById('submitAddMatchBtn');

    if (addBtn) addBtn.addEventListener('click', (e) => { e.preventDefault(); openAddMatchModal(); });
    if (closeBtn) closeBtn.addEventListener('click', (e) => { e.preventDefault(); closeAddMatchModal(); });
    if (cancelBtn) cancelBtn.addEventListener('click', (e) => { e.preventDefault(); closeAddMatchModal(); });
    if (submitBtn) submitBtn.addEventListener('click', (e) => { e.preventDefault(); addMatchToFirestore(); });

    const modal = document.getElementById('addMatchModal');
    if (modal) modal.addEventListener('click', (ev) => { if (ev.target === modal) closeAddMatchModal(); });
  }

  async function initializeModule() {
    try {
      await waitForFirebase();

      window.firebase.onAuthStateChanged(window.auth, async (user) => {
        if (user) {
          const isAdmin = await checkIfAdmin();
          showAddMatchButton(isAdmin);
        } else {
          showAddMatchButton(false);
        }
      });

      if (window.auth && window.auth.currentUser) {
        const isAdminNow = await checkIfAdmin();
        showAddMatchButton(isAdminNow);
      }

      setupAdminUIHandlers();
      await loadUpcomingMatches();

    } catch (e) {
      console.error('업데이트 모듈 초기화 실패:', e);
    }
  }

  window.addEventListener('load', () => {
    setTimeout(() => { initializeModule(); }, 800);
  });

  window.refreshUpcomingMatches = loadUpcomingMatches;

})();
