// schedule.js — Firebase matches 컬렉션 전체 불러오기 + 페이지네이션 (8개/페이지)
// 오늘과 가장 가까운 경기를 각 페이지 3번째(index 2) 위치에 고정

(function () {
    'use strict';

    /* ──────────────────────────────────────────
       설정
    ────────────────────────────────────────── */
    const PAGE_SIZE   = 8;   // 한 페이지에 표시할 경기 수
    const ANCHOR_POS  = 2;   // 0-based: 3번째 = index 2 로 anchor 고정

    const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

    /* ──────────────────────────────────────────
       Firebase 대기
    ────────────────────────────────────────── */
    function waitForFirebase() {
        return new Promise((resolve, reject) => {
            let n = 0;
            const t = setInterval(() => {
                n++;
                if (window.firebase && window.db) {
                    clearInterval(t);
                    resolve();
                } else if (n >= 80) {
                    clearInterval(t);
                    reject(new Error('Firebase 초기화 타임아웃'));
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
            scheduled : ['badge-scheduled', '예정'],
            finished  : ['badge-finished',  '종료'],
            live      : ['badge-live',       'LIVE'],
            postponed : ['badge-postponed',  '연기'],
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

        const home  = data.homeTeam || '미정';
        const away  = data.awayTeam || '미정';
        const league = data.league  || '';

        const isFinished = data.status === 'finished' || data.status === 'live';
        let scoreHTML;
        if (isFinished) {
            scoreHTML = `
                <div class="score-block">
                    <span>${data.homeScore ?? '-'}</span>
                    <span class="score-dash">:</span>
                    <span>${data.awayScore ?? '-'}</span>
                </div>`;
        } else {
            scoreHTML = `<span class="score-dash">vs</span>`;
        }

        const timeText = data.time ? `<div class="match-time-text">${data.time}</div>` : '';

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
       anchor(가장 가까운 경기)를 각 페이지 ANCHOR_POS 번째에 고정하고
       나머지 슬롯을 날짜 순으로 채운다.

       핵심 알고리즘:
         - 전체 경기를 날짜 오름차순 정렬
         - anchor 인덱스(전체 정렬 기준)를 구함
         - anchor가 속해야 할 페이지 = floor(anchorGlobalIdx / (PAGE_SIZE - 1))
           단, 각 페이지에서 ANCHOR_POS 슬롯은 anchor 전용이므로
           나머지 7개 슬롯으로 페이지를 구성 → 전체 페이지 수 계산
         - 각 페이지에서 ANCHOR_POS(=2)번 슬롯 = anchor
           나머지 슬롯 = anchor를 제외한 나머지 경기들을 순서대로 배치
    ────────────────────────────────────────── */
    function computePages(allMatches, anchorIdx) {
        // anchor를 제외한 나머지 경기들
        const others = allMatches.filter((_, i) => i !== anchorIdx);
        const anchor = allMatches[anchorIdx];

        // 페이지 당 'others' 슬롯 수
        const othersPerPage = PAGE_SIZE - 1;

        // 전체 페이지 수
        const totalPages = Math.max(1, Math.ceil(others.length / othersPerPage));

        // anchor가 포함될 페이지: others 배열에서 anchor 직전 항목들로 결정
        // anchor보다 날짜가 이전인 other 항목 수 기준
        const beforeAnchor = others.filter(m => m.dateObj <= anchor.dateObj).length;
        const anchorPage   = Math.min(Math.floor(beforeAnchor / othersPerPage), totalPages - 1);

        // 각 페이지 구성
        const pages = [];
        for (let p = 0; p < totalPages; p++) {
            const sliceStart = p * othersPerPage;
            const sliceEnd   = sliceStart + othersPerPage;
            const pageOthers = others.slice(sliceStart, sliceEnd);

            // ANCHOR_POS 슬롯에 anchor 삽입, 나머지를 순서대로 채움
            const slots = [];
            let oi = 0;
            for (let s = 0; s < PAGE_SIZE; s++) {
                if (s === ANCHOR_POS && p === anchorPage) {
                    slots.push({ match: anchor, isAnchor: true });
                } else if (oi < pageOthers.length) {
                    slots.push({ match: pageOthers[oi++], isAnchor: false });
                }
            }

            // anchor 페이지가 아닌 페이지에 남은 others도 순서대로 채움
            if (p !== anchorPage) {
                // slots에 anchor가 없으므로 PAGE_SIZE 슬롯 그냥 others로 채움
                const plain = others.slice(sliceStart, sliceEnd);
                pages.push(plain.map(m => ({ match: m, isAnchor: false })));
            } else {
                pages.push(slots);
            }
        }

        return { pages, anchorPage };
    }

    /* ──────────────────────────────────────────
       렌더링
    ────────────────────────────────────────── */
    let state = {
        pages      : [],
        anchorPage : 0,
        currentPage: 0,
        totalPages : 0,
    };

    function renderPage(pageIdx) {
        const listEl   = document.getElementById('matchList');
        const pgEl     = document.getElementById('pagination');
        const pgNums   = document.getElementById('pageNumbers');
        const prevBtn  = document.getElementById('prevPageBtn');
        const nextBtn  = document.getElementById('nextPageBtn');

        if (!listEl) return;

        state.currentPage = pageIdx;
        const slots = state.pages[pageIdx] || [];

        listEl.innerHTML = slots.map(({ match, isAnchor }) =>
            buildCard(match, isAnchor)
        ).join('');

        // 카드 클릭: todayMatchManager가 있으면 상세 패널 열기
        listEl.querySelectorAll('.match-card').forEach(card => {
            card.addEventListener('click', () => {
                const mid = card.dataset.id;
                if (!mid) return;
                if (window.todayMatchManager && typeof window.todayMatchManager.loadMatchDetails === 'function') {
                    window.todayMatchManager.loadMatchDetails(mid).catch(err => {
                        console.error('상세정보 로드 실패:', err);
                    });
                }
            });
        });

        // 페이지네이션 버튼
        prevBtn.disabled = (pageIdx === 0);
        nextBtn.disabled = (pageIdx >= state.totalPages - 1);

        // 페이지 번호 버튼
        pgNums.innerHTML = '';
        // 최대 7개 페이지 번호만 표시 (앞뒤 ...은 생략, 단순 처리)
        const range = buildPageRange(pageIdx, state.totalPages);
        range.forEach(p => {
            if (p === '...') {
                const span = document.createElement('span');
                span.textContent = '…';
                span.style.cssText = 'padding:0 4px; color:#bbb; font-size:13px; align-self:center;';
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

        // anchor 페이지 표시 스크롤
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function buildPageRange(current, total) {
        if (total <= 7) return Array.from({ length: total }, (_, i) => i);
        const result = [];
        const delta = 2;
        const left  = current - delta;
        const right = current + delta;

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
       메인 로직
    ────────────────────────────────────────── */
    async function loadAllMatches() {
        const loadingEl = document.getElementById('scheduleLoading');
        const emptyEl   = document.getElementById('scheduleEmpty');
        const listEl    = document.getElementById('matchList');

        try {
            await waitForFirebase();
            const db = window.db;

            const snap = await window.firebase.getDocs(
                window.firebase.collection(db, 'matches')
            );

            const raw = [];
            snap.forEach(docSnap => {
                const data = docSnap.data();
                const dateObj = parseMatchDate(data.date);
                if (!dateObj) return;
                raw.push({ id: docSnap.id, raw: data, dateObj });
            });

            // 날짜 오름차순 정렬
            raw.sort((a, b) => a.dateObj - b.dateObj);

            if (loadingEl) loadingEl.style.display = 'none';

            if (raw.length === 0) {
                if (emptyEl) emptyEl.style.display = 'block';
                return;
            }

            if (listEl) listEl.style.display = 'flex';

            // 오늘과 가장 가까운 경기 찾기
            const today   = todayMidnight();
            let anchorIdx = findClosestMatchIndex(raw, today);

            // 페이지 분할
            const { pages, anchorPage } = computePages(raw, anchorIdx);
            state.pages       = pages;
            state.anchorPage  = anchorPage;
            state.totalPages  = pages.length;
            state.currentPage = anchorPage;

            // anchor 페이지로 바로 이동
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

    /**
     * 오늘 날짜와 가장 가까운 경기의 인덱스 반환
     * 우선순위: 오늘 이후 첫 경기 > 오늘 당일 경기 > 없으면 가장 최근 과거 경기
     */
    function findClosestMatchIndex(sorted, today) {
        // 1. 오늘 이후(오늘 포함) 경기 중 가장 첫 번째
        for (let i = 0; i < sorted.length; i++) {
            const d = new Date(sorted[i].dateObj);
            d.setHours(0, 0, 0, 0);
            if (d >= today) return i;
        }
        // 2. 전부 과거면 마지막 경기
        return sorted.length - 1;
    }

    /* ──────────────────────────────────────────
       이벤트 바인딩
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
        // Firebase auth.js 등이 window.db를 세팅할 시간을 준 뒤 실행
        setTimeout(loadAllMatches, 600);
    });

})();
