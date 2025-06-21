// predictions.js
let currentUser = null;
let currentCategory = null;
let selectedOption = null;

// Firebase 초기화 대기
window.addEventListener('DOMContentLoaded', () => {
    // 인증 상태 변경 감지
    if (window.firebase && window.firebase.onAuthStateChanged) {
        const auth = window.firebase.getAuth();
        window.firebase.onAuthStateChanged(auth, (user) => {
            currentUser = user;
            if (user) {
                loadUserPredictions();
                loadChartData();
            }
        });
    }
});

const predictionOptions = {
    scorer: [
        '이승민', '김태현', '박준호', '최민수', '정우진',
        '한동원', '김민성', '이재혁', '박성훈', '조영수'
    ],
    champion: [
        '1조', '2조', '3조', '4조', '5조', '6조'
    ],
    assist: [
        '김현우', '박지훈', '이동현', '최준영', '정민호',
        '한승우', '김동민', '이성민', '박태준', '조민수'
    ]
};

const categoryTitles = {
    scorer: '🥅 득점왕 예측',
    champion: '🏆 우승팀 예측',
    assist: '🅰️ 도움왕 예측'
};

// 예측 모달 열기
function openPredictionModal(category) {
    if (!currentUser) {
        alert('로그인이 필요합니다.');
        return;
    }
    
    currentCategory = category;
    selectedOption = null;
    
    const modal = document.getElementById('predictionModal');
    const title = document.getElementById('modal-title');
    // 입력창 컨테이너와 인풋
    const inputContainer = document.getElementById('prediction-input-container');
    const inputBox = document.getElementById('prediction-input');
    const submitBtn = document.getElementById('submit-prediction');

    title.textContent = categoryTitles[category];
    
    // 입력창 초기화 및 표시
    inputBox.value = '';
    inputContainer.style.display = 'block';
    submitBtn.disabled = true;
    modal.style.display = 'block';

    // 입력 변화 감지해서 버튼 활성화
    inputBox.oninput = function() {
        if (inputBox.value.trim().length > 0) {
            selectedOption = inputBox.value.trim();
            submitBtn.disabled = false;
        } else {
            selectedOption = null;
            submitBtn.disabled = true;
        }
    };
}

async function submitPrediction() {
    if (!currentUser || !currentCategory || !selectedOption) {
        return;
    }
    
    try {
        const db = window.firebase.getFirestore();
        const userEmail = currentUser.email;
        const timestamp = new Date().toISOString();

        // 기존 선택 불러오기
        const userPredictionsRef = window.firebase.doc(db, 'predictions', userEmail);
        const userDoc = await window.firebase.getDoc(userPredictionsRef);
        let previousChoice = null;
        if (userDoc.exists() && userDoc.data()[currentCategory]) {
            previousChoice = userDoc.data()[currentCategory].choice;
        }

        // 만약 기존 선택과 같으면 아무 것도 하지 않음
        if (previousChoice === selectedOption) {
            alert('이미 동일한 예측을 하셨습니다!');
            closePredictionModal();
            return;
        }

        // 통계 업데이트
        const statsRef = window.firebase.doc(db, 'prediction_stats', currentCategory);
        const statsDoc = await window.firebase.getDoc(statsRef);

        let currentStats = {};
        if (statsDoc.exists()) {
            currentStats = statsDoc.data();
        }

        // 기존 선택이 있었다면 감소
        if (previousChoice && currentStats[previousChoice]) {
            currentStats[previousChoice] = Math.max(0, (currentStats[previousChoice] || 0) - 1);
        }
        // 새 선택 증가
        currentStats[selectedOption] = (currentStats[selectedOption] || 0) + 1;

        // 1. 유저별 예측값 덮어쓰기
        await window.firebase.setDoc(
            userPredictionsRef,
            {
                [currentCategory]: {
                    choice: selectedOption,
                    timestamp: timestamp
                }
            },
            { merge: true }
        );
        // 2. 통계 업데이트
        await window.firebase.setDoc(statsRef, currentStats);

        // UI 업데이트
        updateUserPredictionDisplay(currentCategory, selectedOption);
        updateCategoryButton(currentCategory);
        loadChartData();
        
        closePredictionModal();
        
    } catch (error) {
        console.error('예측 저장 실패:', error);
        alert('예측 저장에 실패했습니다. 다시 시도해주세요.');
    }
}

// 사용자 예측 표시 업데이트
function updateUserPredictionDisplay(category, choice) {
    const predictionDiv = document.getElementById(`${category}-prediction`);
    predictionDiv.textContent = `내 예측: ${choice}`;
    predictionDiv.style.display = 'block';
}

// 카테고리 버튼 업데이트
function updateCategoryButton(category) {
    const button = document.querySelector(`[onclick="openPredictionModal('${category}')"]`);
    if (button) {
        button.textContent = '예측 변경';
        button.style.background = '#28a745';
    }
}

// 사용자 예측 로드
async function loadUserPredictions() {
    if (!currentUser) return;
    
    try {
        const db = window.firebase.getFirestore();
        const userDoc = await window.firebase.getDoc(
            window.firebase.doc(db, 'predictions', currentUser.email)
        );
        
        if (userDoc.exists()) {
            const predictions = userDoc.data();
            
            Object.keys(predictions).forEach(category => {
                if (predictions[category] && predictions[category].choice) {
                    updateUserPredictionDisplay(category, predictions[category].choice);
                    updateCategoryButton(category);
                }
            });
        }
    } catch (error) {
        console.error('사용자 예측 로드 실패:', error);
    }
}

// 차트 데이터 로드 및 표시
async function loadChartData() {
    try {
        const db = window.firebase.getFirestore();
        
        for (const category of Object.keys(predictionOptions)) {
            const statsDoc = await window.firebase.getDoc(
                window.firebase.doc(db, 'prediction_stats', category)
            );
            
            let stats = {};
            if (statsDoc.exists()) {
                stats = statsDoc.data();
            }
            
            renderChart(category, stats);
        }
    } catch (error) {
        console.error('차트 데이터 로드 실패:', error);
    }
}

// 차트 렌더링
function renderChart(category, stats) {
    const chartContainer = document.getElementById(`${category}-chart`);
    if (!chartContainer) return;
    
    // 데이터 정렬 (득표수 기준 내림차순)
    const sortedData = Object.entries(stats)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10); // 상위 10개만 표시
    
    const maxVotes = Math.max(...Object.values(stats), 1);
    
    chartContainer.innerHTML = '';
    
    if (sortedData.length === 0) {
        chartContainer.innerHTML = '<p style="text-align: center; color: #666;">아직 예측이 없습니다.</p>';
        return;
    }
    
    sortedData.forEach(([option, votes], index) => {
        const percentage = (votes / maxVotes) * 100;
        
        const chartItem = document.createElement('div');
        chartItem.className = 'chart-item';
        
        chartItem.innerHTML = `
            <div class="chart-label">
                <span>${option}</span>
                <span>${votes}표</span>
            </div>
            <div class="chart-bar">
                <div class="chart-fill" style="width: ${percentage}%">
                    ${percentage.toFixed(1)}%
                </div>
                ${index < 3 ? `<div class="rank-badge ${index === 1 ? 'second' : index === 2 ? 'third' : ''}">${index + 1}위</div>` : ''}
            </div>
        `;
        
        chartContainer.appendChild(chartItem);
    });
}

// 모달 외부 클릭시 닫기
window.onclick = function(event) {
    const modal = document.getElementById('predictionModal');
    if (event.target === modal) {
        closePredictionModal();
    }
}

function closePredictionModal() {
    const modal = document.getElementById('predictionModal');
    if (modal) {
        modal.style.display = 'none';
        const inputBox = document.getElementById('prediction-input');
        if (inputBox) inputBox.value = '';
        const submitBtn = document.getElementById('submit-prediction');
        if (submitBtn) submitBtn.disabled = true;
    }
}
window.closePredictionModal = closePredictionModal;
