
const { 
  initializeApp, getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, updateProfile, sendEmailVerification,
  getFirestore, doc, setDoc, getDoc, deleteUser
} = window.firebase;

const firebaseConfig = {
  apiKey: "AIzaSyC_YES_I20XByZpXjCN2p1Vp5gueS4Op24",
  authDomain: "hsp-auth-22845.firebaseapp.com",
  projectId: "hsp-auth-22845",
  storageBucket: "hsp-auth-22845.firebasestorage.app",
  messagingSenderId: "1034282361573",
  appId: "1:1034282361573:web:a15b970a18ae7033552a0c",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

console.log('Firebase 초기화 완료');

let tempUserData = null;

function isHanilEmail(email) {
  return email.endsWith('@hanilgo.cnehs.kr');  
}

// 프로필 이미지 미리보기 기능
function setupProfileImagePreview() {
  const avatarInput = document.getElementById('avatar');
  const fileLabel = document.querySelector('.file-upload-label');
  
  if (avatarInput && fileLabel) {
    avatarInput.addEventListener('change', function(e) {
      const file = e.target.files[0];
      
      if (file) {
        alert('현재 버전에서는 프로필 이미지 업로드가 지원되지 않습니다. 기본 아바타를 사용합니다.');
        e.target.value = '';
      }
    });
    
    const fileUploadWrapper = document.querySelector('.file-upload-wrapper');
    if (fileUploadWrapper) {
      fileUploadWrapper.style.display = 'none';
    }
  }
}

// 프로필 모달 표시
function showProfileModal() {
  const authModal = document.getElementById('authModal');
  const profileModal = document.getElementById('profileModal');
  
  if (authModal) {
    authModal.style.display = 'none';
  }
  
  if (profileModal) {
    profileModal.style.display = 'flex';
    
    const nicknameInput = document.getElementById('nickname');
    if (nicknameInput) nicknameInput.value = '';
  }
}

// 이메일 인증 확인 및 회원가입 완료
async function completeSignup() {
  const user = auth.currentUser;
  
  if (!user) {
    alert('로그인 상태가 아닙니다.');
    return;
  }

  // 사용자 정보 새로고침
  await user.reload();
  const refreshedUser = auth.currentUser;

  if (!refreshedUser.emailVerified) {
    alert('아직 이메일 인증이 완료되지 않았습니다.\n메일함에서 인증 링크를 클릭해주세요.');
    return;
  }

  // 이메일 인증이 완료된 경우에만 데이터베이스에 저장
  if (tempUserData) {
    try {
      // 프로필 업데이트
      await updateProfile(refreshedUser, {
        displayName: tempUserData.nickname,
        photoURL: tempUserData.avatarUrl
      });

      // Firestore에 프로필 데이터 저장
      await setDoc(doc(db, 'profiles', refreshedUser.uid), {
        uid: refreshedUser.uid,
        email: tempUserData.email,
        nickname: tempUserData.nickname,
        avatar_url: tempUserData.avatarUrl,
        created_at: new Date()
      });

      alert('회원가입이 완료되었습니다!');
      
      // 임시 데이터 초기화
      tempUserData = null;
      
      // 모달 닫기
      document.getElementById('profileModal').style.display = 'none';
      
      // 사용자 프로필 표시
      showUserProfile();
      
    } catch (error) {
      console.error('회원가입 완료 중 오류:', error);
      alert('회원가입 완료 중 오류가 발생했습니다.');
    }
  }
}

// 프로필 저장 및 회원가입 (이메일 인증 전)
async function saveProfile() {
  const nickname = document.getElementById('nickname').value.trim();
  const saveBtn = document.getElementById('saveProfileBtn');
  
  if (!nickname) {
    alert('닉네임을 입력해주세요.');
    return;
  }
  
  if (nickname.length < 2 || nickname.length > 20) {
    alert('닉네임은 2자 이상 20자 이하로 입력해주세요.');
    return;
  }

  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = '계정 생성 중...';
  }

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(nickname)}&background=667eea&color=fff&size=80&bold=true`;
  
  try {
    console.log('회원가입 시도:', { email, nickname });

    if (!isHanilEmail(email)) {
      throw new Error('한일고 이메일(@hanilgo.cnehs.kr)만 가입할 수 있습니다.');
    }

    // Firebase 계정 생성 (데이터베이스 저장 전)
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    console.log('계정 생성 성공:', user);

    // 임시 데이터 저장 (이메일 인증 후 실제 저장용)
    tempUserData = {
      email: email,
      nickname: nickname,
      avatarUrl: avatarUrl
    };

    // 이메일 인증 메일 발송
    await sendEmailVerification(user);
    
    alert('인증 이메일이 발송되었습니다.\n이메일을 확인하고 인증을 완료한 후 "인증 확인" 버튼을 클릭해주세요.');

    // UI 업데이트 - 인증 대기 상태로 변경
    updateUIForEmailVerification();

  } catch (error) {
    console.error('계정 생성 중 오류:', error);
    let errorMessage = '계정 생성 중 오류가 발생했습니다.';
    
    if (error.code === 'auth/email-already-in-use') {
      errorMessage = '이미 사용 중인 이메일입니다.';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = '비밀번호가 너무 약합니다. 6자 이상 입력해주세요.';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = '유효하지 않은 이메일 주소입니다.';
    }
    
    alert(errorMessage);
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = '저장하고 가입';
    }
  }
}

// 이메일 인증 대기 상태 UI 업데이트
function updateUIForEmailVerification() {
  const saveBtn = document.getElementById('saveProfileBtn');
  const checkVerificationBtn = document.getElementById('checkVerificationBtn');
  const buttonContainer = saveBtn?.parentElement;
  
  if (saveBtn) {
    saveBtn.style.display = 'none';
  }
  
  if (checkVerificationBtn) {
    checkVerificationBtn.style.display = 'inline-block'; // block 대신 inline-block 사용
    checkVerificationBtn.disabled = false;
    
    // 버튼 컨테이너에 flex 스타일 적용 (나란히 배치)
    if (buttonContainer) {
      buttonContainer.style.display = 'flex';
      buttonContainer.style.justifyContent = 'space-between';
      buttonContainer.style.alignItems = 'center';
      buttonContainer.style.gap = '10px';
    }
  }
}

// 로그인 처리
async function login(email, password) {
  console.log('로그인 시도:', email);
  
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 이메일 인증 여부 확인
    if (!user.emailVerified) {
      alert('이메일 인증이 필요합니다. 이메일을 확인하고 인증을 완료해주세요.');
      await signOut(auth);
      return;
    }

    console.log('로그인 성공:', user);    
    document.getElementById('authModal').style.display = 'none';
    
    showUserProfile();
    
  } catch (error) {
    console.error('로그인 오류:', error);
    
    let errorMessage = '로그인 실패';
    if (error.code === 'auth/user-not-found') {
      errorMessage = '존재하지 않는 사용자입니다.';
    } else if (error.code === 'auth/wrong-password') {
      errorMessage = '비밀번호가 올바르지 않습니다.';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = '유효하지 않은 이메일 주소입니다.';
    } else if (error.code === 'auth/too-many-requests') {
      errorMessage = '너무 많은 로그인 시도입니다. 잠시 후 다시 시도해주세요.';
    }
    
    alert(errorMessage);
  }
}

// 프로필 표시
async function showUserProfile() {
  console.log('프로필 표시 시도');
  
  try {
    const user = auth.currentUser;
    
    if (!user) {
      console.log('사용자 정보 없음');
      // script.js의 updateUIForAuthState 함수 호출
      if (typeof updateUIForAuthState === 'function') {
        updateUIForAuthState(false);
      }
      return;
    }

    console.log('현재 사용자:', user);

    const docRef = doc(db, 'profiles', user.uid);
    const docSnap = await getDoc(docRef);

    let profileData;
    
    if (docSnap.exists()) {
      profileData = docSnap.data();
      console.log('프로필 데이터:', profileData);
    } else {
      console.log('프로필 데이터 없음, 기본값 사용');
      const nickname = user.displayName || user.email.split('@')[0];
      profileData = {
        nickname: nickname,
        avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(nickname)}&background=667eea&color=fff&size=35&bold=true`
      };
    }

    // 모든 모달 닫기
    const authModal = document.getElementById('authModal');
    const profileModal = document.getElementById('profileModal');
    if (authModal) authModal.style.display = 'none';
    if (profileModal) profileModal.style.display = 'none';

    // UI 업데이트 - script.js의 함수 호출
    if (typeof updateUIForAuthState === 'function') {
      updateUIForAuthState(true, profileData);
    }

  } catch (error) {
    console.error('프로필 표시 중 오류:', error);
    if (typeof updateUIForAuthState === 'function') {
      updateUIForAuthState(false);
    }
  }
}

// 로그아웃
async function logout() {
  console.log('로그아웃 시도');
  try {
    // 임시 데이터 초기화
    tempUserData = null;
    
    await signOut(auth);
    
    if (typeof updateUIForAuthState === 'function') {
      updateUIForAuthState(false);
    }
    
  } catch (error) {
    console.error('로그아웃 오류:', error);
    alert('로그아웃 중 오류가 발생했습니다.');
  }
}

// DOM 요소 가져오기
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const authModal = document.getElementById('authModal');
const closeAuthModal = document.getElementById('closeAuthModal');
const profileModal = document.getElementById('profileModal');
const closeProfileModal = document.getElementById('closeProfileModal');
const saveProfileBtn = document.getElementById('saveProfileBtn');
const doLoginBtn = document.getElementById('doLogin');
const doSignUpBtn = document.getElementById('doSignUp');

console.log('요소 확인:', { loginBtn, doLoginBtn, doSignUpBtn });

// 프로필 이미지 미리보기 설정
setupProfileImagePreview();

// 이벤트 리스너 설정
if (loginBtn) {
  loginBtn.onclick = () => {
    console.log('로그인 버튼 클릭');
    authModal.style.display = 'flex';
  };
}

if (logoutBtn) {
  logoutBtn.onclick = logout;
}

if (closeAuthModal) {
  closeAuthModal.onclick = () => {
    authModal.style.display = 'none';
  };
}

if (closeProfileModal) {
  closeProfileModal.onclick = () => {
    profileModal.style.display = 'none';
    // 모달 닫을 때 임시 데이터도 초기화
    tempUserData = null;
  };
}

if (saveProfileBtn) {
  saveProfileBtn.onclick = saveProfile;
}

if (doLoginBtn) {
  doLoginBtn.onclick = () => {
    console.log('로그인 버튼 클릭됨');
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!email || !password) {
      alert('이메일과 비밀번호를 입력해주세요.');
      return;
    }
    login(email, password);
  };
} else {
  console.error('doLogin 버튼을 찾을 수 없습니다');
}

if (doSignUpBtn) {
  doSignUpBtn.onclick = () => {
    console.log('회원가입 버튼 클릭됨');
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!email || !password) {
      alert('이메일과 비밀번호를 입력해주세요.');
      return;
    }
    showProfileModal();
  };
} else {
  console.error('doSignUp 버튼을 찾을 수 없습니다');
}

// 바깥 영역 클릭 시 모달 닫기
window.onclick = (e) => {
  if (e.target === authModal) authModal.style.display = 'none';
  if (e.target === profileModal) {
    profileModal.style.display = 'none';
    // 모달 닫을 때 임시 데이터도 초기화
    tempUserData = null;
  }
};

onAuthStateChanged(auth, async (user) => {
  console.log('Auth 상태 변경:', user);

  if (user) {
    await user.reload(); // 사용자 정보 새로고침
    const refreshedUser = auth.currentUser;

    if (!refreshedUser.emailVerified) {
      console.log('이메일 미인증 상태입니다.');
      
      // 이메일 미인증 상태에서는 프로필을 표시하지 않음
      if (typeof updateUIForAuthState === 'function') {
        updateUIForAuthState(false);
      }
      return;
    }

    showUserProfile();
  } else {
    if (typeof updateUIForAuthState === 'function') {
      updateUIForAuthState(false);
    }
  }
});

const checkVerificationBtn = document.getElementById('checkVerificationBtn');

if (checkVerificationBtn) {
  checkVerificationBtn.onclick = completeSignup;
}

// 전역 함수로 내보내기
window.logout = logout;
window.showUserProfile = showUserProfile;
