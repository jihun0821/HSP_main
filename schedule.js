// schedule.js — Firebase matches 컬렉션 전체 불러오기 + 페이지네이션 (8개/페이지)
// 오늘과 가장 가까운 경기를 각 페이지 3번째(index 2) 위치에 고정

(function () {
    'use strict';

    /* ──────────────────────────────────────────
       설정
    ────────────────────────────────────────── */
    const PAGE_SIZE  = 8;  // 한 페이지에 표시할 경기 수
    const ANCHOR_POS = 2;  // 0-based: 3번째 = index 2 로 anchor 고정

    const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

    /* ──────────────────────────────────────────
       Firebase 대기
       3가지 방법을 순서대로 시도:
       1) 이미 window.db가 세팅된 경우 즉시 반환
       2) auth.js가 발행하는 'firebase-ready' 커스텀 이벤트 수신
       3) 폴링 fallback (최대 20초)

       ★ auth.js에 한 줄 추가하면 가장 빠르게 동작합니다:
         window.db = db; 바로 아랫줄에
         window.dispatchEvent(new CustomEvent('firebase-ready'));
    ────────────────────────────────────────── */
    function waitForFirebase() {
        return new Promise((resolve, reject) => {
            // 1) 이미 준비됨
            if (window.db && window.firebase) {
                resolve(window.db);
                return;
            }

            let resolved = false;
            const done = (db) => {
                if (resolved) return;
                resolved = true;
                clearInterval(pollTimer);
                window.removeEventListener('firebase-ready', onReady);
                resolve(db);
            };

            // 2) 커스텀 이벤트 수신
            const onReady = (e) => {
                const db = (e && e.detail && e.detail.db) || window.db;
                if (db && window.firebase) done(db);
            };
            window.addEventListener('firebase-ready', onReady);

            // 3) 폴링 fallback
            let ticks = 0;
            const pollTimer = setInterval(() => {
                ticks++;
                if (window.db && window.firebase) {
                    done(window.db);
                } else if (ticks >= 200) { // 20초
                    clearInterval(pollTimer);
                    window.removeEventListener('firebase-ready', onReady);
                    reject(new Error(
                        '[schedule] Firebase 20초 대기 초과. ' +
                        'auth.js의 window.db = db; 줄 바로 아래에 ' +
                        'window.dispatchEvent(new CustomEvent("firebase-ready")); 를 추가하세요.'
                    ));
                }
            }, 100);
        });
    }

    /* ──────────────────────────────────────────
       날짜 파싱 유틸
    ────────────────────────────────────────── */
    function parseMatchDate(dateField) {
        if (!dateField) return null;
        if (typeof dateField === 'object' && typeof dateField.toDate === 'function') {
            try { return dateField.toDate(); } catch (e) { return null; }
        }
        if (dateField instanceof Date) return dateField;
        if (typeof dateField === 'string') {
            let s = dateField.trim().replace(/\./g, '-').replace(/\//g, '-');
            if (/^\d{1,2}-\d{1,2}$/.test(s)) {
                s = `${new Date().getFullYear()}-${s}`;
            }
            const d = new Date(s);
            if (!isNaN(d.getTime())) return d;
        }
        if (!isNaN(Number(dateField))) {
            const d2 = new Date(Number(dateField));
            if (!isNaN(d2.getTime())) return d2;
        }
        return null;
    }

    function todayMidnight() {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }

    function fmtMonthDay(d) {
        return `${d.getMonth() + 1}/${d.getDate()}`;
    }

    function fmtWeekday(d) {
        return WEEKDAYS[d.getDay()] + '요일';
    }

    /* ──────────────────────────────────────────
       상태 배지
    ────────────────────────────────────────── */
    function statusBadge(status) {
        const map = {
            scheduled: ['badge-scheduled', '예정'],
            finished:  ['badge-finished',  '종료'],
            live:      ['badge-live',       'LIVE'],
            postponed: ['badge-postponed',  '연기'],
        };
        const [cls, label] = map[status] || ['badge-scheduled', status || '예정'];
        return `<span class="match-status-badge ${cls}">${label}</span>`;
    }

    /* ──────────────────────────────────────────
       경기 카드 HTML 생성
    ────────────────────────────────────────── */
    function buildCard(match, isAnchor) {
        const d    = match.dateObj;
        const data = match.raw;

        const home   = data.homeTeam || '미정';
        const away   = data.awayTeam || '미정';
        const league = data.league   || '';

        const showScore = data.status === 'finished' || data.status === 'live';
        const scoreHTML = showScore
            ? `<div class="score-block">
                   <span>${data.homeScore ?? '-'}</span>
                   <span class="score-dash">:</span>
                   <span>${data.awayScore ?? '-'}</span>
               </div>`
            : `<span class="score-dash">vs</span>`;

        const timeText = data.time
            ? `<div class="match-time-text">${data.time}</div>`
            : '';

        return `
        <div class="match-card${isAnchor ? ' anchor' : ''}" data-id="${match.id}">
            <div class="match-date-block">
                <div class="match-month-day">${fmtMonthDay(d)}</div>
                <div class="match-weekday">${fmtWeekday(d)}</div>
                ${timeText}
            </div>
            <div class="match-teams-block">
                <span class="team-name-text">${home}</span>
                ${scoreHTML}
                <span class="team-name-text">${away}</span>
            </div>
            ${league ? `<span class="match-league-tag">${league}</span>` : ''}
            ${statusBadge(data.status)}
        </div>`;
    }

    /* ──────────────────────────────────────────
       페이지 계산
       anchor를 ANCHOR_POS 슬롯에 고정,
       나머지를 날짜 순으로 채움
    ────────────────────────────────────────── */
    function computePages(allMatches, anchorIdx) {
        const anchor = allMatches[anchorIdx];
        const others = allMatches.filter((_, i) => i !== anchorIdx);

        const othersPerPage = PAGE_SIZE - 1;
        const totalPages    = Math.max(1, Math.ceil(others.length / othersPerPage));

        // anchor보다 날짜가 이전/같은 other 수로 anchor 페이지 결정
        const beforeAnchor = others.filter(m => m.dateObj <= anchor.dateObj).length;
        const anchorPage   = Math.min(Math.floor(beforeAnchor / othersPerPage), totalPages - 1);

        const pages = [];
        for (let p = 0; p < totalPages; p++) {
            const start      = p * othersPerPage;
            const pageOthers = others.slice(start, start + othersPerPage);

            if (p !== anchorPage) {
                // anchor 없는 페이지: others만 채움
                pages.push(pageOthers.map(m => ({ match: m, isAnchor: false })));
            } else {
                // anchor 페이지: ANCHOR_POS 슬롯에 anchor 삽입
                const slots = [];
                let oi = 0;
                for (let s = 0; s < PAGE_SIZE; s++) {
                    if (s === ANCHOR_POS) {
                        slots.push({ match: anchor, isAnchor: true });
                    } else if (oi < pageOthers.length) {
                        slots.push({ match: pageOthers[oi++], isAnchor: false });
                    }
                }
                pages.push(slots);
            }
        }

        return { pages, anchorPage };
    }

    /* ──────────────────────────────────────────
       상태
    ────────────────────────────────────────── */
    const state = {
        pages:       [],
        anchorPage:  0,
        currentPage: 0,
        totalPages:  0,
    };

    /* ──────────────────────────────────────────
       렌더링
    ────────────────────────────────────────── */
    function renderPage(pageIdx) {
        const listEl  = document.getElementById('matchList');
        const pgEl    = document.getElementById('pagination');
        const pgNums  = document.getElementById('pageNumbers');
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');
        if (!listEl) return;

        state.currentPage = pageIdx;
        const slots = state.pages[pageIdx] || [];

        listEl.innerHTML = slots.map(({ match, isAnchor }) =>
            buildCard(match, isAnchor)
        ).join('');

        // 카드 클릭 → 상세 패널
        listEl.querySelectorAll('.match-card').forEach(card => {
            card.addEventListener('click', () => {
                const mid = card.dataset.id;
                if (!mid) return;
                if (window.todayMatchManager &&
                    typeof window.todayMatchManager.loadMatchDetails === 'function') {
                    window.todayMatchManager.loadMatchDetails(mid)
                        .catch(err => console.error('상세정보 로드 실패:', err));
                }
            });
        });

        // 이전/다음 버튼
        prevBtn.disabled = (pageIdx === 0);
        nextBtn.disabled = (pageIdx >= state.totalPages - 1);

        // 페이지 번호
        pgNums.innerHTML = '';
        buildPageRange(pageIdx, state.totalPages).forEach(p => {
            if (p === '...') {
                const span = document.createElement('span');
                span.textContent = '…';
                span.style.cssText = 'padding:0 4px;color:#bbb;font-size:13px;align-self:center;';
                pgNums.appendChild(span);
            } else {
                const btn = document.createElement('button');
                btn.className = 'page-num-btn' + (p === pageIdx ? ' active' : '');
                btn.textContent = p + 1;
                if (p !== pageIdx) btn.addEventListener('click', () => renderPage(p));
                pgNums.appendChild(btn);
            }
        });

        pgEl.style.display = state.totalPages > 1 ? 'flex' : 'none';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function buildPageRange(current, total) {
        if (total <= 7) return Array.from({ length: total }, (_, i) => i);
        const result = [];
        const left = current - 2, right = current + 2;
        for (let i = 0; i < total; i++) {
            if (i === 0 || i === total - 1 || (i >= left && i <= right)) {
                result.push(i);
            } else if (result[result.length - 1] !== '...') {
                result.push('...');
            }
        }
        return result;
    }

    /* ──────────────────────────────────────────
       오늘과 가장 가까운 경기 인덱스
    ────────────────────────────────────────── */
    function findClosestMatchIndex(sorted, today) {
        for (let i = 0; i < sorted.length; i++) {
            const d = new Date(sorted[i].dateObj);
            d.setHours(0, 0, 0, 0);
            if (d >= today) return i;
        }
        return sorted.length - 1; // 전부 과거면 마지막
    }

    /* ──────────────────────────────────────────
       메인 로직
    ────────────────────────────────────────── */
    async function loadAllMatches() {
        const loadingEl = document.getElementById('scheduleLoading');
        const emptyEl   = document.getElementById('scheduleEmpty');
        const listEl    = document.getElementById('matchList');

        try {
            const db = await waitForFirebase();

            const snap = await window.firebase.getDocs(
                window.firebase.collection(db, 'matches')
            );

            const raw = [];
            snap.forEach(docSnap => {
                const data    = docSnap.data();
                const dateObj = parseMatchDate(data.date);
                if (!dateObj) return;
                raw.push({ id: docSnap.id, raw: data, dateObj });
            });

            raw.sort((a, b) => a.dateObj - b.dateObj);

            if (loadingEl) loadingEl.style.display = 'none';

            if (raw.length === 0) {
                if (emptyEl) emptyEl.style.display = 'block';
                return;
            }

            if (listEl) listEl.style.display = 'flex';

            const today     = todayMidnight();
            const anchorIdx = findClosestMatchIndex(raw, today);

            const { pages, anchorPage } = computePages(raw, anchorIdx);
            state.pages       = pages;
            state.anchorPage  = anchorPage;
            state.totalPages  = pages.length;
            state.currentPage = anchorPage;

            renderPage(anchorPage);

        } catch (err) {
            console.error('경기 일정 로드 실패:', err);
            if (loadingEl) loadingEl.style.display = 'none';
            if (emptyEl) {
                emptyEl.textContent = '경기 정보를 불러오지 못했습니다.';
                emptyEl.style.display = 'block';
            }
        }
    }

    /* ──────────────────────────────────────────
       페이지네이션 이벤트 바인딩
    ────────────────────────────────────────── */
    function bindPaginationEvents() {
        document.getElementById('prevPageBtn')?.addEventListener('click', () => {
            if (state.currentPage > 0) renderPage(state.currentPage - 1);
        });
        document.getElementById('nextPageBtn')?.addEventListener('click', () => {
            if (state.currentPage < state.totalPages - 1) renderPage(state.currentPage + 1);
        });
    }

    /* ──────────────────────────────────────────
       초기화
    ────────────────────────────────────────── */
    window.addEventListener('load', () => {
        bindPaginationEvents();
        loadAllMatches();
    });

    // 외부 수동 호출용
    window.loadSchedule = loadAllMatches;

})();
