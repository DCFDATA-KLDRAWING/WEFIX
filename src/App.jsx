// ====== 將原本的初始化設定替換為真實環境版 ======
const firebaseConfig = {
  apiKey: "AIzaSyD1yOmDPsA_4mgNpw_FmlV0A37rmveEl_k",
  authDomain: "repairapp-b9fc9.firebaseapp.com",
  projectId: "repairapp-b9fc9",
  storageBucket: "repairapp-b9fc9.firebasestorage.app",
  messagingSenderId: "744504718191",
  appId: "1:744504718191:web:9511cd8578bf01c3b0ee9a",
  measurementId: "G-CP5Q00LB77"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ====== 找到所有 `collection(db, 'artifacts', ...)` 替換掉 ======
// 將寫入與讀取資料的路徑簡化為真實環境路徑
// 在 handleSubmit 中：
// 修改前：const reportsRef = collection(db, 'artifacts', appId, 'public', 'data', 'repair_reports');
// 修改後：const reportsRef = collection(db, 'repair_reports');

// 在 AdminDashboard 的 useEffect 與 handleStatusChange 中：
// 修改前：const reportsRef = collection(db, 'artifacts', appId, 'public', 'data', 'repair_reports');
// 修改前：const reportRef = doc(db, 'artifacts', appId, 'public', 'data', 'repair_reports', reportId);
// 修改後：const reportsRef = collection(db, 'repair_reports');
// 修改後：const reportRef = doc(db, 'repair_reports', reportId);

// ====== 找到 initAuth 函數替換掉 ======
const initAuth = async () => {
  try {
    await signInAnonymously(auth); // 直接匿名登入真實資料庫
  } catch (error) {
    console.error("Auth error:", error);
  }
};