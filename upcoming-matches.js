// upcoming-matches.js - 예정된 경기 일정을 표시하는 스크립트 (오늘 제외, 가장 가까운 5경기, 클릭 시 상세 패널 오픈)

(function() {
  console.log('upcoming-matches.js 로드됨');

  // Firebase 초기화 대기 (더 긴 타임아웃과 함께)
  function waitForFirebase() {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 50; // 50 * 100ms = 5초
      const checkInterval = setInterval(() => {
        attempts++;
        // console 디버그
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
      // 흔한 포맷 보정: "2024.09.15" -> "2024-09-15"
      let s = dateField.trim();
      s = s.replace(/\./g, '-').replace(/\//g, '-');

      // 경우에 따라 "MM-DD" 형식일 수 있으니 현재 연도로 보정
      if (/^\d{1,2}-\d{1,2}$/.test(s)) {
        const y = new Date().getFullYear();
        s = `${y}-${s}`;
      }

      // Date 생성
      const d = new Date(s);
      if (!isNaN(d.getTime())) {
        return d;
      }

      // 마지막 시도: 숫자 타임스탬프 문자열
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

  // 경기 일정 불러오기
  async function loadUpcomingMatches() {
    try {
      console.log('경기 일정 로딩 시작...');
      await waitForFirebase();
      const db = window.db;

      // scheduled 상태의 모든 경기 가져오기
      const qSnap = await window.firebase.getDocs(
        window.firebase.query(
          window.firebase.collection(db, 'matches'),
          window.firebase.where('status', '==', 'scheduled')
        )
      );

      console.log('scheduled 경기 조회 완료, 문서 수:', qSnap.size);

      const todayStart = getTodayStart();
      // 오늘을 제외하고 '오늘 이후'의 경기만 선택 (strictly after today)
      const matches = [];
      qSnap.forEach((doc) => {
        const data = doc.data();
        const parsedDate = parseMatchDate(data.date);
        if (!parsedDate) return;

        // 날짜만 비교 (시간 무시)
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

      // 날짜순 정렬 (오름차순)
      matches.sort((a, b) => a.dateObj - b.dateObj);

      // 가장 가까운 5경기 선택
      const upcomingMatches = matches.slice(0, 5);

      console.log('선택된 예정 경기 수:', upcomingMatches.length, upcomingMatches);

      displayUpcomingMatches(upcomingMatches);

    } catch (error) {
      console.error('경기 일정 로딩 오류:', error);
      displayError();
    }
  }

  // 경기 일정 표시
  function displayUpcomingMatches(matches) {
    // "경기일정" 카드의 list-items 컨테이너 찾기
    const listCards = document.querySelectorAll('.side-lists .list-card');
    let container = null;

    listCards.forEach(card => {
      const title = card.querySelector('.list-title');
      if (title && title.textContent.trim() === '경기일정') {
        container = card.querySelector('.list-items');
      }
    });

    if (!container) {
      console.error('경기일정 컨테이너를 찾을 수 없습니다');
      return;
    }

    // 비어있을 때 처리
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

    // 각 경기 항목 생성 (클릭 가능)
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

      // 클릭 시 상세 패널 열기 (전역 todayMatchManager 사용)
      li.addEventListener('click', (e) => {
        e.preventDefault();
        const mid = li.dataset.matchId;
        if (!mid) return;
        // 만약 todayMatchManager가 로드되어 있으면 호출
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

  // 오류 표시
  function displayError() {
    const listCards = document.querySelectorAll('.side-lists .list-card');
    let container = null;

    listCards.forEach(card => {
      const title = card.querySelector('.list-title');
      if (title && title.textContent.trim() === '경기일정') {
        container = card.querySelector('.list-items');
      }
    });

    if (!container) return;

    container.innerHTML = '';
    const li = document.createElement('li');
    li.className = 'list-item';
    const span = document.createElement('span');
    span.style.color = '#e74c3c';
    span.textContent = '불러오기 실패';
    li.appendChild(span);
    container.appendChild(li);
  }

  // 페이지 로드 시 실행
  window.addEventListener('load', () => {
    console.log('window.load 이벤트 발생 - 예정 경기 로딩 시작');
    setTimeout(() => {
      loadUpcomingMatches();
    }, 1000);
  });

  // 외부에서 수동 새로고침할 수 있도록 노출 (디버깅용)
  window.refreshUpcomingMatches = loadUpcomingMatches;

})();
