// room-setting.js
// 호실 설정 및 다음 경기 표시 기능
// 다른 스크립트와 독립적으로 동작

(function () {
    const ROOMS = [
        'C101','C102','C103','C104','C105','C106',
        'C201','C202','C203','C204','C205','C206','C207',
        'C301','C302','C303','C304','C305','C306','C307'
    ];

    // ── 모달 HTML 삽입 ───────────────────────────────────────────────
    function injectRoomModal() {
        if (document.getElementById('roomSelectModal')) return;

        const modal = document.createElement('div');
        modal.id = 'roomSelectModal';
        modal.style.cssText = `
            display:none; position:fixed; inset:0; background:rgba(0,0,0,.5);
            z-index:9999; align-items:center; justify-content:center;
        `;

        const floors = {
            '1층': ROOMS.filter(r => r.startsWith('C1')),
            '2층': ROOMS.filter(r => r.startsWith('C2')),
            '3층': ROOMS.filter(r => r.startsWith('C3')),
        };

        let btnHTML = '';
        for (const [label, rooms] of Object.entries(floors)) {
            btnHTML += `<div style="margin-bottom:14px;">
                <div style="font-size:13px;color:#888;margin-bottom:6px;">${label}</div>
                <div style="display:flex;flex-wrap:wrap;gap:8px;">`;
            rooms.forEach(r => {
                btnHTML += `<button class="room-btn" data-room="${r}"
                    style="padding:8px 16px;border:2px solid #ddd;border-radius:8px;
                           background:#fff;cursor:pointer;font-size:14px;font-weight:600;
                           transition:all .2s;" 
                    onmouseover="this.style.borderColor='#27AE60';this.style.color='#27AE60';"
                    onmouseout="this.style.borderColor='#ddd';this.style.color='';"
                >${r}</button>`;
            });
            btnHTML += `</div></div>`;
        }

        modal.innerHTML = `
            <div style="background:#fff;border-radius:14px;padding:28px 32px;
                        max-width:400px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,.18);">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
                    <h3 style="margin:0;font-size:18px;">호실 선택</h3>
                    <span id="closeRoomModal" style="font-size:22px;cursor:pointer;color:#999;line-height:1;">&times;</span>
                </div>
                ${btnHTML}
                <div style="text-align:right;margin-top:8px;">
                    <button id="clearRoomBtn" style="background:none;border:none;color:#aaa;
                        font-size:13px;cursor:pointer;text-decoration:underline;">호실 설정 해제</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // 이벤트
        modal.querySelector('#closeRoomModal').addEventListener('click', closeRoomModal);
        modal.addEventListener('click', e => { if (e.target === modal) closeRoomModal(); });

        modal.querySelectorAll('.room-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const room = btn.dataset.room;
                saveRoom(room);
                closeRoomModal();
                loadNextMatch(room);
                highlightSelected(room);
            });
        });

        modal.querySelector('#clearRoomBtn').addEventListener('click', () => {
            clearRoom();
            closeRoomModal();
        });
    }

    function openRoomModal() {
        const modal = document.getElementById('roomSelectModal');
        if (!modal) return;
        modal.style.display = 'flex';
        // 현재 저장된 호실 하이라이트
        const saved = getSavedRoom();
        if (saved) highlightSelected(saved);
    }

    function closeRoomModal() {
        const modal = document.getElementById('roomSelectModal');
        if (modal) modal.style.display = 'none';
    }

    function highlightSelected(room) {
        document.querySelectorAll('.room-btn').forEach(btn => {
            const isSelected = btn.dataset.room === room;
            btn.style.background = isSelected ? '#27AE60' : '#fff';
            btn.style.color = isSelected ? '#fff' : '';
            btn.style.borderColor = isSelected ? '#27AE60' : '#ddd';
        });
    }

    // ── 로컬 저장 ─────────────────────────────────────────────────
    function saveRoom(room) { localStorage.setItem('hsp_user_room', room); }
    function getSavedRoom() { return localStorage.getItem('hsp_user_room'); }
    function clearRoom() {
        localStorage.removeItem('hsp_user_room');
        renderRoomUI(false);
    }

    // ── UI 전환 ──────────────────────────────────────────────────
    // 로그인 후: classRank/totalRank 영역을 호실 버튼으로 교체
    function renderRoomUI(isLoggedIn) {
        // profile-stats 안의 마지막 div (classRank/totalRank 포함)
        const profileCard = document.querySelector('.profile-card');
        if (!profileCard) return;

        // 기존 호실 래퍼 제거 후 재생성
        const existing = profileCard.querySelector('.room-info-wrapper');
        if (existing) existing.remove();

        const statsDiv = profileCard.querySelector('.profile-stats');
        if (!statsDiv) return;

        // classRank / totalRank span이 있는 div 숨김/표시
        const rankDiv = statsDiv.querySelector('div:last-child');

        if (!isLoggedIn) {
            if (rankDiv) rankDiv.style.display = '';
            return;
        }

        // 로그인 상태: 기존 div 숨기고 호실 버튼 추가
        if (rankDiv) rankDiv.style.display = 'none';

        const wrapper = document.createElement('div');
        wrapper.className = 'room-info-wrapper';
        wrapper.style.cssText = 'margin-top:4px;';

        const saved = getSavedRoom();
        if (saved) {
            wrapper.innerHTML = `
                <div style="font-size:13px;color:#555;margin-bottom:4px;">
                    <span style="font-weight:700;color:#27AE60;">${saved}</span>
                    <button class="room-set-btn" style="margin-left:8px;font-size:11px;
                        padding:2px 8px;border:1px solid #27AE60;border-radius:6px;
                        background:#fff;color:#27AE60;cursor:pointer;">변경</button>
                </div>
                <div id="nextMatchInfo" style="font-size:12px;color:#777;">경기 불러오는 중...</div>
            `;
        } else {
            wrapper.innerHTML = `
                <button class="room-set-btn" style="font-size:12px;padding:5px 12px;
                    border:1.5px solid #27AE60;border-radius:8px;background:#fff;
                    color:#27AE60;cursor:pointer;margin-top:2px;">🏠 호실 설정</button>
            `;
        }

        statsDiv.appendChild(wrapper);

        wrapper.querySelectorAll('.room-set-btn').forEach(btn => {
            btn.addEventListener('click', openRoomModal);
        });

        if (saved) loadNextMatch(saved);
    }

    // ── Firebase에서 다음 경기 조회 ──────────────────────────────
    async function loadNextMatch(room) {
        const infoEl = document.getElementById('nextMatchInfo');
        if (infoEl) infoEl.textContent = '경기 불러오는 중...';

        // Firebase 준비 대기
        let waited = 0;
        while ((!window.db || !window.firebase) && waited < 5000) {
            await new Promise(r => setTimeout(r, 200));
            waited += 200;
        }
        if (!window.db || !window.firebase) {
            if (infoEl) infoEl.textContent = '데이터 연결 오류';
            return;
        }

        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const { collection, getDocs } = window.firebase;
            const matchesRef = collection(window.db, 'matches');
            const snapshot = await getDocs(matchesRef);

            let best = null;
            let bestDiff = Infinity;

            snapshot.forEach(docSnap => {
                const d = docSnap.data();

                // 이 경기에 해당 호실이 참여하는지 확인
                const homeTeam = d.homeTeam || d.home_team || d.home || '';
                const awayTeam = d.awayTeam || d.away_team || d.away || '';
                const isInvolved = homeTeam === room || awayTeam === room;
                if (!isInvolved) return;

                // 날짜 파싱
                let matchDate = null;
                if (d.date) {
                    if (d.date.toDate) {
                        matchDate = d.date.toDate();
                    } else {
                        matchDate = new Date(d.date);
                    }
                } else if (d.matchDate) {
                    matchDate = d.matchDate.toDate ? d.matchDate.toDate() : new Date(d.matchDate);
                }
                if (!matchDate || isNaN(matchDate)) return;

                const matchDay = new Date(matchDate);
                matchDay.setHours(0, 0, 0, 0);

                // 아직 진행하지 않은 경기 (오늘 포함 미래)
                const status = d.status || '';
                if (status === 'finished') return;
                if (matchDay < today) return;

                const diff = matchDay - today;
                if (diff < bestDiff) {
                    bestDiff = diff;
                    best = {
                        opponent: homeTeam === room ? awayTeam : homeTeam,
                        date: matchDate,
                        status
                    };
                }
            });

            updateNextMatchDisplay(best);

        } catch (err) {
            console.error('[room-setting] 경기 조회 실패:', err);
            const el = document.getElementById('nextMatchInfo');
            if (el) el.textContent = '경기 조회 오류';
        }
    }

    function updateNextMatchDisplay(match) {
        // classRank: 상대팀 / totalRank: 날짜 (기존 span도 업데이트)
        const classRank = document.getElementById('classRank');
        const totalRank = document.getElementById('totalRank');
        const infoEl   = document.getElementById('nextMatchInfo');

        if (!match) {
            if (classRank) classRank.textContent = '-';
            if (totalRank) totalRank.textContent = '-';
            if (infoEl) infoEl.textContent = '예정된 경기 없음';
            return;
        }

        const dateStr = formatDate(match.date);
        if (classRank) classRank.textContent = match.opponent || '-';
        if (totalRank) totalRank.textContent = dateStr;
        if (infoEl) {
            infoEl.innerHTML = `<span style="color:#27AE60;font-weight:700;">vs ${match.opponent}</span>
                <span style="margin-left:6px;">${dateStr}</span>`;
        }
    }

    function formatDate(date) {
        if (!date) return '-';
        const d = new Date(date);
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${mm}/${dd}`;
    }

    // ── 인증 상태 감지 후 UI 연동 ────────────────────────────────
    function hookAuthState() {
        let hooked = false;

        const tryHook = () => {
            if (!window.firebase || !window.auth) return false;

            window.firebase.onAuthStateChanged(window.auth, user => {
                injectRoomModal();
                if (user) {
                    // 약간 지연: 다른 auth 핸들러(profile card 렌더링)가 먼저 실행되도록
                    setTimeout(() => renderRoomUI(true), 600);
                } else {
                    renderRoomUI(false);
                }
            });
            return true;
        };

        if (!tryHook()) {
            const interval = setInterval(() => {
                if (tryHook()) clearInterval(interval);
            }, 200);
        }
    }

    // ── 초기화 ──────────────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', hookAuthState);
    } else {
        hookAuthState();
    }

    // 전역 노출 (필요시 외부에서 호출 가능)
    window.roomSetting = { open: openRoomModal, reload: () => loadNextMatch(getSavedRoom()) };
})();
