import React, { useState, useEffect, useRef } from 'react';
import { 
  Wrench, User, Phone, MapPin, FileText, UploadCloud, ChevronRight,
  ChevronDown, CheckCircle, List, Clock, Settings, AlertCircle,
  Image as ImageIcon, X, Lock, Download, FileDown, Hash
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, getDocs, doc, updateDoc, 
  onSnapshot, serverTimestamp 
} from 'firebase/firestore';

// ==========================================
// 真實環境：Firebase 初始化設定
// ==========================================
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

  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
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
          <Settings className="w-5 h-5" />
          <span>新峰聚工程 系統</span>
        </div>
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      onLoginSuccess();
    } else {
      setError(true);
      setPassword('');
    }
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
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-colors">
            登入管理系統
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
  const [formData, setFormData] = useState({
    name: '', phone: '', address: '', description: '',
  });
  const [images, setImages] = useState([]);
  const fileInputRef = useRef(null);

  const isOverLimit = images.length > MAX_IMAGES;

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
    if (!name.trim()) { setErrorMsg('「聯絡人姓名」為必填。'); return; }
    if (!phone.trim()) { setErrorMsg('「聯絡電話」為必填。'); return; }
    
    const cleanPhone = phone.replace(/[-\s]/g, '');
    const isMobile = /^09\d{8}$/.test(cleanPhone);
    const isLandline = /^0[2-8]\d{7,8}(?:#\d+)?$/.test(cleanPhone);
    if (!isMobile && !isLandline) {
      setErrorMsg('電話格式不正確！請輸入有效的手機或市話。');
      return;
    }

    if (!address.trim()) { setErrorMsg('「維修地址」為必填。'); return; }
    if (!description.trim()) { setErrorMsg('「故障狀況描述」為必填。'); return; }

    setStatus('submitting');
    setErrorMsg('');
    
    try {
      const reportsRef = collection(db, 'repair_reports');
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
        submitterId: user.uid
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
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center border-t-8 border-green-500">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">報修已成功送出！</h2>
          <p className="text-gray-600 mb-6">新峰聚工程已收到您的需求，我們將盡快安排處理。</p>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-8">
            <p className="text-sm text-gray-500 font-semibold mb-1 flex items-center justify-center gap-1">
              <Hash className="w-4 h-4"/> 您的案件編號
            </p>
            <p className="text-2xl font-mono font-bold text-blue-700 tracking-wider">
              {submittedCaseNumber}
            </p>
          </div>
          <button onClick={handleReset} className="w-full bg-slate-100 text-slate-700 font-semibold py-3 px-4 rounded-xl hover:bg-slate-200">
            返回重新報修
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center p-4 sm:p-6 pb-24">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-700 to-blue-900 px-6 py-8 text-white relative">
          <div className="relative z-10">
            <p className="text-blue-200 text-sm font-medium tracking-wider mb-1">新峰聚工程</p>
            <h1 className="text-3xl font-bold flex items-center gap-2">快速線上報修 <Wrench className="w-6 h-6" /></h1>
          </div>
        </div>
        <form onSubmit={handleSubmit} noValidate className="p-6 sm:p-8 space-y-6">
          {errorMsg && (
             <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3 text-sm">
               <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" /> 
               <span className="font-semibold">{errorMsg}</span>
             </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">姓名 <span className="text-red-500">*</span></label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 py-3 px-4 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">電話 <span className="text-red-500">*</span></label>
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 py-3 px-4 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">維修地址 <span className="text-red-500">*</span></label>
            <textarea name="address" rows="2" value={formData.address} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 py-3 px-4 outline-none"></textarea>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">故障狀況描述 <span className="text-red-500">*</span></label>
            <textarea name="description" rows="3" value={formData.description} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 py-3 px-4 outline-none"></textarea>
          </div>
          <div>
             <div className="flex justify-between items-end mb-2">
               <label className="block text-sm font-semibold text-gray-700">現場照片 (選填，最多5張)</label>
             </div>
             <input type="file" ref={fileInputRef} accept="image/*" multiple onChange={handleFileChange} className="hidden" />
             {images.length < MAX_IMAGES && (
               <button type="button" onClick={() => fileInputRef.current.click()} className="w-full flex justify-center items-center gap-2 px-4 py-3 border-2 border-dashed border-blue-300 text-blue-600 rounded-xl hover:bg-blue-50 font-bold bg-slate-50">
                 <UploadCloud className="h-5 w-5" /> 點擊選擇照片
               </button>
             )}
             {images.length > 0 && (
               <div className="mt-3 grid grid-cols-3 gap-2">
                 {images.map((img, index) => (
                   <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                     <img src={img.dataUrl} className="w-full h-full object-cover" />
                     <button type="button" onClick={() => removeImage(index)} className="absolute top-1 right-1 bg-black bg-opacity-50 text-white rounded-full p-1"><X className="w-3 h-3" /></button>
                   </div>
                 ))}
               </div>
             )}
          </div>
          <div className="mt-16 pt-10 border-t-2 border-dashed border-slate-200">
            <button type="submit" disabled={status === 'submitting' || isOverLimit} className="w-full flex items-center justify-center gap-2 py-4 px-4 rounded-xl shadow-md text-xl font-bold text-white bg-blue-600 hover:bg-blue-700">
              {status === 'submitting' ? '送出中...' : '確認送出報修'}
            </button>
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

  useEffect(() => {
    if (!user) return;
    const reportsRef = collection(db, 'repair_reports');
    
    const unsubscribe = onSnapshot(reportsRef, (snapshot) => {
        const fetchedReports = [];
        snapshot.forEach((docSnap) => {
          fetchedReports.push({ id: docSnap.id, ...docSnap.data() });
        });
        fetchedReports.sort((a, b) => {
           const statusWeight = { pending: 0, processing: 1, completed: 2 };
           const weightA = statusWeight[a.status || 'pending'] ?? 0;
           const weightB = statusWeight[b.status || 'pending'] ?? 0;
           if (weightA !== weightB) return weightA - weightB; 
           return (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0);
        });
        setReports(fetchedReports);
        setLoading(false);
      }, (error) => {
        console.error("讀取資料失敗:", error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [user]);

  const handleStatusChange = async (reportId, newStatus) => {
    try {
      const reportRef = doc(db, 'repair_reports', reportId);
      await updateDoc(reportRef, { status: newStatus });
    } catch (error) {
      console.error("狀態更新失敗:", error);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '剛剛';
    const date = timestamp.toDate();
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const closeImageViewer = () => setSelectedImageIndex(null);

  const getStatusSelectStyle = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'processing': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'pending': default: return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 relative">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <List className="w-6 h-6 text-blue-600" />報修案件管理
          </h2>
        </div>
        <div className="bg-blue-100 text-blue-800 px-3 py-1.5 rounded-lg text-sm font-semibold">共 {reports.length} 件</div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-500">載入案件中...</div>
      ) : reports.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-10 text-center border border-dashed border-gray-300">
          <p className="text-gray-500 font-medium">目前沒有任何報修案件</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => {
            const imagesList = report.images || [];
            const currentStatus = report.status || 'pending';
            const isCompleted = currentStatus === 'completed';

            return (
              <div key={report.id} className={`bg-white rounded-2xl shadow-sm border p-5 ${isCompleted ? 'opacity-60' : ''}`}>
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center flex-wrap gap-3 mb-2">
                        <select
                          value={currentStatus}
                          onChange={(e) => handleStatusChange(report.id, e.target.value)}
                          className={`text-sm font-bold pl-3 pr-2 py-1.5 rounded-md cursor-pointer outline-none border ${getStatusSelectStyle(currentStatus)}`}
                        >
                          <option value="pending">🔴 待處理</option>
                          <option value="processing">⚡ 處理中</option>
                          <option value="completed">✅ 已完成</option>
                        </select>
                        <h3 className={`font-bold text-lg`}>{report.name}</h3>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-x-6 text-sm text-gray-600 mb-3">
                        <span className="flex items-center gap-1"><Phone className="w-4 h-4"/> {report.phone}</span>
                        <span className="flex items-start gap-1"><MapPin className="w-4 h-4"/> {report.address}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <div className="text-xs font-bold px-2 py-1 rounded-md border text-blue-700 bg-blue-50">
                        編號 {report.caseNumber}
                      </div>
                      <div className="text-sm text-gray-400 bg-slate-50 px-2 py-1 rounded-md">
                        {formatDate(report.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg text-sm bg-slate-50 border border-slate-100 text-gray-700">
                    {report.description}
                  </div>
                  {imagesList.length > 0 && (
                    <div className="mt-2 flex gap-2 overflow-x-auto pb-2">
                      {imagesList.map((img, idx) => (
                        <div key={idx} className="cursor-pointer border border-slate-200 shrink-0 w-24 h-24" onClick={() => setSelectedImageIndex({ imgIndex: idx, images: imagesList })}>
                          <img src={img} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedImageIndex && (
        <div className="fixed inset-0 z-[100] bg-black bg-opacity-90 flex items-center justify-center p-4">
          <div className="relative w-full h-full flex flex-col items-center justify-center">
            <button className="absolute top-4 right-4 text-white z-50 bg-black bg-opacity-50 rounded-full p-2" onClick={closeImageViewer}>
              <X className="w-8 h-8" />
            </button>
            <img src={selectedImageIndex.images[selectedImageIndex.imgIndex]} className="max-w-full max-h-[80vh] object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}