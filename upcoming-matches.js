// upcoming-matches.js - 예정된 경기 일정을 표시하는 스크립트 (오늘 제외, 가장 가까운 5경기, 클릭 시 상세 패널 오픈)
// 관리자 전용: 경기 추가 버튼 표시 및 경기 추가 기능
// (수정: 경기일정 카드 탐색 로직을 강화하여 h4 내부에 버튼이 있어도 정상적으로 찾습니다.)

(function() {
  console.log('upcoming-matches.js 로드됨');

  // Firebase 초기화 대기 (더 긴 타임아웃과 함께)
  function waitForFirebase() {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 50; // 50 * 100ms = 5초
      const checkInterval = setInterval(() => {
        attempts++;
        console.log(`Firebase 확인 시도 ${attempts}/${maxAttempts}...`, {
          firebase: !!window.firebase,
          db: !!window.db
        });

        if (window.firebase && window.db) {
          clearInterval(checkInterval);
          console.log('Firebase 준비 완료!');
          resolve();
        } else if (attempts >= maxAttempts) {
          clearInterval(checkInterval);
          console.error('Firebase 초기화 타임아웃');
          reject(new Error('Firebase 초기화 실패'));
        }
      }, 100);
    });
  }

  // 날짜를 "M/D" 형식으로 포맷
  function formatDateShort(date) {
    try {
      const month = date.getMonth() + 1;
      const day = date.getDate();
      return `${month}/${day}`;
    } catch (e) {
      return '-';
    }
  }

  // match.date 필드에서 Date 객체를 안전하게 파싱
  function parseMatchDate(dateField) {
    if (!dateField) return null;

    // Firestore Timestamp (has toDate)
    if (typeof dateField === 'object' && typeof dateField.toDate === 'function') {
      try {
        return dateField.toDate();
      } catch (e) {
        return null;
      }
    }

    // 이미 Date 객체인 경우
    if (dateField instanceof Date) {
      return dateField;
    }

    // 문자열인 경우 (다양한 포맷 대응)
    if (typeof dateField === 'string') {
      let s = dateField.trim();
      s = s.replace(/\./g, '-').replace(/\//g, '-');

      if (/^\d{1,2}-\d{1,2}$/.test(s)) {
        const y = new Date().getFullYear();
        s = `${y}-${s}`;
      }

      const d = new Date(s);
      if (!isNaN(d.getTime())) {
        return d;
      }

      const num = Number(dateField);
      if (!isNaN(num)) {
        const d2 = new Date(num);
        if (!isNaN(d2.getTime())) return d2;
      }
    }

    return null;
  }

  // 오늘(로컬) 시작 시점 (시간 제거)
  function getTodayStart() {
    const t = new Date();
    t.setHours(0,0,0,0);
    return t;
  }

  // ------------ 관리자 관련 유틸 ------------
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

  // ------------ 경기 로드 / 렌더링 ------------
  async function loadUpcomingMatches() {
    try {
      console.log('경기 일정 로딩 시작...');
      await waitForFirebase();
      const db = window.db;

      const qSnap = await window.firebase.getDocs(
        window.firebase.query(
          window.firebase.collection(db, 'matches'),
          window.firebase.where('status', '==', 'scheduled')
        )
      );

      console.log('scheduled 경기 조회 완료, 문서 수:', qSnap.size);

      const todayStart = getTodayStart();
      const matches = [];
      qSnap.forEach((doc) => {
        const data = doc.data();
        const parsedDate = parseMatchDate(data.date);
        if (!parsedDate) return;

        const dOnly = new Date(parsedDate);
        dOnly.setHours(0,0,0,0);

        // 오늘 제외 (strictly after)
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

      console.log('선택된 예정 경기 수:', upcomingMatches.length, upcomingMatches);

      displayUpcomingMatches(upcomingMatches);

    } catch (error) {
      console.error('경기 일정 로딩 오류:', error);
      displayError();
    }
  }

  // 경기 일정 표시
  function displayUpcomingMatches(matches) {
    // 변경: h4 안에 버튼 등이 있어도 '경기일정' 텍스트가 포함된 카드를 찾도록 강화
    const listCards = document.querySelectorAll('.side-lists .list-card');
    let container = null;

    listCards.forEach(card => {
      const titleEl = card.querySelector('.list-title');
      if (!titleEl) return;

      // titleEl.textContent에 버튼 텍스트가 포함될 수 있으므로 공백 제거 후 포함 검사
      const rawText = titleEl.textContent || '';
      const compact = rawText.replace(/\s+/g, ' ').trim(); // 줄바꿈/여백 정리
      // 디버그: 콘솔에 실제 텍스트 확인
      console.log('list-card title text:', JSON.stringify(compact));

      // '경기일정'이라는 단어가 포함되어 있으면 해당 카드로 판단
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

    console.log('경기일정 표시 완료');
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

  // ------------ 관리자용: 경기 추가 기능 ------------
  function openAddMatchModal() {
    const modal = document.getElementById('addMatchModal');
    if (!modal) return;
    modal.style.display = 'flex';
  }

  function closeAddMatchModal() {
    const modal = document.getElementById('addMatchModal');
    if (!modal) return;
    modal.style.display = 'none';
    // 폼 초기화
    const f = document;
    if (f.getElementById('addMatchDate')) f.getElementById('addMatchDate').value = '';
    if (f.getElementById('addMatchTime')) f.getElementById('addMatchTime').value = '';
    if (f.getElementById('addMatchHome')) f.getElementById('addMatchHome').value = '';
    if (f.getElementById('addMatchAway')) f.getElementById('addMatchAway').value = '';
    if (f.getElementById('addMatchLeague')) f.getElementById('addMatchLeague').value = '';
  }

  async function addMatchToFirestore() {
    try {
      const auth = window.auth;
      const db = window.db;
      if (!auth || !auth.currentUser) {
        alert('로그인된 관리자만 경기 추가가 가능합니다.');
        return;
      }

      // 재확인: 실제로 관리자 권한 있는지 확인
      const isAdmin = await checkIfAdmin();
      if (!isAdmin) {
        alert('관리자 권한이 필요합니다.');
        showAddMatchButton(false);
        return;
      }

      const dateVal = document.getElementById('addMatchDate').value;
      const timeVal = document.getElementById('addMatchTime').value;
      const homeVal = document.getElementById('addMatchHome').value.trim();
      const awayVal = document.getElementById('addMatchAway').value.trim();
      const leagueVal = document.getElementById('addMatchLeague').value.trim();

      if (!dateVal || !homeVal || !awayVal) {
        alert('날짜, 홈팀, 원정팀은 필수입니다.');
        return;
      }

      // Date 객체 생성 (time이 없으면 정오로 설정)
      let dateObj;
      if (timeVal) {
        dateObj = new Date(`${dateVal}T${timeVal}`);
      } else {
        dateObj = new Date(dateVal);
        dateObj.setHours(12,0,0,0);
      }

      // 문서 ID 자동 생성 방식: timestamp 기반 ID
      const newId = Date.now().toString();

      const matchRef = window.firebase.doc(db, 'matches', newId);
      await window.firebase.setDoc(matchRef, {
        date: dateObj,
        time: timeVal || '',
        homeTeam: homeVal,
        awayTeam: awayVal,
        league: leagueVal || '',
        status: 'scheduled',
        createdBy: auth.currentUser.email,
        createdAt: new Date()
      }, { merge: true });

      alert('경기가 추가되었습니다.');
      closeAddMatchModal();
      // 목록 새로고침
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

    if (addBtn) {
      addBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openAddMatchModal();
      });
    }
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        closeAddMatchModal();
      });
    }
    if (cancelBtn) {
      cancelBtn.addEventListener('click', (e) => {
        e.preventDefault();
        closeAddMatchModal();
      });
    }
    if (submitBtn) {
      submitBtn.addEventListener('click', (e) => {
        e.preventDefault();
        addMatchToFirestore();
      });
    }

    // 모달 영역 밖 클릭 시 닫기 (선택적)
    const modal = document.getElementById('addMatchModal');
    if (modal) {
      modal.addEventListener('click', (ev) => {
        if (ev.target === modal) closeAddMatchModal();
      });
    }
  }

  // ------------ 초기화 및 Auth 상태 감시 ------------
  async function initializeModule() {
    try {
      await waitForFirebase();

      // auth 상태 변화 감지해서 관리자 버튼 보이기/숨기기
      window.firebase.onAuthStateChanged(window.auth, async (user) => {
        if (user) {
          const isAdmin = await checkIfAdmin();
          showAddMatchButton(isAdmin);
        } else {
          showAddMatchButton(false);
        }
      });

      // 초기 검사 (이미 로그인된 상태인 경우)
      if (window.auth && window.auth.currentUser) {
        const isAdminNow = await checkIfAdmin();
        showAddMatchButton(isAdminNow);
      }

      setupAdminUIHandlers();

      // 예정 경기 로드
      await loadUpcomingMatches();

    } catch (e) {
      console.error('업데이트 모듈 초기화 실패:', e);
    }
  }

  window.addEventListener('load', () => {
    console.log('window.load 이벤트 발생 - 예정 경기 로딩 및 관리자 UI 초기화');
    setTimeout(() => {
      initializeModule();
    }, 800);
  });

  // 외부에서 수동 새로고침할 수 있도록 노출 (디버깅용)
  window.refreshUpcomingMatches = loadUpcomingMatches;

})();
