import React, { useState, useEffect, useRef } from 'react';
import { 
  Wrench, 
  User, 
  Phone, 
  MapPin,
  FileText, 
  UploadCloud,
  ChevronRight,
  ChevronDown,
  CheckCircle,
  List,
  Clock,
  Settings,
  AlertCircle,
  Image as ImageIcon,
  X,
  Lock,
  Download,
  FileDown,
  Hash,
  Key
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signInWithCustomToken
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs,
  doc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  getDoc,
  setDoc
} from 'firebase/firestore';

// ==========================================
// Firebase 初始化與環境動態設定
// ==========================================
let config = {
  apiKey: "AIzaSyD1yOmDPsA_4mgNpw_FmlV0A37rmveEl_k",
  authDomain: "repairapp-b9fc9.firebaseapp.com",
  projectId: "repairapp-b9fc9",
  storageBucket: "repairapp-b9fc9.firebasestorage.app",
  messagingSenderId: "744504718191",
  appId: "1:744504718191:web:9511cd8578bf01c3b0ee9a",
  measurementId: "G-CP5Q00LB77"
};

// 相容雲端預覽環境
if (typeof __firebase_config !== 'undefined') {
  try {
    const parsed = JSON.parse(__firebase_config);
    if (Object.keys(parsed).length > 0) {
      config = parsed;
    }
  } catch (e) {}
}

const firebaseConfig = config;
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 動態資料庫路徑 (確保您在 Vercel 上的舊資料不會消失)
const getReportsRef = () => {
  if (typeof __app_id !== 'undefined' && __app_id) {
     return collection(db, 'artifacts', __app_id, 'public', 'data', 'repair_reports');
  }
  return collection(db, 'repair_reports');
};

const getReportDocRef = (id) => {
  if (typeof __app_id !== 'undefined' && __app_id) {
     return doc(db, 'artifacts', __app_id, 'public', 'data', 'repair_reports', id);
  }
  return doc(db, 'repair_reports', id);
};

const getAdminDocRef = () => {
  if (typeof __app_id !== 'undefined' && __app_id) {
     return doc(db, 'artifacts', __app_id, 'public', 'data', 'system_settings_admin');
  }
  return doc(db, 'system_settings', 'admin');
};

// ==========================================
// 系統設定常數
// ==========================================
const MAX_IMAGES = 5; 
const ADMIN_PASSWORD = '8888'; 

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('form'); 
  const [authLoading, setAuthLoading] = useState(true);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false); // 新增：控制是否顯示後台入口

  useEffect(() => {
    // 檢查網址是否帶有老闆專屬的隱藏參數 ?admin=true
    const params = new URLSearchParams(window.location.search);
    if (params.get('admin') === 'true') {
      setIsAdminMode(true);
    }

    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth error:", error);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAdminViewClick = () => {
    if (isAdminAuthenticated) {
      setView('admin');
    } else {
      setView('login');
    }
  };

  const handleLoginSuccess = () => {
    setIsAdminAuthenticated(true);
    setView('admin');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20 md:pb-0">
      <div className="bg-white shadow-sm px-4 py-3 flex justify-between items-center fixed top-0 w-full z-50 md:relative">
        <div className="flex items-center gap-2 text-blue-800 font-bold">
          <img src="/logo.png" alt="WE FIX Logo" className="w-7 h-7 rounded-md shadow-sm bg-blue-600 p-0.5" />
          <span>新峰聚工程 系統</span>
        </div>
        
        {/* 只有使用老闆專屬網址時，才會渲染出這塊按鈕 */}
        {isAdminMode && (
          <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
            <button 
              onClick={() => setView('form')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${view === 'form' ? 'bg-white shadow-sm text-blue-600 font-bold' : 'text-slate-500'}`}
            >
              客戶報修
            </button>
            <button 
              onClick={handleAdminViewClick}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${view === 'admin' || view === 'login' ? 'bg-white shadow-sm text-blue-600 font-bold' : 'text-slate-500'}`}
            >
              後台管理
            </button>
          </div>
        )}
      </div>

      <div className="pt-16 md:pt-6">
        {view === 'form' && <RepairForm user={user} />}
        {view === 'login' && <AdminLogin onLoginSuccess={handleLoginSuccess} onCancel={() => setView('form')} />}
        {view === 'admin' && <AdminDashboard user={user} />}
      </div>
    </div>
  );
}

// ==========================================
// 元件：簡易後台登入
// ==========================================
function AdminLogin({ onLoginSuccess, onCancel }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsChecking(true);
    setError(false);
    
    try {
      // 從 Firebase 取得目前的密碼，若無設定則預設為 8888
      const adminDocRef = getAdminDocRef();
      const docSnap = await getDoc(adminDocRef);
      let currentPassword = ADMIN_PASSWORD;
      
      if (docSnap.exists() && docSnap.data().password) {
        currentPassword = docSnap.data().password;
      }

      if (password === currentPassword) {
        onLoginSuccess();
      } else {
        setError(true);
        setPassword('');
      }
    } catch (err) {
      console.error("登入驗證失敗:", err);
      setError(true);
    }
    
    setIsChecking(false);
  };

  return (
    <div className="flex flex-col items-center p-4 mt-10">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden p-8 text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">員工登入</h2>
        <p className="text-gray-500 text-sm mb-6">請輸入密碼以查看報修案件<br/>(預設測試密碼為: {ADMIN_PASSWORD})</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input 
              type="password" 
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(false); }}
              placeholder="請輸入密碼" 
              className={`w-full bg-slate-50 border ${error ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 focus:ring-blue-500'} rounded-xl focus:ring-2 py-3 px-4 outline-none text-center tracking-[0.5em] text-lg`}
              autoFocus
            />
            {error && <p className="text-red-500 text-xs mt-2">密碼錯誤，請重新輸入</p>}
          </div>
          <button type="submit" disabled={isChecking} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3 px-4 rounded-xl transition-colors">
            {isChecking ? '驗證中...' : '登入管理系統'}
          </button>
          <button type="button" onClick={onCancel} className="w-full text-gray-500 text-sm hover:text-gray-700 py-2">
            返回客戶報修頁面
          </button>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// 元件 1：客戶報修表單
// ==========================================
function RepairForm({ user }) {
  const [status, setStatus] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [submittedCaseNumber, setSubmittedCaseNumber] = useState('');
  const [source, setSource] = useState(''); 
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '', 
    description: '',
  });
  const [images, setImages] = useState([]);
  const fileInputRef = useRef(null);

  const isOverLimit = images.length > MAX_IMAGES;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sourceParam = params.get('source');
    if (sourceParam) {
      setSource(sourceParam);
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errorMsg) setErrorMsg('');
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (!selectedFiles.length) return;

    setErrorMsg('');
    
    selectedFiles.forEach(file => {
      if (!file.type.startsWith('image/')) return;

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 600;
          const MAX_HEIGHT = 600;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
          } else {
            if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.5); 
          
          setImages(prev => [...prev, { name: file.name, dataUrl: compressedBase64 }]);
        };
      };
    });
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (indexToRemove) => {
    setImages(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const getTodayPrefix = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    if (isOverLimit) return;
    
    const { name, phone, address, description } = formData;

    if (!name.trim()) {
      setErrorMsg('「聯絡人姓名」為必填，請輸入您的姓名。');
      return;
    }

    if (!phone.trim()) {
      setErrorMsg('「聯絡電話」為必填，請輸入您的電話號碼。');
      return;
    }

    const cleanPhone = phone.replace(/[-\s]/g, '');
    const isMobile = /^09\d{8}$/.test(cleanPhone);
    const isLandline = /^0[2-8]\d{7,8}(?:#\d+)?$/.test(cleanPhone);

    if (!isMobile && !isLandline) {
      setErrorMsg('電話格式不正確！請輸入有效的「手機號碼」(10碼) 或「市話」(需含區碼，如 04-23456789)。');
      return;
    }

    if (!address.trim()) {
      setErrorMsg('「維修地址」為必填，請提供現場地址。');
      return;
    }
    if (!description.trim()) {
      setErrorMsg('「故障狀況描述」為必填，請簡述現場狀況。');
      return;
    }

    setStatus('submitting');
    setErrorMsg('');
    
    try {
      const reportsRef = getReportsRef();
      const todayPrefix = getTodayPrefix();
      
      const snapshot = await getDocs(reportsRef);
      let todayCount = 0;
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.caseNumber && data.caseNumber.startsWith(todayPrefix)) {
          todayCount++;
        }
      });
      
      const sequence = String(todayCount + 1).padStart(3, '0');
      const newCaseNumber = `${todayPrefix}${sequence}`;
      
      const imagesData = images.map(img => img.dataUrl);

      await addDoc(reportsRef, {
        caseNumber: newCaseNumber, 
        name: formData.name,
        phone: formData.phone,
        address: formData.address, 
        description: formData.description,
        images: imagesData,
        status: 'pending', 
        createdAt: serverTimestamp(),
        submitterId: user.uid,
        source: source || '一般網頁'
      });

      setSubmittedCaseNumber(newCaseNumber);
      setStatus('success');
    } catch (error) {
      console.error("寫入資料庫失敗：", error);
      setStatus('error');
      setErrorMsg('送出失敗，可能是網路不穩，請重新嘗試。');
    }
  };

  const handleReset = () => {
    setFormData({ name: '', phone: '', address: '', description: '' });
    setImages([]);
    setStatus('idle');
    setErrorMsg('');
    setSubmittedCaseNumber('');
  };

  if (status === 'success') {
    return (
      <div className="flex items-center justify-center p-4 mt-10">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center animate-in fade-in zoom-in duration-300 border-t-8 border-green-500">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">報修已成功送出！</h2>
          <p className="text-gray-600 mb-6 leading-relaxed">
            新峰聚工程的維修團隊已收到您的需求，並記錄至系統。我們將盡快安排工程人員前往處理。
          </p>
          
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-8">
            <p className="text-sm text-gray-500 font-semibold mb-1 flex items-center justify-center gap-1">
              <Hash className="w-4 h-4"/> 您的案件編號
            </p>
            <p className="text-2xl font-mono font-bold text-blue-700 tracking-wider">
              {submittedCaseNumber}
            </p>
            <p className="text-xs text-gray-400 mt-2">您可以截圖保留此編號，方便日後查詢</p>
          </div>

          <button onClick={handleReset} className="w-full bg-slate-100 text-slate-700 font-semibold py-3 px-4 rounded-xl hover:bg-slate-200 transition-colors active:scale-95">
            返回重新報修
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center p-4 sm:p-6 pb-24">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden">
        
        {/* 標頭區域 */}
        <div className="bg-gradient-to-r from-blue-700 to-blue-900 px-6 py-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 opacity-10 transform translate-x-4 -translate-y-4">
            <Wrench className="w-32 h-32" />
          </div>
          <div className="relative z-10 flex items-start gap-4">
            <img src="/logo.png" alt="WE FIX" className="w-16 h-16 rounded-2xl shadow-md border-2 border-white/20 shrink-0 bg-blue-600 p-1" />
            <div>
              <p className="text-blue-200 text-sm font-medium tracking-wider mb-1">新峰聚工程</p>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                快速線上報修
              </h1>
              <p className="mt-2 text-blue-100 text-sm opacity-90">
                掃描 QR Code 填寫，工程團隊將收到雲端通知
              </p>
            </div>
          </div>
          
          {/* 顯示客戶目前是從哪個分店掃描進來的 */}
          {source && (
            <div className="mt-4 inline-block bg-white text-blue-800 text-xs font-bold px-3 py-1 rounded-full shadow-sm">
              目前分店：{source}
            </div>
          )}
        </div>

        {/* 報修表單 */}
        <form onSubmit={handleSubmit} noValidate className="p-6 sm:p-8 space-y-6">
          {errorMsg && (
             <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3 text-sm leading-relaxed animate-in slide-in-from-top-2">
               <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" /> 
               <span className="font-semibold">{errorMsg}</span>
             </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                聯絡人姓名 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="請輸入姓名" className="pl-10 w-full bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 py-3 px-4 outline-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                聯絡電話 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-gray-400" />
                </div>
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="手機 或 含區碼市話" className="pl-10 w-full bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 py-3 px-4 outline-none" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              維修地址 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute top-3 left-3 pointer-events-none">
                <MapPin className="h-5 w-5 text-gray-400" />
              </div>
              <textarea name="address" rows="2" value={formData.address} onChange={handleChange} placeholder="請輸入需要維修的詳細地址..." className="pl-10 w-full bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 py-3 px-4 resize-none outline-none"></textarea>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              故障狀況描述 (報修項目) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute top-3 left-3 pointer-events-none">
                <FileText className="h-5 w-5 text-gray-400" />
              </div>
              <textarea name="description" rows="3" value={formData.description} onChange={handleChange} placeholder="請簡述設備或現場發生什麼問題..." className="pl-10 w-full bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 py-3 px-4 resize-none outline-none"></textarea>
            </div>
          </div>

          <div>
             <div className="flex justify-between items-end mb-2">
               <label className="block text-sm font-semibold text-gray-700">現場照片 (選填，最多5張)</label>
               <span className={`text-xs ${isOverLimit ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                 {images.length} / {MAX_IMAGES}
               </span>
             </div>
             
             <input type="file" ref={fileInputRef} accept="image/*" multiple onChange={handleFileChange} className="hidden" />

             {images.length < MAX_IMAGES && (
               <button type="button" onClick={() => fileInputRef.current.click()} className="w-full flex justify-center items-center gap-2 px-4 py-3 border-2 border-dashed border-blue-300 text-blue-600 rounded-xl hover:bg-blue-50 transition-colors text-sm font-bold bg-slate-50">
                 <UploadCloud className="h-5 w-5" /> 點擊拍攝或選擇照片
               </button>
             )}
             
             {images.length > 0 && (
               <div className="mt-3 grid grid-cols-3 gap-2">
                 {images.map((img, index) => (
                   <div key={index} className={`relative aspect-square rounded-lg overflow-hidden border ${index >= MAX_IMAGES ? 'border-red-500 opacity-50' : 'border-slate-200'} group bg-slate-100 animate-in zoom-in duration-200`}>
                     <img src={img.dataUrl} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                     <button type="button" onClick={() => removeImage(index)} className="absolute top-1 right-1 bg-black bg-opacity-50 text-white rounded-full p-1 opacity-80 hover:opacity-100 hover:bg-red-500 transition-all">
                       <X className="w-3 h-3" />
                     </button>
                     {index >= MAX_IMAGES && <div className="absolute inset-0 bg-red-500 bg-opacity-20 pointer-events-none"></div>}
                   </div>
                 ))}
               </div>
             )}
          </div>

          <div className="mt-16 pt-10 border-t-2 border-dashed border-slate-200 relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-white px-4 text-xs font-bold text-slate-400 tracking-widest">
              表單結束
            </div>

            {isOverLimit && (
              <div className="mb-4 flex items-center justify-center gap-2 text-red-600 font-bold bg-red-50 py-3 px-4 rounded-xl animate-pulse">
                <AlertCircle className="w-5 h-5 shrink-0" /> 
                <span>照片超過五張，無法傳送</span>
              </div>
            )}
            
            <button 
              type="submit" 
              disabled={status === 'submitting' || isOverLimit} 
              className={`w-full flex items-center justify-center gap-2 py-4 px-4 rounded-xl shadow-md text-xl font-bold text-white transition-all 
                ${isOverLimit ? 'bg-slate-300 cursor-not-allowed shadow-none' : status === 'submitting' ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg active:scale-95'}`}
            >
              {status === 'submitting' ? '產生案件並送出...' : '確認送出報修'}
            </button>
            <p className="text-center text-sm text-gray-500 mt-4 font-medium">請確認資料無誤後再按送出</p>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// 元件 2：管理後台 
// ==========================================
function AdminDashboard({ user }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(null); 
  const [downloadModal, setDownloadModal] = useState(null); 
  
  // 更換密碼相關狀態
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');

  useEffect(() => {
    if (!user) return;

    const reportsRef = getReportsRef();
    
    const unsubscribe = onSnapshot(
      reportsRef, 
      (snapshot) => {
        const fetchedReports = [];
        snapshot.forEach((docSnap) => {
          fetchedReports.push({ id: docSnap.id, ...docSnap.data() });
        });
        
        fetchedReports.sort((a, b) => {
           const statusWeight = { pending: 0, processing: 1, completed: 2 };
           const weightA = statusWeight[a.status || 'pending'] ?? 0;
           const weightB = statusWeight[b.status || 'pending'] ?? 0;

           if (weightA !== weightB) {
             return weightA - weightB; 
           }

           const timeA = a.createdAt?.toMillis() || 0;
           const timeB = b.createdAt?.toMillis() || 0;
           return timeB - timeA;
        });

        setReports(fetchedReports);
        setLoading(false);
      },
      (error) => {
        console.error("讀取資料失敗:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleStatusChange = async (reportId, newStatus) => {
    try {
      const reportRef = getReportDocRef(reportId);
      await updateDoc(reportRef, { status: newStatus });
    } catch (error) {
      console.error("狀態更新失敗:", error);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!newPassword.trim()) return;
    
    try {
      const adminDocRef = getAdminDocRef();
      await setDoc(adminDocRef, { password: newPassword }, { merge: true });
      setPasswordMsg('✅ 密碼更新成功！');
      setTimeout(() => {
        setShowPasswordModal(false);
        setNewPassword('');
        setPasswordMsg('');
      }, 1500);
    } catch (error) {
      console.error("更新密碼失敗", error);
      setPasswordMsg('❌ 更新失敗，請檢查網路');
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '剛剛';
    const date = timestamp.toDate();
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const formatFullDate = (timestamp) => {
    if (!timestamp) return '未知時間';
    const date = timestamp.toDate();
    return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const prepareExportExcel = () => {
    if (reports.length === 0) return;

    const headers = ['案件編號', '報修來源', '處理狀態', '報修時間', '聯絡人姓名', '聯絡電話', '維修地址', '故障狀況描述', '照片數量'];
    
    const statusTextMap = {
      'pending': '待處理',
      'processing': '處理中',
      'completed': '已完成'
    };

    const rows = reports.map(report => {
      const dateStr = formatFullDate(report.createdAt);
      const imgCount = report.images ? report.images.length : (report.imageBase64 ? 1 : 0);
      const escapeCSV = (text) => `"${(text || '').toString().replace(/"/g, '""')}"`;
      const caseNumberStr = report.caseNumber ? report.caseNumber : '無編號';
      const statusStr = statusTextMap[report.status || 'pending'];

      return [
        escapeCSV(caseNumberStr),
        escapeCSV(report.source || '一般網頁'), // 紀錄來源
        escapeCSV(statusStr),
        escapeCSV(dateStr),
        escapeCSV(report.name),
        escapeCSV(report.phone),
        escapeCSV(report.address), 
        escapeCSV(report.description),
        imgCount
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const bom = '\uFEFF'; 
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const today = new Date();
    const dateString = `${today.getFullYear()}${(today.getMonth()+1).toString().padStart(2,'0')}${today.getDate().toString().padStart(2,'0')}`;
    const fileName = `新峰聚工程_報修紀錄_${dateString}.csv`;
    
    setDownloadModal({ url, fileName });
  };

  const closeImageViewer = () => setSelectedImageIndex(null);

  const getStatusSelectStyle = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200 focus:ring-green-500';
      case 'processing': return 'bg-amber-100 text-amber-800 border-amber-200 focus:ring-amber-500';
      case 'pending':
      default: return 'bg-red-100 text-red-800 border-red-200 focus:ring-red-500';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 relative">
      
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <List className="w-6 h-6 text-blue-600" />
            報修案件管理
          </h2>
          <p className="text-gray-500 text-sm mt-1">即時同步來自客戶的表單資料</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-blue-100 text-blue-800 px-3 py-1.5 rounded-lg text-sm font-semibold">
            共 {reports.length} 件
          </div>
          
          {/* 更換密碼按鈕 */}
          <button 
            onClick={() => setShowPasswordModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold bg-slate-200 text-slate-700 hover:bg-slate-300 transition-all"
          >
            <Key className="w-4 h-4" /> 更改密碼
          </button>

          {/* Excel 匯出按鈕 */}
          <button 
            onClick={prepareExportExcel}
            disabled={reports.length === 0}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
              reports.length === 0 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-green-600 hover:bg-green-700 text-white shadow-sm hover:shadow-md active:scale-95'
            }`}
          >
            <Download className="w-4 h-4" />
            匯出 Excel
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-500">載入案件中...</div>
      ) : reports.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-10 text-center border border-dashed border-gray-300">
          <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">目前沒有任何報修案件</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => {
            const imagesList = report.images || (report.imageBase64 ? [report.imageBase64] : []);
            const currentStatus = report.status || 'pending';
            const isCompleted = currentStatus === 'completed';

            return (
              <div 
                key={report.id} 
                className={`bg-white rounded-2xl shadow-sm border p-5 transition-all duration-500 
                  ${isCompleted ? 'border-gray-100 opacity-60 grayscale-[15%]' : 'border-gray-200 hover:shadow-md'}`}
              >
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    
                    <div className="flex-1">
                      <div className="flex items-center flex-wrap gap-3 mb-2">
                        
                        <div className="relative inline-block shrink-0">
                          <select
                            value={currentStatus}
                            onChange={(e) => handleStatusChange(report.id, e.target.value)}
                            className={`appearance-none text-sm font-bold pl-3 pr-8 py-1.5 rounded-md cursor-pointer outline-none border transition-colors focus:ring-2 ${getStatusSelectStyle(currentStatus)}`}
                          >
                            <option value="pending">🔴 待處理</option>
                            <option value="processing">⚡ 處理中</option>
                            <option value="completed">✅ 已完成</option>
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-current opacity-70">
                            <ChevronDown className="w-4 h-4" />
                          </div>
                        </div>

                        <h3 className={`font-bold text-lg ${isCompleted ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
                          {report.name}
                        </h3>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600 mb-3">
                        <span className="flex items-center gap-1"><Phone className="w-4 h-4 text-gray-400"/> {report.phone}</span>
                        {report.address && (
                          <span className="flex items-start gap-1"><MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5"/> {report.address}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 ml-2 shrink-0">
                      {report.caseNumber && (
                        <div className={`text-xs font-bold px-2 py-1 rounded-md border ${isCompleted ? 'text-gray-500 bg-gray-50 border-gray-200' : 'text-blue-700 bg-blue-50 border-blue-100'}`}>
                          案件編號 {report.caseNumber}
                        </div>
                      )}

                      {/* 後台顯示來源標籤 */}
                      {report.source && report.source !== '一般網頁' && (
                        <div className="text-xs font-bold px-2 py-1 rounded-md bg-purple-100 text-purple-700 mt-1">
                          來源：{report.source}
                        </div>
                      )}
                      
                      <div className="text-sm text-gray-400 flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md mt-1">
                        <Clock className="w-4 h-4" />
                        <span>{formatDate(report.createdAt)}</span>
                      </div>
                    </div>

                  </div>

                  <div className={`p-3 rounded-lg text-sm border ${isCompleted ? 'bg-gray-50 border-gray-100 text-gray-500' : 'bg-slate-50 border-slate-100 text-gray-700'}`}>
                    <span className="font-semibold block text-xs text-gray-500 mb-1">報修項目 / 狀況描述：</span>
                    {report.description}
                  </div>

                  {imagesList.length > 0 && (
                    <div className="mt-2">
                      <span className="text-xs text-gray-500 font-semibold mb-2 flex items-center gap-1">
                        <ImageIcon className="w-3 h-3" /> 現場照片 ({imagesList.length}張)
                      </span>
                      <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                        {imagesList.map((img, idx) => (
                          <div 
                            key={idx}
                            className="cursor-pointer group relative rounded-lg overflow-hidden border border-slate-200 shadow-sm shrink-0 w-24 h-24 sm:w-28 sm:h-28"
                            onClick={() => setSelectedImageIndex({ reportId: report.id, imgIndex: idx, images: imagesList })}
                          >
                            <img src={img} alt="現場照片" className={`w-full h-full object-cover transition-transform ${isCompleted ? '' : 'group-hover:scale-105'}`} />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 flex items-center justify-center transition-all">
                               <ImageIcon className="text-white opacity-0 group-hover:opacity-100 w-6 h-6" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 修改密碼彈出視窗 */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[120] bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full relative">
            <button onClick={() => setShowPasswordModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Key className="w-5 h-5 text-blue-600" /> 更改後台密碼
            </h3>
            <form onSubmit={handleUpdatePassword}>
              <input 
                type="text" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="請輸入新密碼" 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 py-3 px-4 outline-none mb-4 tracking-widest text-center"
                autoFocus
              />
              {passwordMsg && <p className="text-sm font-bold text-center mb-4 text-green-600">{passwordMsg}</p>}
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl">
                確認修改
              </button>
            </form>
          </div>
        </div>
      )}

      {downloadModal && (
        <div className="fixed inset-0 z-[110] bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center relative animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setDownloadModal(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileDown className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">檔案已準備就緒</h3>
            <p className="text-gray-500 text-sm mb-6">
              點擊下方按鈕即可將報表儲存至您的裝置。
            </p>
            
            <a 
              href={downloadModal.url} 
              download={downloadModal.fileName}
              onClick={() => {
                setTimeout(() => setDownloadModal(null), 1000);
              }}
              className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-xl transition-colors"
            >
              <Download className="w-5 h-5" /> 點擊下載 Excel 檔
            </a>
          </div>
        </div>
      )}

      {selectedImageIndex && (
        <div className="fixed inset-0 z-[100] bg-black bg-opacity-90 flex items-center justify-center p-4">
          <div className="relative w-full h-full flex flex-col items-center justify-center">
            <button className="absolute top-4 right-4 sm:top-10 sm:right-10 text-white hover:text-gray-300 z-50 bg-black bg-opacity-50 rounded-full p-2" onClick={closeImageViewer}>
              <X className="w-8 h-8" />
            </button>
            <img 
              src={selectedImageIndex.images[selectedImageIndex.imgIndex]} 
              alt="放大照片" 
              className="max-w-full max-h-[80vh] object-contain"
            />
            {selectedImageIndex.images.length > 1 && (
              <div className="absolute bottom-10 flex items-center gap-4 bg-black bg-opacity-50 px-4 py-2 rounded-full">
                <button 
                  className={`text-white p-1 rounded-full ${selectedImageIndex.imgIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white hover:bg-opacity-20'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if(selectedImageIndex.imgIndex > 0) setSelectedImageIndex(prev => ({ ...prev, imgIndex: prev.imgIndex - 1 }));
                  }}
                >
                  <ChevronRight className="w-8 h-8 rotate-180" />
                </button>
                <span className="text-white font-mono">
                  {selectedImageIndex.imgIndex + 1} / {selectedImageIndex.images.length}
                </span>
                <button 
                  className={`text-white p-1 rounded-full ${selectedImageIndex.imgIndex === selectedImageIndex.images.length - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white hover:bg-opacity-20'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if(selectedImageIndex.imgIndex < selectedImageIndex.images.length - 1) setSelectedImageIndex(prev => ({ ...prev, imgIndex: prev.imgIndex + 1 }));
                  }}
                >
                  <ChevronRight className="w-8 h-8" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}