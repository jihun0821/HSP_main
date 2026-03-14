// stats-leaderboard.js - 득점/도움 순위 자동 전환 시스템 (페이지 인디케이터 포함)

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

let currentStatsType = 'goals'; // 'goals' 또는 'assists'
let statsAutoSwitchInterval;
let currentStatsIndex = 0; // 현재 인덱스 (0: goals, 1: assists)
const statsTypes = ['goals', 'assists']; // 순위 타입 배열
const totalStatsPages = 2; // 총 페이지 수 (득점, 도움)

// 페이지 로드 시 초기화
window.addEventListener('DOMContentLoaded', () => {
    initializeStatsLeaderboard();
});

// 득점/도움 순위 시스템 초기화
function initializeStatsLeaderboard() {
    console.log("득점/도움 순위 자동 전환 시스템 초기화");
    
    // 초기 렌더링 (득점 순위부터 시작)
    renderStatsLeaderboard();
    
    // 자동 전환 시작 (5초마다)
    startStatsAutoSwitch();
}

// 득점/도움 순위 렌더링
function renderStatsLeaderboard() {
    const statsCard = document.querySelector('.side-lists .list-card:nth-child(2)'); // 두 번째 list-card (득점 순위)
    if (!statsCard) {
        console.error("득점 순위 카드를 찾을 수 없습니다.");
        return;
    }
    
    const titleElement = statsCard.querySelector('.list-title');
    const listItems = statsCard.querySelector('.list-items');
    
    if (!titleElement || !listItems) {
        console.error("제목 또는 리스트 요소를 찾을 수 없습니다.");
        return;
    }
    
    // 현재 표시할 데이터 선택
    const currentData = statsLeaderboardData[currentStatsType];
    const title = currentStatsType === 'goals' ? '득점 순위' : '도움 순위';
    
    // 페이드 아웃 애니메이션 적용
    listItems.classList.add('fade-out');
    
    setTimeout(() => {
        // 제목 업데이트
        titleElement.textContent = title;
        
        // 리스트 내용 업데이트
        listItems.innerHTML = '';
        
        currentData.forEach((player, index) => {
            const listItem = document.createElement('li');
            listItem.className = 'list-item';
            
            // 상위 3위에 특별 클래스 추가
            if (player.rank <= 3) {
                listItem.classList.add('top-rank');
            }
            
            // 왕관 이모지 추가 (1~3위)
            let icon = '';
            if (player.rank === 1) {
                icon = currentStatsType === 'goals' ? '⚽ ' : '🅰️ ';
            } else if (player.rank === 2) {
                icon = '🥈 ';
            } else if (player.rank === 3) {
                icon = '🥉 ';
            }
            
            listItem.innerHTML = `
                <span>${icon}${player.rank}. ${escapeHtml(player.name)}</span>
                <span class="stats-value">${player.value}${player.unit}</span>
            `;
            
            listItems.appendChild(listItem);
        });
        
        // 페이지 인디케이터 업데이트
        updateStatsPageIndicator(statsCard);
        
        // 페이드 아웃 클래스 제거하고 페이드 인 효과 적용
        listItems.classList.remove('fade-out');
        listItems.classList.add('fade-in');
        
        setTimeout(() => {
            listItems.classList.remove('fade-in');
        }, 400);
        
    }, 200); // 페이드 아웃 시간과 동일
}

// 득점/도움 순위 페이지 인디케이터 업데이트
function updateStatsPageIndicator(statsCard) {
    let indicator = statsCard.querySelector('.page-indicator');
    
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.className = 'page-indicator';
        statsCard.appendChild(indicator);
    }
    
    // 항상 표시 (2개 페이지가 있으므로)
    indicator.style.display = 'flex';
    indicator.innerHTML = '';
    
    // 득점/도움 각각에 대한 점 생성
    const statsLabels = ['득점', '도움'];
    
    statsTypes.forEach((type, index) => {
        const dot = document.createElement('span');
        dot.className = 'page-dot';
        dot.setAttribute('data-type', type);
        dot.setAttribute('title', `${statsLabels[index]} 순위`); // 툴팁 추가
        
        if (index === currentStatsIndex) {
            dot.classList.add('active');
        }
        
        // 클릭 이벤트 추가 (수동 전환)
        dot.addEventListener('click', () => {
            switchToStatsType(type);
        });
        
        indicator.appendChild(dot);
    });
}

// 자동 전환 시작
function startStatsAutoSwitch() {
    // 기존 인터벌 정리
    if (statsAutoSwitchInterval) {
        clearInterval(statsAutoSwitchInterval);
    }
    
    // 5초마다 득점/도움 순위 전환
    statsAutoSwitchInterval = setInterval(() => {
        // 다음 인덱스로 이동 (순환)
        currentStatsIndex = (currentStatsIndex + 1) % totalStatsPages;
        currentStatsType = statsTypes[currentStatsIndex];
        
        console.log(`순위 전환: ${currentStatsType === 'goals' ? '득점' : '도움'} 순위로 변경 (인덱스: ${currentStatsIndex})`);
        
        // 순위 렌더링
        renderStatsLeaderboard();
    }, 10000); // 5초마다 전환
}

// 자동 전환 중지
function stopStatsAutoSwitch() {
    if (statsAutoSwitchInterval) {
        clearInterval(statsAutoSwitchInterval);
        statsAutoSwitchInterval = null;
        console.log("득점/도움 순위 자동 전환 중지");
    }
}

// 득점/도움 데이터 업데이트 함수 (필요시 외부에서 호출)
function updateStatsData(newGoalsData, newAssistsData) {
    if (newGoalsData && Array.isArray(newGoalsData)) {
        statsLeaderboardData.goals = newGoalsData;
    }
    
    if (newAssistsData && Array.isArray(newAssistsData)) {
        statsLeaderboardData.assists = newAssistsData;
    }
    
    // 현재 표시되는 순위 다시 렌더링
    renderStatsLeaderboard();
    
    console.log("득점/도움 데이터가 업데이트되었습니다.");
}

// HTML 이스케이프 함수
function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 특정 순위로 수동 전환하는 함수
function switchToStatsType(type) {
    if (type === 'goals' || type === 'assists') {
        // 현재 인덱스 업데이트
        currentStatsIndex = statsTypes.indexOf(type);
        currentStatsType = type;
        
        console.log(`수동 전환: ${type === 'goals' ? '득점' : '도움'} 순위로 변경`);
        
        renderStatsLeaderboard();
        
        // 자동 전환 재시작 (사용자 상호작용 후 자동 전환 지속)
        startStatsAutoSwitch();
    }
}

// 특정 인덱스로 이동하는 함수 (내부 사용)
function switchToStatsIndex(index) {
    if (index >= 0 && index < totalStatsPages) {
        currentStatsIndex = index;
        currentStatsType = statsTypes[currentStatsIndex];
        renderStatsLeaderboard();
    }
}

// 다음 순위로 전환
function nextStatsPage() {
    switchToStatsIndex((currentStatsIndex + 1) % totalStatsPages);
    startStatsAutoSwitch(); // 자동 전환 재시작
}

// 이전 순위로 전환
function prevStatsPage() {
    switchToStatsIndex((currentStatsIndex - 1 + totalStatsPages) % totalStatsPages);
    startStatsAutoSwitch(); // 자동 전환 재시작
}

// 전역 함수로 노출
window.updateStatsData = updateStatsData;
window.stopStatsAutoSwitch = stopStatsAutoSwitch;
window.startStatsAutoSwitch = startStatsAutoSwitch;
window.switchToStatsType = switchToStatsType;
window.nextStatsPage = nextStatsPage;
window.prevStatsPage = prevStatsPage;

// 페이지 언로드 시 인터벌 정리
window.addEventListener('beforeunload', () => {
    stopStatsAutoSwitch();
});

// 키보드 단축키 지원 (선택사항)
document.addEventListener('keydown', (event) => {
    // 득점/도움 순위에서 좌우 화살표키로 전환 (Ctrl + 화살표)
    if (event.ctrlKey) {
        switch(event.key) {
            case 'ArrowLeft':
                event.preventDefault();
                prevStatsPage();
                break;
            case 'ArrowRight':
                event.preventDefault();
                nextStatsPage();
                break;
        }
    }
});

// 호버 시 자동 전환 일시 중지 (선택사항)
document.addEventListener('DOMContentLoaded', () => {
    const statsCard = document.querySelector('.side-lists .list-card:nth-child(2)');
    if (statsCard) {
        let hoverTimeout;
        
        statsCard.addEventListener('mouseenter', () => {
            // 호버 시 자동 전환 중지
            stopStatsAutoSwitch();
        });
        
        statsCard.addEventListener('mouseleave', () => {
            // 호버 해제 후 2초 뒤 자동 전환 재시작
            clearTimeout(hoverTimeout);
            hoverTimeout = setTimeout(() => {
                startStatsAutoSwitch();
            }, 2000);
        });
    }
});
