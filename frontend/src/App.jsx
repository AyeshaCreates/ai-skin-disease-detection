import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Activity, 
  Upload, 
  MapPin, 
  FileText, 
  HelpCircle, 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  RefreshCw, 
  Navigation, 
  Map, 
  Phone, 
  Star,
  ChevronRight,
  ShieldAlert,
  Download,
  Camera,
  ArrowLeft,
  Sun,
  Moon,
  Search,
  SlidersHorizontal,
  User,
  Settings,
  Lock,
  Eye,
  Trash2,
  Calendar,
  ClipboardCheck,
  Languages
} from 'lucide-react';
import SpeechRecorder from './components/SpeechRecorder';
import { API_BASE } from './config';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [theme, setTheme] = useState(() => localStorage.getItem('dermascan_theme') || 'light');
  const [language, setLanguage] = useState('en');
  const [symptoms, setSymptoms] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [useCamera, setUseCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  
  // Location States
  const [lat, setLat] = useState(null);
  const [lon, setLon] = useState(null);
  const [city, setCity] = useState('');
  const [locLoading, setLocLoading] = useState(false);
  const [locSuccess, setLocSuccess] = useState(false);
  
  // Diagnostic State
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  
  // Explainable AI visual states
  const [sliderPosition, setSliderPosition] = useState(50);
  const sliderContainerRef = useRef(null);
  const [xaiTab, setXaiTab] = useState('overlay');
  
  // History State
  const [history, setHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('dermascan_history')) || [];
    } catch {
      return [];
    }
  });
  
  // Library Explorer States
  const [librarySearch, setLibrarySearch] = useState('');
  const [libraryCategory, setLibraryCategory] = useState('All');
  const [selectedCondition, setSelectedCondition] = useState(null);

  // System Metrics State
  const [metrics, setMetrics] = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(false);

  // Scanner Simulator States
  const [scannerStep, setScannerStep] = useState(0);
  const scannerIntervalRef = useRef(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mapContainerRef = useRef(null);
  const leafletMapRef = useRef(null);

  // Apply theme class on body
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('dermascan_theme', theme);
  }, [theme]);

  // Load Model Metrics on mount
  useEffect(() => {
    fetchMetrics();
    startScannerSimulator();
    return () => {
      if (scannerIntervalRef.current) clearInterval(scannerIntervalRef.current);
    };
  }, []);

  // Sync history to localStorage
  useEffect(() => {
    localStorage.setItem('dermascan_history', JSON.stringify(history));
  }, [history]);

  const startScannerSimulator = () => {
    if (scannerIntervalRef.current) clearInterval(scannerIntervalRef.current);
    scannerIntervalRef.current = setInterval(() => {
      setScannerStep(prev => (prev + 1) % 5);
    }, 2800);
  };

  const fetchMetrics = async () => {
    setMetricsLoading(true);
    try {
      const resp = await axios.get(`${API_BASE}/api/metrics`, {
        headers: { 'Bypass-Tunnel-Reminder': 'true' }
      });
      setMetrics(resp.data);
    } catch (err) {
      console.error("Could not fetch metrics:", err);
    } finally {
      setMetricsLoading(false);
    }
  };

  // Draggable slider interaction handler
  const handleSliderMove = (e) => {
    if (!sliderContainerRef.current) return;
    const rect = sliderContainerRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const offset = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (offset / rect.width) * 100));
    setSliderPosition(percentage);
  };

  const handleSliderTouch = (e) => {
    handleSliderMove(e);
    window.addEventListener('touchmove', handleSliderMove);
    window.addEventListener('touchend', () => {
      window.removeEventListener('touchmove', handleSliderMove);
    });
  };

  const handleSliderMouse = (e) => {
    handleSliderMove(e);
    window.addEventListener('mousemove', handleSliderMove);
    window.addEventListener('mouseup', () => {
      window.removeEventListener('mousemove', handleSliderMove);
    });
  };

  // Handle Location Detection
  const detectLocation = () => {
    setLocLoading(true);
    setLocSuccess(false);
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      setLocLoading(false);
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude);
        setLon(position.coords.longitude);
        setLocSuccess(true);
        setLocLoading(false);
        axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`, {
          headers: { 'User-Agent': 'AISkinDiseaseDetectionSystemProject/1.0' }
        }).then(res => {
          if (res.data && res.data.address) {
            const addr = res.data.address;
            const locName = addr.city || addr.town || addr.suburb || addr.state || '';
            setCity(locName);
          }
        }).catch(err => console.log(err));
      },
      (err) => {
        console.error(err);
        setError("Location request denied. Please type your city manually.");
        setLocLoading(false);
      },
      { timeout: 8000 }
    );
  };

  // Leaflet Map loading helper
  useEffect(() => {
    if (activeTab === 'hospitals' && result && result.hospitals && mapContainerRef.current) {
      // Dynamic script loading for Leaflet if not present
      if (!window.L) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);

        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = initLeafletMap;
        document.body.appendChild(script);
      } else {
        setTimeout(initLeafletMap, 200);
      }
    }
    
    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [activeTab, result]);

  const initLeafletMap = () => {
    if (!mapContainerRef.current || !result) return;
    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
    }

    const mapCenter = [result.location.lat, result.location.lon];
    const map = window.L.map(mapContainerRef.current).setView(mapCenter, 13);
    leafletMapRef.current = map;

    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Marker for User
    const userIcon = window.L.divIcon({
      className: 'custom-div-icon',
      html: `<div style="background-color: #D4AF37; width: 14px; height: 14px; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 10px rgba(0,0,0,0.3);"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    });
    window.L.marker(mapCenter, { icon: userIcon }).addTo(map).bindPopup("Your Location").openPopup();

    // Markers for Hospitals
    result.hospitals.forEach((h) => {
      const hospitalIcon = window.L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: #1e3a8a; width: 12px; height: 12px; border: 2px solid white; border-radius: 50%;"></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6]
      });
      window.L.marker([h.lat, h.lon], { icon: hospitalIcon }).addTo(map).bindPopup(`
        <div style="font-family: 'Inter', sans-serif;">
          <h4 style="margin: 0; font-weight: bold; font-size: 13px; color: #0f172a;">${h.name}</h4>
          <p style="margin: 4px 0 0; font-size: 11px; color: #64748b;">Rating: <b>${h.rating} ★</b> | Distance: <b>${h.distance}</b></p>
        </div>
      `);
    });
  };

  // Image helpers
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e) => e.preventDefault();
  
  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    setUseCamera(true);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error(err);
      setError("Unable to access local camera. Please upload an image file instead.");
      setUseCamera(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
      
      canvasRef.current.toBlob((blob) => {
        const file = new File([blob], "captured_lesion.jpg", { type: "image/jpeg" });
        setImage(file);
        setImagePreview(canvasRef.current.toDataURL('image/jpeg'));
        stopCamera();
        setUseCamera(false);
      }, 'image/jpeg');
    }
  };

  // Diagnostic Endpoint call
  const runDiagnosticAnalysis = async (e) => {
    e.preventDefault();
    if (!image) return;
    
    setLoading(true);
    setResult(null);
    setError(null);
    setLoadingStep('Uploading parameters...');

    const formData = new FormData();
    formData.append('image', image);
    formData.append('symptoms', symptoms);
    formData.append('language', language);
    if (lat) formData.append('lat', lat);
    if (lon) formData.append('lon', lon);
    if (city) formData.append('city', city);

    setTimeout(() => setLoadingStep('Extracting visual features...'), 800);
    setTimeout(() => setLoadingStep('Analyzing language markers...'), 1800);
    setTimeout(() => setLoadingStep('Fusing multi-modal representation...'), 2800);

    try {
      const resp = await axios.post(`${API_BASE}/api/predict`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Bypass-Tunnel-Reminder': 'true'
        }
      });
      
      setResult(resp.data);
      setActiveTab('results');
      
      // Save to local screening history
      const newRecord = {
        id: Date.now().toString(),
        date: new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }),
        disease: resp.data.disease,
        confidence: resp.data.confidence,
        severity: resp.data.severity,
        image: resp.data.original_image,
        heatmap: resp.data.heatmap_image,
        overlay: resp.data.overlay_image,
        explanation: resp.data.explanation,
        recommendations: resp.data.recommendations,
        hospitals: resp.data.hospitals,
        location: resp.data.location,
        top_predictions: resp.data.top_predictions || []
      };
      setHistory(prev => [newRecord, ...prev]);

    } catch (err) {
      console.error(err);
      if (err.response && err.response.data && err.response.data.detail) {
        setError(err.response.data.detail);
      } else {
        setError("Failed to connect to AI server. Please check that the backend is active.");
      }
    } finally {
      setLoading(false);
      stopCamera();
    }
  };

  // PDF Report Download triggers
  const downloadReport = async () => {
    if (!result) return;
    setError(null);
    try {
      const payload = {
        disease: result.disease,
        confidence: result.confidence,
        severity: result.severity,
        symptoms: result.translated_symptoms,
        language: language,
        original_image: result.original_image,
        heatmap_image: result.heatmap_image,
        hospitals: result.hospitals,
        recommendations: result.recommendations
      };

      const resp = await axios.post(`${API_BASE}/api/export-pdf`, payload, {
        responseType: 'blob',
        headers: { 'Bypass-Tunnel-Reminder': 'true' }
      });

      const url = window.URL.createObjectURL(new Blob([resp.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Dermascan_Report_${result.disease.replace(/\s+/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(err);
      setError("Failed to generate PDF document. Please verify download server status.");
    }
  };

  const deleteHistoryRecord = (id, e) => {
    e.stopPropagation();
    setHistory(prev => prev.filter(r => r.id !== id));
  };

  const viewHistoryRecord = (rec) => {
    setResult(rec);
    setActiveTab('results');
  };

  // 18 diseases explorer metadata
  const listDiseases = [
    { name: "Melanoma", type: "Malignant", desc: "A highly aggressive form of skin cancer arising from pigment-producing melanocytes. Often presents with asymmetrical shape, irregular borders, multiple colors, or evolving size." },
    { name: "Melanocytic Nevus", type: "Benign", desc: "A common benign collection of melanocytes, often referred to as a mole. Typically small, symmetrical, round or oval, and uniform in color (brown, tan)." },
    { name: "Atopic Dermatitis (Eczema)", type: "Inflammatory", desc: "A chronic, itchy inflammatory skin disease. Characterized by dry, scaly red patches, especially on skin creases (elbows, knees, cheeks) with intense pruritus." },
    { name: "Seborrheic Keratosis", type: "Benign", desc: "A very common non-cancerous skin growth that has a waxy, scaly, or 'stuck-on' appearance. Varies in color from light tan to dark black." },
    { name: "Acne Vulgaris", type: "Acne & Glands", desc: "An inflammatory disorder of the hair follicles and sebaceous glands. Leads to comedones (blackheads/whiteheads), papules, and pus-filled pustules." },
    { name: "Basal Cell Carcinoma", type: "Malignant", desc: "The most common form of skin cancer. Often appears as a slow-growing, shiny, pearly pink nodule with prominent spider veins (telangiectasia) and rolled borders." },
    { name: "Psoriasis", type: "Inflammatory", desc: "An autoimmune disease causing rapid skin cell multiplication. Results in thick red plaques covered with silvery scales, commonly on extensor surfaces." },
    { name: "Vitiligo", type: "Pigmentation", desc: "An autoimmune loss of skin melanocytes, resulting in smooth, flat, milky-white patches lacking natural pigments, often symmetric." },
    { name: "Rosacea", type: "Inflammatory", desc: "A chronic condition causing persistent facial redness, flushing, and visible small blood vessels, sometimes with acne-like red bumps." },
    { name: "Tinea Corporis (Ringworm)", type: "Infectious", desc: "A superficial fungal infection presenting as a red, circular ring-like lesion with raised, active scaly borders and a clearer center." },
    { name: "Impetigo", type: "Infectious", desc: "A highly contagious bacterial skin infection causing painful red sores that quickly rupture and ooze honey-colored crusts." },
    { name: "Urticaria (Hives)", type: "Inflammatory", desc: "A vascular skin reaction causing highly itchy, raised red or skin-colored welts (wheals) that appear and disappear rapidly." },
    { name: "Warts", type: "Infectious", desc: "Rough, elevated cauliflower-textured growths on hands or feet caused by local epidermal infection with the Human Papillomavirus (HPV)." },
    { name: "Contact Dermatitis", type: "Inflammatory", desc: "A localized skin rash caused by direct contact with allergens (e.g. nickel, cosmetic ingredients) or chemical irritants." },
    { name: "Folliculitis", type: "Infectious", desc: "An inflammation/infection of hair follicles presenting as small pus-filled pimples around hair shafts, triggered by shaving or friction." },
    { name: "Lichen Planus", type: "Inflammatory", desc: "An autoimmune condition causing itchy, flat-topped shiny purple (violaceous) polygonal bumps, often displaying fine white lines." },
    { name: "Herpes Zoster", type: "Infectious", desc: "Commonly called shingles. A painful reactivated viral infection causing a unilateral band-like strip of fluid blisters along nerve pathways." },
    { name: "Pityriasis Rosea", type: "Inflammatory", desc: "An acute self-limiting skin rash starting with a single large 'herald patch' followed by smaller scaly salmon-colored oval spots." }
  ];

  const filteredLibrary = listDiseases.filter(d => {
    const matchSearch = d.name.toLowerCase().includes(librarySearch.toLowerCase()) || d.desc.toLowerCase().includes(librarySearch.toLowerCase());
    const matchCat = libraryCategory === 'All' || d.type === libraryCategory;
    return matchSearch && matchCat;
  });

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-stone-50 text-slate-800'}`}>
      
      {/* Premium Sticky Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md border-b border-stone-200/40 dark:border-slate-800/40 bg-white/70 dark:bg-slate-900/70 transition-all duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab('home')}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-500 flex items-center justify-center shadow-lg shadow-amber-500/10">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-serif text-lg font-bold tracking-wider text-slate-900 dark:text-white">DERMASCAN AI</span>
              <span className="hidden sm:inline block text-[9px] font-bold text-amber-600 dark:text-amber-500 tracking-widest uppercase block -mt-1">Clinical Screening</span>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="hidden md:flex items-center gap-1.5">
            {[
              { id: 'home', label: 'Home' },
              { id: 'diagnosis', label: 'AI Screening' },
              { id: 'dashboard', label: 'Health Overview' },
              { id: 'history', label: 'History Logs' },
              { id: 'library', label: 'Disease Library' },
              { id: 'research', label: 'Research Lab' },
              { id: 'profile', label: 'Profile Settings' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setError(null); }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-150 ${
                  activeTab === tab.id 
                    ? 'bg-gradient-to-r from-amber-600 to-yellow-600 text-white shadow-md shadow-amber-600/10' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-stone-200/50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Quick Actions */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button 
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="p-2 rounded-xl border border-stone-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-stone-50 dark:hover:bg-slate-855 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm"
              title="Toggle Appearance"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            <button 
              onClick={() => { setActiveTab('diagnosis'); setError(null); }}
              className="hidden lg:flex px-4 py-2 bg-gradient-to-r from-amber-600 to-yellow-600 text-white hover:from-amber-700 hover:to-yellow-700 text-xs font-bold rounded-xl transition-all shadow-sm"
            >
              Start screening
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Error Notification Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-2xl flex items-start gap-3 text-red-800 dark:text-red-300 animate-slide-up">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
            <div className="flex-grow">
              <h4 className="font-bold text-sm">System Validation Alert</h4>
              <p className="text-xs mt-0.5 leading-relaxed">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 text-xs font-bold px-2 py-1 bg-red-100 dark:bg-red-900/50 rounded-lg">Dismiss</button>
          </div>
        )}

        {/* Neural Network Loader Modal */}
        {loading && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-stone-200/50 dark:border-slate-800/80 max-w-sm w-full p-8 rounded-3xl text-center flex flex-col items-center shadow-2xl animate-scale-in">
              <div className="p-4 bg-amber-500/10 rounded-full text-amber-600 dark:text-amber-400 mb-4 animate-spin-slow">
                <Activity className="w-10 h-10 animate-pulse" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white font-serif tracking-wide">Fusing Clinical Vectors</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 leading-relaxed">Please hold. Our multimodal network is aligning clinical features and text representations.</p>
              
              <div className="w-full bg-slate-100 dark:bg-slate-850 h-1.5 rounded-full overflow-hidden mt-6 mb-4">
                <div className="bg-gradient-to-r from-amber-600 to-yellow-500 h-full w-2/3 rounded-full animate-[progress_3s_infinite_ease-in-out]"></div>
              </div>
              
              <div className="flex items-center gap-2 text-[10px] font-bold text-amber-700 dark:text-amber-500 uppercase tracking-widest bg-amber-500/10 px-3 py-1.5 rounded-full">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>{loadingStep}</span>
              </div>
            </div>
          </div>
        )}

        {/* 1. HOME TAB */}
        {activeTab === 'home' && (
          <div className="space-y-16 animate-fade-in">
            {/* Apple style Hero */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center py-6">
              <div className="space-y-6 text-left">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-600 dark:text-amber-400 bg-amber-500/10 px-4 py-1.5 rounded-full">AI DERMATOLOGY PLATFORM</span>
                <h1 className="text-4xl sm:text-5xl font-bold font-serif text-slate-900 dark:text-white tracking-tight leading-tight">
                  Understand Your Skin.<br />With AI.
                </h1>
                <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed max-w-lg">
                  Analyze skin images and symptoms through an intelligent, explainable AI experience. Fuses visual convolutional models with language transformers to deliver calibrated clinical suggestions.
                </p>
                <div className="pt-4 flex flex-wrap gap-4">
                  <button onClick={() => { setActiveTab('diagnosis'); setError(null); }} className="px-6 py-3 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700 text-white font-bold rounded-xl shadow-md shadow-amber-600/10 flex items-center gap-2 transition-all active:scale-[0.98]">
                    Start AI Screening
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button onClick={() => setActiveTab('library')} className="px-6 py-3 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-stone-200 dark:border-slate-800 hover:bg-stone-50 dark:hover:bg-slate-850 font-bold rounded-xl transition-all">
                    Explore Disease Library
                  </button>
                </div>
              </div>

              {/* Scanning Simulator mockup on right */}
              <div className="relative bg-white dark:bg-slate-900 border border-stone-200/50 dark:border-slate-800/80 rounded-3xl p-6 shadow-xl aspect-[1.2/1] overflow-hidden flex flex-col justify-between">
                <div className="absolute inset-0 bg-gradient-to-b from-stone-500/5 to-transparent pointer-events-none"></div>
                {/* Header Simulator */}
                <div className="flex justify-between items-center border-b border-stone-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></div>
                    <span className="text-[10px] font-extrabold tracking-widest text-slate-400 uppercase">Live Inference Engine</span>
                  </div>
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-500 uppercase bg-amber-500/10 px-2 py-0.5 rounded">AI Preview</span>
                </div>

                {/* Animation screen simulator */}
                <div className="flex-grow flex items-center justify-center relative py-4">
                  {/* Outer scan border */}
                  <div className="relative w-44 aspect-square rounded-2xl border-2 border-amber-600/30 overflow-hidden shadow-md">
                    <img src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=300&q=80" alt="Lesion scan" className="w-full h-full object-cover grayscale opacity-90" />
                    
                    {/* Laser line scanning */}
                    <div 
                      className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-500 to-transparent shadow-lg shadow-amber-500/80"
                      style={{
                        animation: 'scan-laser 3s infinite ease-in-out',
                        top: `${scannerStep * 20}%`
                      }}
                    ></div>

                    {/* Scanner box corners */}
                    <div className="absolute top-2 left-2 w-3.5 h-3.5 border-t-2 border-l-2 border-amber-500"></div>
                    <div className="absolute top-2 right-2 w-3.5 h-3.5 border-t-2 border-r-2 border-amber-500"></div>
                    <div className="absolute bottom-2 left-2 w-3.5 h-3.5 border-b-2 border-l-2 border-amber-500"></div>
                    <div className="absolute bottom-2 right-2 w-3.5 h-3.5 border-b-2 border-r-2 border-amber-500"></div>
                  </div>

                  {/* Simulator details card */}
                  <div className="absolute bottom-1 right-1 sm:right-6 bg-slate-900/90 backdrop-blur-sm border border-slate-700/50 p-3 rounded-xl max-w-[170px] text-left text-white shadow-lg animate-scale-in">
                    <span className="text-[8px] font-bold text-amber-500 uppercase tracking-wider block">Live Diagnostic Logs</span>
                    <p className="text-[10px] font-mono mt-1 text-slate-300 leading-tight">
                      {scannerStep === 0 && "➔ Capturing frame..."}
                      {scannerStep === 1 && "➔ Checking skin contours..."}
                      {scannerStep === 2 && "➔ Running EfficientNetB0..."}
                      {scannerStep === 3 && "➔ Fusing linguistic keys..."}
                      {scannerStep === 4 && "➔ Grad-CAM mapped successfully."}
                    </p>
                  </div>
                </div>

                {/* Mockup footer results */}
                <div className="bg-stone-50 dark:bg-slate-850 border border-stone-200/30 dark:border-slate-800 p-3 rounded-2xl flex items-center justify-between text-xs font-bold mt-2">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-amber-600" />
                    <span className="text-slate-800 dark:text-slate-200">Psoriasis Detected</span>
                  </div>
                  <span className="text-emerald-600 dark:text-emerald-500">94.2% Confidence</span>
                </div>
              </div>
            </div>

            {/* Minimal Trust bar below hero */}
            <div className="border-y border-stone-200/50 dark:border-slate-800/80 py-8 grid grid-cols-2 md:grid-cols-5 gap-6 text-center text-xs font-extrabold tracking-widest text-slate-400 uppercase">
              <span className="hover:text-slate-900 dark:hover:text-white transition-colors">MULTIMODAL AI</span>
              <span className="hover:text-slate-900 dark:hover:text-white transition-colors">EXPLAINABLE RESULTS</span>
              <span className="hover:text-slate-900 dark:hover:text-white transition-colors">SECURE DESIGN</span>
              <span className="hover:text-slate-900 dark:hover:text-white transition-colors">MULTILINGUAL (EN/HI/KN)</span>
              <span className="hover:text-slate-900 dark:hover:text-white transition-colors col-span-2 md:col-span-1">DERMATOLOGY FOCUSED</span>
            </div>

            {/* How It Works stepper */}
            <div className="space-y-12">
              <div className="text-center max-w-xl mx-auto space-y-2">
                <h2 className="text-2xl font-serif font-bold text-slate-900 dark:text-white">How it Works</h2>
                <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">Understand our dynamic multi-modal clinical processing pipeline in 5 steps.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-6 relative">
                {/* Visual steps */}
                {[
                  { step: '01', title: 'Upload Image', desc: 'Securely upload a photo of the affected skin area.' },
                  { step: '02', title: 'Describe Symptoms', desc: 'Type or record symptoms in English, Hindi, or Kannada.' },
                  { step: '03', title: 'AI Joint Fusion', desc: 'The network merges image CNN and text representations.' },
                  { step: '04', title: 'Understand Results', desc: 'Examine predictions, severity, and visual Grad-CAM overlays.' },
                  { step: '05', title: 'Dermatologist Routing', desc: 'Locate local clinics matching coordinates.' }
                ].map((s, idx) => (
                  <div key={idx} className="bg-white dark:bg-slate-900 border border-stone-200/50 dark:border-slate-800/80 p-5 rounded-2xl flex flex-col justify-between shadow-sm relative z-10">
                    <span className="text-2xl font-black text-amber-500/20 font-serif leading-none block">{s.step}</span>
                    <div className="mt-4">
                      <h4 className="font-serif font-bold text-sm text-slate-900 dark:text-white">{s.title}</h4>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed mt-1.5">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Multimodal AI fusion visual representation */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center bg-gradient-to-br from-stone-100 to-amber-500/5 dark:from-slate-900 dark:to-amber-500/5 border border-stone-200/30 dark:border-slate-855 p-8 rounded-3xl">
              <div className="space-y-4">
                <h3 className="text-2xl font-serif font-bold text-slate-900 dark:text-white">Multimodal Fusion Architecture</h3>
                <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm leading-relaxed">
                  Skin conditions display rich clinical features in both visual patterns and systemic histories. Dermascan AI combines these channels. It encodes the skin photo using a fine-tuned convolutional network, and processes symptoms via a multilingual language transformer. The fused vector yields higher accuracy than single-modality checks.
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white dark:bg-slate-900 border border-stone-200/40 dark:border-slate-800 rounded-2xl shadow-sm text-center">
                    <span className="block text-[10px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-widest mb-1">Vision Channel</span>
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200">EfficientNet-B0 CNN</span>
                  </div>
                  <div className="p-4 bg-white dark:bg-slate-900 border border-stone-200/40 dark:border-slate-800 rounded-2xl shadow-sm text-center">
                    <span className="block text-[10px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-widest mb-1">Linguistic Channel</span>
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200">MiniLM Transformer</span>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-amber-600 to-yellow-600 p-4 text-center rounded-2xl text-white font-bold text-xs shadow-md">
                  Joint Fusion Network (1664-dim merged tensor)
                </div>
                <div className="p-3 bg-white dark:bg-slate-900 border border-stone-200/50 dark:border-slate-800 rounded-2xl text-center text-xs font-bold text-emerald-600 dark:text-emerald-500">
                  ✔ 99.07% Joint Validation Accuracy
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. DIAGNOSIS FORM TAB */}
        {activeTab === 'diagnosis' && (
          <form onSubmit={runDiagnosticAnalysis} className="max-w-4xl mx-auto space-y-8 animate-fade-in">
            <div className="flex flex-col gap-1.5 border-b border-stone-200/50 dark:border-slate-800 pb-5">
              <h2 className="text-2xl font-bold font-serif text-slate-900 dark:text-white">AI Screening Console</h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">Please provide a high-resolution skin photograph and symptom inputs below.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column: Image Upload */}
              <div className="bg-white dark:bg-slate-900 border border-stone-200/50 dark:border-slate-800 p-6 rounded-3xl flex flex-col gap-4 shadow-sm">
                <label className="text-xs font-extrabold uppercase tracking-widest text-slate-400">1. Upload Skin Lesion Image</label>
                
                {useCamera ? (
                  <div className="relative aspect-square bg-slate-950 rounded-2xl overflow-hidden border border-slate-800">
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover"></video>
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3 px-4">
                      <button type="button" onClick={capturePhoto} className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all">
                        <Camera className="w-4 h-4" /> Capture Photo
                      </button>
                      <button type="button" onClick={() => { setUseCamera(false); stopCamera(); }} className="px-4 py-2.5 bg-slate-850 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : imagePreview ? (
                  <div className="relative aspect-square rounded-2xl overflow-hidden border border-stone-200 dark:border-slate-800 shadow-inner group">
                    <img src={imagePreview} alt="Uploaded Skin Lesion" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-200">
                      <button 
                        type="button" 
                        onClick={() => { setImage(null); setImagePreview(null); }} 
                        className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all"
                      >
                        Remove Photo
                      </button>
                    </div>
                  </div>
                ) : (
                  <div 
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className="aspect-square bg-stone-100/50 dark:bg-slate-950 border-2 border-dashed border-stone-200 dark:border-slate-850 rounded-2xl flex flex-col items-center justify-center p-6 text-center group cursor-pointer hover:bg-stone-100/80 dark:hover:bg-slate-900 hover:border-amber-600/50 transition-all duration-300"
                  >
                    <div className="p-4 bg-white dark:bg-slate-900 rounded-full text-slate-400 group-hover:text-amber-600 dark:group-hover:text-amber-500 shadow-sm group-hover:scale-105 transition-all duration-300 mb-3 border border-stone-100 dark:border-slate-800">
                      <Upload className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Drag & Drop Image Here</span>
                    <span className="text-[10px] text-slate-400 mt-1">Supports PNG, JPG, JPEG up to 10MB</span>
                    
                    <div className="mt-6 flex gap-3">
                      <label className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 hover:bg-stone-50 dark:hover:bg-slate-855 rounded-xl text-xs font-bold shadow-sm cursor-pointer text-slate-800 dark:text-slate-200">
                        Browse Files
                        <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                      </label>
                      <button type="button" onClick={startCamera} className="px-4 py-2.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-950 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all">
                        <Camera className="w-3.5 h-3.5 text-amber-500" />
                        Use Camera
                      </button>
                    </div>
                  </div>
                )}
                <canvas ref={canvasRef} className="hidden"></canvas>
              </div>

              {/* Right Column: Symptoms & Location */}
              <div className="flex flex-col gap-6">
                {/* Language Select & Text */}
                <div className="bg-white dark:bg-slate-900 border border-stone-200/50 dark:border-slate-800 p-6 rounded-3xl flex flex-col gap-4 shadow-sm">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-extrabold uppercase tracking-widest text-slate-400">2. Input Language & Symptoms</label>
                    <select 
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="text-xs font-bold border border-stone-200 dark:border-slate-800 rounded-lg p-2 bg-stone-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 outline-none cursor-pointer focus:border-amber-500"
                    >
                      <option value="en">English</option>
                      <option value="hi">हिंदी (Hindi)</option>
                      <option value="kn">ಕನ್ನಡ (Kannada)</option>
                    </select>
                  </div>

                  <textarea
                    rows={4}
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    placeholder={
                      language === 'en' 
                        ? "Describe your symptoms (e.g. Red ring-shaped rash on my arm with raised scaly edges, dry patches...)" 
                        : language === 'hi' 
                        ? "अपने लक्षणों का वर्णन करें (जैसे: त्वचा पर अंगूठी जैसा लाल चकत्ता, उभरे हुए किनारे, खुजली...)"
                        : "ನಿಮ್ಮ ರೋಗಲಕ್ಷಣಗಳನ್ನು ವಿವರಿಸಿ (ಉದಾಹರಣೆಗೆ: ಚರ್ಮದ ಮೇಲೆ ಗೋಳಾಕಾರದ ಉಂಗುರದಂತಹ ಕೆಂಪು ದದ್ದುಗಳು, ತುರಿಕೆ...)"
                    }
                    className="w-full border border-stone-200 dark:border-slate-855 rounded-xl p-3.5 text-xs bg-stone-100/30 dark:bg-slate-950 text-slate-800 dark:text-slate-200 outline-none focus:border-amber-500 focus:bg-white dark:focus:bg-slate-900 resize-none font-medium leading-relaxed"
                  ></textarea>

                  <SpeechRecorder 
                    language={language} 
                    onTranscript={(text) => setSymptoms(prev => prev ? `${prev} ${text}` : text)}
                    disabled={loading}
                  />
                </div>

                {/* Location Detection */}
                <div className="bg-white dark:bg-slate-900 border border-stone-200/50 dark:border-slate-800 p-6 rounded-3xl flex flex-col gap-4 shadow-sm">
                  <label className="text-xs font-extrabold uppercase tracking-widest text-slate-400">3. Hospital Geolocation Routing</label>
                  
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={detectLocation}
                      disabled={locLoading}
                      className={`flex-grow flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                        locSuccess 
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900 dark:text-emerald-300' 
                          : 'bg-white dark:bg-slate-900 border-stone-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-stone-50'
                      }`}
                    >
                      <MapPin className={`w-4 h-4 ${locSuccess ? 'text-emerald-600 dark:text-emerald-500' : 'text-slate-400'}`} />
                      {locLoading ? "Locating..." : locSuccess ? "GPS Location Locked" : "Detect Current Location"}
                    </button>
                    
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Or search city"
                      className="w-1/2 border border-stone-200 dark:border-slate-855 rounded-xl px-3 py-2.5 text-xs bg-stone-100/30 dark:bg-slate-950 text-slate-800 dark:text-slate-200 outline-none focus:border-amber-500 font-bold"
                    />
                  </div>
                  
                  {locSuccess && lat && lon && (
                    <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-500 uppercase flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Coordinates detected: {lat.toFixed(4)}°N, {lon.toFixed(4)}°E {city ? `(${city})` : ''}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-center">
              <button 
                type="submit" 
                disabled={loading || !image || !symptoms.trim()}
                className="px-8 py-4 bg-gradient-to-r from-amber-600 to-yellow-600 text-white hover:from-amber-700 hover:to-yellow-700 text-sm font-extrabold rounded-xl transition-all shadow-md shadow-amber-600/10 flex items-center justify-center gap-2 w-full sm:w-80 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]"
              >
                <Activity className="w-5 h-5" />
                Analyze Skin & Symptoms
              </button>
            </div>
          </form>
        )}

        {/* 3. DIAGNOSTIC RESULTS TAB */}
        {activeTab === 'results' && result && (
          <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-stone-200/50 dark:border-slate-800 pb-5">
              <div>
                <h2 className="text-2xl font-bold font-serif text-slate-900 dark:text-white">Analysis Complete</h2>
                <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5">Symptom history: "{result.translated_symptoms}"</p>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button onClick={downloadReport} className="flex-grow sm:flex-grow-0 px-4 py-2.5 bg-gradient-to-r from-amber-600 to-yellow-600 text-white hover:from-amber-700 hover:to-yellow-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] transition-all">
                  <Download className="w-4 h-4" /> Download PDF Report
                </button>
                <button onClick={() => { setActiveTab('diagnosis'); setError(null); }} className="px-4 py-2.5 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-stone-200 dark:border-slate-800 hover:bg-stone-50 dark:hover:bg-slate-850 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all">
                  <ArrowLeft className="w-4 h-4" /> Back to Console
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left & Middle Column: Core Results */}
              <div className="lg:col-span-2 space-y-8">
                
                {/* Result metrics cards */}
                <div className="bg-white dark:bg-slate-900 border border-stone-200/50 dark:border-slate-800 p-6 rounded-3xl grid grid-cols-1 sm:grid-cols-3 gap-6 shadow-sm">
                  
                  {/* Disease Name */}
                  <div className="flex flex-col justify-between p-4 bg-stone-100/40 dark:bg-slate-950 border border-stone-200/20 dark:border-slate-800 rounded-2xl text-left">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Predicted Condition</span>
                    <h3 className="text-lg font-serif font-bold text-slate-900 dark:text-white mt-2 leading-snug">{result.disease}</h3>
                    <p className="text-[8px] font-extrabold uppercase text-amber-600 dark:text-amber-500 tracking-wider mt-1.5">Primary Match</p>
                  </div>

                  {/* Calibrated Confidence */}
                  <div className="flex flex-col justify-between p-4 bg-stone-100/40 dark:bg-slate-950 border border-stone-200/20 dark:border-slate-800 rounded-2xl text-left">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Confidence Score</span>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{Math.round(result.confidence * 100)}</span>
                      <span className="text-xs font-bold text-slate-500">%</span>
                    </div>
                    {/* Confidence category tag */}
                    <div className="mt-2.5 flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${
                        result.confidence >= 0.90 
                          ? 'bg-emerald-500 animate-pulse' 
                          : result.confidence >= 0.70 
                          ? 'bg-amber-500' 
                          : 'bg-red-500'
                      }`}></span>
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                        {result.confidence >= 0.90 
                          ? 'High Confidence' 
                          : result.confidence >= 0.70 
                          ? 'Moderate Confidence' 
                          : 'Low Confidence'}
                      </span>
                    </div>
                  </div>

                  {/* Clinical Severity */}
                  <div className="flex flex-col justify-between p-4 bg-stone-100/40 dark:bg-slate-950 border border-stone-200/20 dark:border-slate-800 rounded-2xl text-left">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Clinical Severity</span>
                    <div className="mt-2 flex items-center gap-2">
                      <div 
                        className={`w-3.5 h-3.5 rounded-full ${
                          result.severity === 'Mild' 
                            ? 'bg-emerald-500 shadow-emerald-200' 
                            : result.severity === 'Moderate' 
                            ? 'bg-amber-500 shadow-amber-200' 
                            : 'bg-red-500 shadow-red-200'
                        } shadow-md`}
                      ></div>
                      <span className="text-xl font-bold text-slate-900 dark:text-white">{result.severity}</span>
                    </div>
                    <p className="text-[8px] font-extrabold text-slate-400 uppercase tracking-wider mt-1.5">Severity Output</p>
                  </div>
                </div>

                {/* Alternating top predictions expandable */}
                {result.top_predictions && result.top_predictions.length > 1 && (
                  <div className="bg-white dark:bg-slate-900 border border-stone-200/50 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
                    <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-4">Differential Diagnosis Matches</h4>
                    <div className="space-y-3">
                      {result.top_predictions.map((p, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs font-bold py-2 border-b border-stone-100 dark:border-slate-850 last:border-b-0">
                          <span className="text-slate-800 dark:text-slate-200">{p.disease}</span>
                          <span className="text-slate-400">{Math.round(p.confidence * 100)}% Match</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Explanations & Action Plan */}
                <div className="bg-white dark:bg-slate-900 border border-stone-200/50 dark:border-slate-800 p-6 sm:p-8 rounded-3xl space-y-6 shadow-sm">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest border-b border-stone-100 dark:border-slate-800 pb-3 flex items-center gap-2">
                      <Info className="w-4 h-4 text-amber-600" />
                      Clinical Definition
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed mt-3">{result.explanation}</p>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest border-b border-stone-100 dark:border-slate-800 pb-3 flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-amber-600" />
                      Action Guidelines
                    </h4>
                    <div className="mt-4 space-y-3">
                      {result.recommendations.map((rec, idx) => (
                        <div key={idx} className="flex gap-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                          <span className="text-amber-500 font-extrabold flex-shrink-0 mt-0.5">•</span>
                          <span className="leading-relaxed">{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Medical Safety Disclaimer */}
                  <div className="p-4 bg-amber-500/5 border border-amber-600/20 rounded-2xl text-[10px] sm:text-xs text-amber-700 dark:text-amber-500 leading-relaxed font-bold">
                    ⚠️ <strong>Medical Disclaimer:</strong> This screening report is generated by a multi-modal artificial intelligence system for educational assistance and preliminary routing purposes. It is not a clinical confirmation or medical diagnosis. Please consult a qualified dermatologist for physical evaluation and diagnosis.
                  </div>
                </div>
              </div>

              {/* Right Column: Draggable visualizer slider */}
              <div className="bg-white dark:bg-slate-900 border border-stone-200/50 dark:border-slate-800 p-6 rounded-3xl flex flex-col gap-6 shadow-sm">
                <div className="border-b border-stone-100 dark:border-slate-800 pb-3">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                    <Map className="w-4 h-4 text-amber-600" />
                    See What the AI Sees
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-1">Drag the vertical slider to compare the original photo with the Grad-CAM attention overlay.</p>
                </div>

                {/* Draggable slider visualizer */}
                <div 
                  ref={sliderContainerRef}
                  onMouseDown={handleSliderMouse}
                  onTouchStart={handleSliderTouch}
                  className="relative aspect-square w-full rounded-2xl overflow-hidden border border-stone-200 dark:border-slate-855 shadow-inner select-none cursor-ew-resize"
                >
                  {/* Underlay (Heatmap/Overlay) */}
                  <img 
                    src={result.overlay_image} 
                    alt="Grad-CAM Overlay" 
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                  />

                  {/* Overlay (Original image, width constrained by slider position) */}
                  <div 
                    className="absolute inset-0 overflow-hidden border-r border-amber-500"
                    style={{ width: `${sliderPosition}%` }}
                  >
                    <img 
                      src={result.original_image} 
                      alt="Original Lesion" 
                      className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                      style={{ width: sliderContainerRef.current ? sliderContainerRef.current.clientWidth : '100%' }}
                    />
                  </div>

                  {/* Handle indicator */}
                  <div 
                    className="absolute top-0 bottom-0 w-1 bg-amber-500 flex items-center justify-center"
                    style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
                  >
                    <div className="w-6 h-6 rounded-full bg-amber-600 text-white flex items-center justify-center shadow-md border-2 border-white text-[10px] font-bold">↔</div>
                  </div>
                </div>

                {/* Visualizer tabs */}
                <div className="flex bg-stone-100 dark:bg-slate-950 p-1 rounded-xl">
                  {['original', 'heatmap', 'overlay'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setXaiTab(tab)}
                      className={`flex-grow py-2 text-[10px] font-bold rounded-lg uppercase tracking-wider transition-all duration-200 ${
                        xaiTab === tab 
                          ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-500 shadow-sm' 
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Show active tab image if clicked */}
                {xaiTab !== 'overlay' && (
                  <div className="aspect-square bg-slate-950 rounded-xl overflow-hidden shadow-inner">
                    <img 
                      src={xaiTab === 'heatmap' ? result.heatmap_image : result.original_image} 
                      alt="XAI view" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="text-[10px] font-bold text-slate-500 leading-relaxed bg-stone-50 dark:bg-slate-950 border border-stone-200/40 dark:border-slate-855 p-3 rounded-xl">
                  💡 <strong>Attention Map Indicator:</strong> The highlighted yellow and red heat spots show which specific pixels of the lesion borders or colors the Vision AI focused on to classify the skin tissue.
                </div>
              </div>
            </div>

            {/* Quick hospital redirection */}
            <div className="bg-white dark:bg-slate-900 border border-stone-200/50 dark:border-slate-800 p-6 rounded-3xl flex flex-col sm:flex-row justify-between items-center gap-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">Need immediate in-person dermatological consult?</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">We mapped {result.hospitals.length} certified clinics matching your geolocation.</p>
                </div>
              </div>
              <button 
                onClick={() => setActiveTab('hospitals')}
                className="px-4 py-2.5 bg-gradient-to-r from-amber-600 to-yellow-600 text-white text-xs font-bold rounded-xl flex items-center gap-1 hover:from-amber-700 hover:to-yellow-700 transition-all shadow-sm"
              >
                View Hospital Map
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* 4. HOSPITAL RECOMMENDATIONS TAB */}
        {activeTab === 'hospitals' && result && (
          <div className="space-y-8 animate-fade-in">
            <div className="border-b border-stone-200/50 dark:border-slate-800 pb-5">
              <h2 className="text-2xl font-bold font-serif text-slate-900 dark:text-white">Hospital Routing</h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">Showing specialty centers or hospitals with dermatology departments near {city || "your coordinates"}.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* List of Hospitals */}
              <div className="lg:col-span-1 flex flex-col gap-4 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
                {result.hospitals.map((h, idx) => (
                  <div key={idx} className="bg-white dark:bg-slate-900 border border-stone-200/50 dark:border-slate-800 p-5 rounded-2xl flex flex-col gap-3 shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-serif font-bold text-slate-900 dark:text-white text-sm leading-snug">{h.name}</h4>
                      <span className="bg-amber-500/10 text-amber-700 dark:text-amber-500 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex-shrink-0 uppercase">{h.distance}</span>
                    </div>
                    
                    <div className="flex items-center gap-1 text-xs font-bold text-amber-500">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span>{h.rating} Rating</span>
                    </div>
                    
                    {h.phone !== 'N/A' && (
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{h.phone}</span>
                      </div>
                    )}
                    
                    <a 
                      href={`https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lon}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-stone-100 dark:bg-slate-950 border border-stone-200/40 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-center text-xs font-bold flex items-center justify-center gap-1.5 transition-all hover:bg-stone-200"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      Get Directions
                    </a>
                  </div>
                ))}
              </div>

              {/* Map View */}
              <div className="lg:col-span-2 h-[500px] relative rounded-3xl overflow-hidden border border-stone-200 dark:border-slate-855 shadow-md">
                <div ref={mapContainerRef} className="w-full h-full bg-stone-100"></div>
              </div>
            </div>
          </div>
        )}

        {/* 3. HEALTH OVERVIEW DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-fade-in">
            <div className="border-b border-stone-200/50 dark:border-slate-800 pb-5">
              <h2 className="text-2xl font-bold font-serif text-slate-900 dark:text-white">Your Skin Health Overview</h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">Summary metrics from your screening logs.</p>
            </div>

            {/* Quick dashboard metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-slate-900 border border-stone-200/50 dark:border-slate-800 p-6 rounded-3xl shadow-sm text-left">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Total Screenings</span>
                <span className="text-3xl font-serif font-bold text-slate-900 dark:text-white mt-2 block">{history.length}</span>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-stone-200/50 dark:border-slate-800 p-6 rounded-3xl shadow-sm text-left">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Average Confidence</span>
                <span className="text-3xl font-serif font-bold text-slate-900 dark:text-white mt-2 block">
                  {history.length > 0 
                    ? `${Math.round((history.reduce((acc, h) => acc + h.confidence, 0) / history.length) * 100)}%`
                    : 'N/A'}
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-stone-200/50 dark:border-slate-800 p-6 rounded-3xl shadow-sm text-left">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Severity Warning</span>
                <span className="text-lg font-serif font-bold text-slate-900 dark:text-white mt-2 block flex items-center gap-2">
                  <span className={`w-3.5 h-3.5 rounded-full ${
                    history.some(h => h.severity === 'Severe') 
                      ? 'bg-red-500 animate-pulse' 
                      : history.length > 0 
                      ? 'bg-emerald-500' 
                      : 'bg-slate-400'
                  }`}></span>
                  {history.some(h => h.severity === 'Severe') ? 'Requires Evaluation' : history.length > 0 ? 'Healthy / Insignificant' : 'No logs recorded'}
                </span>
              </div>
            </div>

            {/* Recent timeline logs */}
            <div className="bg-white dark:bg-slate-900 border border-stone-200/50 dark:border-slate-800 p-6 sm:p-8 rounded-3xl shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest mb-6">Recent Screenings Timeline</h3>
              
              {history.length > 0 ? (
                <div className="space-y-6 relative border-l-2 border-stone-100 dark:border-slate-800 ml-4 pl-6 text-left">
                  {history.slice(0, 5).map((h, idx) => (
                    <div key={h.id} className="relative">
                      {/* Timeline dot */}
                      <span className="absolute -left-[31px] top-1.5 w-4.5 h-4.5 rounded-full bg-white dark:bg-slate-900 border-2 border-amber-600 flex items-center justify-center">
                        <Activity className="w-2.5 h-2.5 text-amber-600" />
                      </span>
                      
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-stone-100 dark:border-slate-850 pb-4 last:border-0 last:pb-0">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block">{h.date}</span>
                          <h4 className="font-serif font-bold text-slate-900 dark:text-white text-sm mt-0.5">{h.disease}</h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="bg-stone-100 dark:bg-slate-950 px-2.5 py-1 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase border border-stone-200/30">{h.severity}</span>
                          <button 
                            onClick={() => viewHistoryRecord(h)}
                            className="px-3 py-1.5 bg-gradient-to-r from-amber-600 to-yellow-600 text-white text-[10px] font-bold rounded-lg transition-all"
                          >
                            View Result
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                  <ClipboardCheck className="w-10 h-10 text-slate-300" />
                  <span className="text-xs font-bold">No screening records found. Start screening in the Screening Console tab.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. HISTORY LOGS TAB */}
        {activeTab === 'history' && (
          <div className="space-y-8 animate-fade-in">
            <div className="border-b border-stone-200/50 dark:border-slate-800 pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold font-serif text-slate-900 dark:text-white">Screening Logs</h2>
                <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">Inspect and manage your historical dermatology screening sessions.</p>
              </div>
              
              {history.length > 0 && (
                <button 
                  onClick={() => { if(confirm("Clear all logs?")) setHistory([]); }}
                  className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/20 dark:border-red-900/50 border border-red-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear All History
                </button>
              )}
            </div>

            {history.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                {history.map((h) => (
                  <div 
                    key={h.id} 
                    onClick={() => viewHistoryRecord(h)}
                    className="bg-white dark:bg-slate-900 border border-stone-200/50 dark:border-slate-800 p-5 rounded-2xl flex gap-4 cursor-pointer hover:shadow-md transition-all duration-200 group relative"
                  >
                    <div className="w-20 aspect-square rounded-xl overflow-hidden border border-stone-150 flex-shrink-0 bg-slate-950">
                      <img src={h.image} alt={h.disease} className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300" />
                    </div>
                    
                    <div className="flex-grow flex flex-col justify-between">
                      <div className="flex justify-between items-start gap-1">
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 block">{h.date}</span>
                          <h4 className="font-serif font-bold text-slate-900 dark:text-white text-sm mt-0.5">{h.disease}</h4>
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          h.severity === 'Severe' 
                            ? 'bg-red-500/10 text-red-600' 
                            : h.severity === 'Moderate' 
                            ? 'bg-amber-500/10 text-amber-600' 
                            : 'bg-emerald-500/10 text-emerald-600'
                        }`}>{h.severity}</span>
                      </div>

                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 mt-2">
                        <span>Confidence: {Math.round(h.confidence * 100)}%</span>
                        <span className="text-amber-600 dark:text-amber-500 flex items-center gap-0.5 group-hover:underline">
                          View details <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>

                    <button 
                      onClick={(e) => deleteHistoryRecord(h.id, e)}
                      className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-red-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-850 opacity-0 group-hover:opacity-100 transition-all"
                      title="Delete Record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2 bg-white dark:bg-slate-900 border border-stone-200/50 dark:border-slate-800 p-8 rounded-3xl shadow-sm">
                <Calendar className="w-12 h-12 text-slate-300" />
                <h4 className="font-serif font-bold text-slate-700 dark:text-slate-350">No screenings recorded yet</h4>
                <p className="text-xs text-slate-500 leading-relaxed max-w-sm mt-1">Screening results you run inside the diagnostic panel are saved locally here in logs.</p>
              </div>
            )}
          </div>
        )}

        {/* 5. DISEASE LIBRARY TAB */}
        {activeTab === 'library' && (
          <div className="space-y-8 animate-fade-in">
            <div className="border-b border-stone-200/50 dark:border-slate-800 pb-5">
              <h2 className="text-2xl font-bold font-serif text-slate-900 dark:text-white">Dermatological Disease Explorer</h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">Browse facts and definitions for all 18 clinical targets covered by our AI models.</p>
            </div>

            {/* Search and filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-grow">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  value={librarySearch}
                  onChange={(e) => setLibrarySearch(e.target.value)}
                  placeholder="Search diseases (e.g. Melanoma, Ringworm, Vitiligo...)"
                  className="w-full pl-10 pr-4 py-2.5 border border-stone-200 dark:border-slate-855 rounded-xl text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none focus:border-amber-500 font-bold"
                />
              </div>

              <select
                value={libraryCategory}
                onChange={(e) => setLibraryCategory(e.target.value)}
                className="px-4 py-2.5 border border-stone-200 dark:border-slate-855 rounded-xl text-xs bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold cursor-pointer outline-none focus:border-amber-500"
              >
                <option value="All">All Categories</option>
                <option value="Malignant">Malignant (Cancerous)</option>
                <option value="Benign">Benign (Non-cancerous)</option>
                <option value="Inflammatory">Inflammatory (Eczema, Psoriasis)</option>
                <option value="Infectious">Infectious (Viral/Bacterial/Fungal)</option>
                <option value="Pigmentation">Pigmentation (Vitiligo)</option>
                <option value="Acne & Glands">Acne & Sebaceous Glands</option>
              </select>
            </div>

            {/* Disease cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
              {filteredLibrary.map((d, idx) => (
                <div 
                  key={idx} 
                  onClick={() => setSelectedCondition(d)}
                  className="bg-white dark:bg-slate-900 border border-stone-200/50 dark:border-slate-800 p-6 rounded-3xl flex flex-col justify-between cursor-pointer hover:shadow-md hover:border-amber-500/20 transition-all duration-200"
                >
                  <div>
                    <span className={`text-[9px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                      d.type === 'Malignant' 
                        ? 'bg-red-500/10 text-red-600' 
                        : d.type === 'Benign' 
                        ? 'bg-emerald-500/10 text-emerald-600' 
                        : 'bg-amber-500/10 text-amber-600'
                    }`}>{d.type}</span>
                    <h4 className="font-serif font-bold text-base text-slate-900 dark:text-white mt-4">{d.name}</h4>
                    <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed mt-2.5 line-clamp-3">{d.desc}</p>
                  </div>
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-widest mt-4 block">Read clinical specs →</span>
                </div>
              ))}
            </div>

            {/* Detail popup modal */}
            {selectedCondition && (
              <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-900 border border-stone-200/50 dark:border-slate-800/85 max-w-lg w-full p-8 rounded-3xl text-left shadow-2xl relative animate-scale-in">
                  <span className="text-[9px] font-extrabold px-2.5 py-1 bg-amber-500/10 text-amber-700 dark:text-amber-500 rounded-full uppercase tracking-wider">{selectedCondition.type}</span>
                  <h3 className="font-serif font-bold text-xl text-slate-900 dark:text-white mt-4">{selectedCondition.name}</h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed mt-4">{selectedCondition.desc}</p>
                  
                  <div className="mt-6 flex justify-end">
                    <button 
                      onClick={() => setSelectedCondition(null)}
                      className="px-5 py-2.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-950 text-white text-xs font-bold rounded-xl transition-all"
                    >
                      Close Detail Window
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 6. RESEARCH LAB TAB */}
        {activeTab === 'research' && (
          <div className="space-y-12 animate-fade-in">
            <div className="border-b border-stone-200/50 dark:border-slate-800 pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold font-serif text-slate-900 dark:text-white">AI Research Lab</h2>
                <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">Inspect live metrics, confusion matrices, and neural training logs directly from the active GPU checkpoints.</p>
              </div>
              <button onClick={fetchMetrics} disabled={metricsLoading} className="px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-stone-50 transition-all">
                <RefreshCw className={`w-3.5 h-3.5 ${metricsLoading ? 'animate-spin' : ''}`} /> Sync Metrics
              </button>
            </div>

            {metricsLoading ? (
              <div className="py-20 flex flex-col justify-center items-center text-slate-400 gap-3">
                <RefreshCw className="w-10 h-10 animate-spin text-amber-600" />
                <span className="font-serif font-bold text-slate-700 dark:text-slate-355">Evaluating network weights...</span>
              </div>
            ) : metrics ? (
              <div className="space-y-12 text-left">
                {/* Metric cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                  <div className="p-5 bg-white dark:bg-slate-900 border border-stone-200/50 dark:border-slate-800 rounded-3xl shadow-sm text-center">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Model Accuracy</span>
                    <span className="text-3xl font-serif font-bold text-slate-900 dark:text-white mt-2 block">{Math.round(metrics.accuracy * 1000) / 10}%</span>
                  </div>
                  <div className="p-5 bg-white dark:bg-slate-900 border border-stone-200/50 dark:border-slate-800 rounded-3xl shadow-sm text-center">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Precision Rate</span>
                    <span className="text-3xl font-serif font-bold text-slate-900 dark:text-white mt-2 block">{Math.round(metrics.precision * 1000) / 10}%</span>
                  </div>
                  <div className="p-5 bg-white dark:bg-slate-900 border border-stone-200/50 dark:border-slate-800 rounded-3xl shadow-sm text-center">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Recall Rate</span>
                    <span className="text-3xl font-serif font-bold text-slate-900 dark:text-white mt-2 block">{Math.round(metrics.recall * 1000) / 10}%</span>
                  </div>
                  <div className="p-5 bg-white dark:bg-slate-900 border border-stone-200/50 dark:border-slate-800 rounded-3xl shadow-sm text-center">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">F1 Diagnostics</span>
                    <span className="text-3xl font-serif font-bold text-slate-900 dark:text-white mt-2 block">{Math.round(metrics.f1_score * 1000) / 10}%</span>
                  </div>
                </div>

                {/* SVG Confusion Matrix */}
                <div className="bg-white dark:bg-slate-900 border border-stone-200/50 dark:border-slate-800 p-6 sm:p-8 rounded-3xl shadow-sm space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest">Interactive Confusion Grid</h3>
                    <p className="text-[10px] text-slate-500 mt-1">Shows evaluation distribution for all 18 clinical classes. The darker gold cells represent correct predictions (true positives).</p>
                  </div>

                  <div className="overflow-x-auto custom-scrollbar bg-stone-50 dark:bg-slate-950 p-4 rounded-2xl border border-stone-200/30">
                    <div className="min-w-[700px] grid grid-cols-19 gap-1 text-center font-bold text-[9px]">
                      {/* Matrix Header */}
                      <div className="col-span-1 p-1 bg-stone-200/40 dark:bg-slate-850 rounded text-slate-400 text-left truncate">Actual \ Pred</div>
                      {metrics.classes.map((cls, idx) => (
                        <div key={idx} className="p-1 bg-stone-200/40 dark:bg-slate-850 rounded text-slate-700 dark:text-slate-300 truncate" title={cls}>
                          {cls.slice(0, 5)}
                        </div>
                      ))}

                      {/* Matrix Rows */}
                      {metrics.confusion_matrix.map((row, rIdx) => (
                        <React.Fragment key={rIdx}>
                          <div className="p-1 bg-stone-200/40 dark:bg-slate-850 rounded text-slate-700 dark:text-slate-300 text-left truncate" title={metrics.classes[rIdx]}>
                            {metrics.classes[rIdx].slice(0, 8)}
                          </div>
                          {row.map((val, cIdx) => (
                            <div 
                              key={cIdx}
                              className="p-1.5 rounded transition-colors text-xs"
                              style={{
                                backgroundColor: val > 0 
                                  ? `rgba(212, 175, 55, ${Math.min(0.2 + val * 0.25, 0.9)})`
                                  : 'transparent',
                                color: val > 0 ? (theme === 'dark' || val > 1 ? '#000' : '#fff') : 'transparent'
                              }}
                              title={`Actual: ${metrics.classes[rIdx]}, Predicted: ${metrics.classes[cIdx]} = ${val}`}
                            >
                              {val}
                            </div>
                          ))}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 bg-white dark:bg-slate-900 border border-stone-200/50 dark:border-slate-850 rounded-3xl shadow-sm">
                No evaluation metrics found. Please train models inside backend application first.
              </div>
            )}
          </div>
        )}

        {/* 7. PROFILE SETTINGS TAB */}
        {activeTab === 'profile' && (
          <div className="max-w-xl mx-auto space-y-8 animate-fade-in text-left">
            <div className="border-b border-stone-200/50 dark:border-slate-800 pb-5">
              <h2 className="text-2xl font-bold font-serif text-slate-900 dark:text-white">Profile Settings</h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">Manage user details and settings.</p>
            </div>

            {/* Profile cards */}
            <div className="bg-white dark:bg-slate-900 border border-stone-200/50 dark:border-slate-800 p-6 sm:p-8 rounded-3xl space-y-6 shadow-sm">
              <div className="space-y-4">
                <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <User className="w-4 h-4 text-amber-500" /> Personal Information
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">First Name</label>
                    <input type="text" defaultValue="Guest User" className="w-full px-3 py-2 border border-stone-200 dark:border-slate-855 rounded-xl text-xs bg-stone-100/30 dark:bg-slate-955 text-slate-800 dark:text-slate-200 outline-none font-bold" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Registered Email</label>
                    <input type="email" defaultValue="clinical_guest@dermascan.ai" className="w-full px-3 py-2 border border-stone-200 dark:border-slate-855 rounded-xl text-xs bg-stone-100/30 dark:bg-slate-955 text-slate-800 dark:text-slate-200 outline-none font-bold" />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-stone-100 dark:border-slate-855">
                <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-500" /> Account Privacy & Security
                </h4>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white">Locational Privacy Sync</h5>
                    <p className="text-[10px] text-slate-400 mt-0.5">Encrypt coordinates before geocoding hospital locator.</p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-4 h-4 text-amber-600 outline-none" />
                </div>
                <div className="flex items-center justify-between py-2 border-t border-stone-50 dark:border-slate-855/50">
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white">Save Results Locally</h5>
                    <p className="text-[10px] text-slate-400 mt-0.5">Cache previous session records inside browser storage.</p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-4 h-4 text-amber-600 outline-none" />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-stone-200/50 dark:border-slate-800/80 py-8 text-xs text-slate-500 font-medium">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-r from-amber-600 to-yellow-500 flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <span className="font-serif font-bold text-slate-800 dark:text-slate-200">Dermascan AI Screening Platform</span>
          </div>
          <div className="flex gap-6">
            <span className="hover:text-slate-900 dark:hover:text-white cursor-pointer" onClick={() => setActiveTab('home')}>Home</span>
            <span className="hover:text-slate-900 dark:hover:text-white cursor-pointer" onClick={() => { setActiveTab('diagnosis'); setError(null); }}>Diagnostics</span>
            <span className="hover:text-slate-900 dark:hover:text-white cursor-pointer" onClick={() => setActiveTab('research')}>Research Lab</span>
            <span className="hover:text-slate-900 dark:hover:text-white cursor-pointer" onClick={() => setActiveTab('library')}>Disease Library</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
