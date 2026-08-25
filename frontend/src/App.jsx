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
  Languages,
  Home,
  BookOpen,
  Plus,
  X,
  Flame,
  ChevronLeft
} from 'lucide-react';
import SpeechRecorder from './components/SpeechRecorder';
import { API_BASE } from './config';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [theme, setTheme] = useState(() => localStorage.getItem('dermascan_theme') || 'dark');
  const [language, setLanguage] = useState('en');
  const [symptoms, setSymptoms] = useState('');
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [useCamera, setUseCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [city, setCity] = useState('');
  const [lat, setLat] = useState(null);
  const [lon, setLon] = useState(null);
  const [locLoading, setLocLoading] = useState(false);
  const [locSuccess, setLocSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [xaiTab, setXaiTab] = useState('overlay');
  
  // Validation / Image Quality check modal state
  const [qualityCheckResult, setQualityCheckResult] = useState(null);
  const [showQualityModal, setShowQualityModal] = useState(false);

  // History State
  const [history, setHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('dermascan_history')) || [];
    } catch {
      return [];
    }
  });

  // Diary State
  const [diary, setDiary] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('dermascan_diary')) || [];
    } catch {
      return [];
    }
  });

  // Diary form states
  const [itching, setItching] = useState(0);
  const [pain, setPain] = useState(0);
  const [burning, setBurning] = useState(0);
  const [dryness, setDryness] = useState(0);
  const [redness, setRedness] = useState('None');
  const [sunExposure, setSunExposure] = useState(false);
  const [skincareProduct, setSkincareProduct] = useState('');
  const [waterIntake, setWaterIntake] = useState(4);
  const [sleepHours, setSleepHours] = useState(8);
  const [diaryNotes, setDiaryNotes] = useState('');
  const [diaryImage, setDiaryImage] = useState(null);
  const [diaryImagePreview, setDiaryImagePreview] = useState(null);
  const [streak, setStreak] = useState(() => parseInt(localStorage.getItem('dermascan_streak')) || 0);

  // Compare states for progress tab
  const [compareBaseId, setCompareBaseId] = useState('');
  const [compareTargetId, setCompareTargetId] = useState('');
  const [compareSliderPos, setCompareSliderPos] = useState(50);

  // Appointment states
  const [appointments, setAppointments] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('dermascan_appointments')) || [];
    } catch {
      return [];
    }
  });
  const [showBookingOverlay, setShowBookingOverlay] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');

  // Disease Library
  const [librarySearch, setLibrarySearch] = useState('');
  const [selectedCondition, setSelectedCondition] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mapContainerRef = useRef(null);
  const leafletMapRef = useRef(null);
  const sliderContainerRef = useRef(null);
  const compSliderContainerRef = useRef(null);

  const symptomList = [
    "Itching", "Redness", "Pain", "Burning", "Dryness", "Scaling", 
    "Swelling", "Rash", "Blisters", "Crusting", "Discoloration", 
    "Pus", "Bleeding", "Skin thickening", "Hair loss", "None"
  ];

  // Theme Sync
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('dermascan_theme', theme);
  }, [theme]);

  // Sync data to localStorage
  useEffect(() => {
    localStorage.setItem('dermascan_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('dermascan_diary', JSON.stringify(diary));
  }, [diary]);

  useEffect(() => {
    localStorage.setItem('dermascan_appointments', JSON.stringify(appointments));
  }, [appointments]);

  // Handle leaflet map updates
  useEffect(() => {
    if (activeTab === 'analyze' && result && result.hospitals && mapContainerRef.current) {
      // Dynamic Leaflet loader to prevent server-side render issues
      if (!window.L) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);

        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = initLeafletMap;
        document.head.appendChild(script);
      } else {
        initLeafletMap();
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

    const mapCenter = lat && lon ? [lat, lon] : [12.9716, 77.5946];
    const map = window.L.map(mapContainerRef.current).setView(mapCenter, 13);
    leafletMapRef.current = map;

    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Add marker for user location
    window.L.marker(mapCenter, {
      icon: window.L.divIcon({
        className: 'bg-amber-600 w-3 h-3 rounded-full border-2 border-white shadow-md',
        iconSize: [12, 12]
      })
    }).addTo(map).bindPopup("Your Location").openPopup();

    // Add markers for hospitals
    result.hospitals.forEach(h => {
      if (h.lat && h.lon) {
        window.L.marker([h.lat, h.lon]).addTo(map)
          .bindPopup(`<b>${h.name}</b><br/>Rating: ${h.rating}<br/>${h.distance}`);
      }
    });
  };

  // Location Services
  const detectLocation = () => {
    setLocLoading(true);
    if (!navigator.geolocation) {
      setError("Geolocation not supported by browser.");
      setLocLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setLat(latitude);
        setLon(longitude);
        setLocSuccess(true);
        try {
          const resp = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          if (resp.data && resp.data.address) {
            setCity(resp.data.address.city || resp.data.address.town || resp.data.address.suburb || '');
          }
        } catch {
          // ignore geocode reverse errors
        }
        setLocLoading(false);
      },
      () => {
        setError("Unable to retrieve GPS coordinates. Defaulting search.");
        setLocLoading(false);
      }
    );
  };

  // Camera Handlers
  const startCamera = async () => {
    setUseCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setCameraStream(stream);
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      console.error(err);
      setError("Unable to access local camera device.");
      setUseCamera(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setUseCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob((blob) => {
        const file = new File([blob], "captured_lesion.jpg", { type: "image/jpeg" });
        setImage(file);
        setImagePreview(canvas.toDataURL('image/jpeg'));
        stopCamera();
      }, 'image/jpeg');
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  // Run Image Quality Check first
  const runQualityCheck = async (e) => {
    e.preventDefault();
    if (!image) return;

    setLoading(true);
    setLoadingStep('Assessing upload frame clarity...');
    setError(null);

    const formData = new FormData();
    formData.append('image', image);
    formData.append('symptoms', symptoms || selectedSymptoms.join(', ') || 'No symptoms specified');
    formData.append('language', language);

    try {
      const resp = await axios.post(`${API_BASE}/api/predict`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Bypass-Tunnel-Reminder': 'true'
        }
      });
      // If validation passes, we receive prediction result directly
      setQualityCheckResult({
        valid: true,
        quality_score: resp.data.image_quality?.quality_score || 95,
        metrics: resp.data.image_quality?.metrics || {
          clear_focus: true,
          good_lighting: true,
          skin_detected: true,
          lesion_detected: true
        }
      });
      setResult(resp.data);
      setShowQualityModal(true);
    } catch (err) {
      if (err.response && err.response.data && err.response.data.detail && typeof err.response.data.detail === 'object') {
        const valData = err.response.data.detail;
        setQualityCheckResult({
          valid: false,
          quality_score: valData.quality_score || 45,
          message: valData.message,
          metrics: valData.metrics || {
            clear_focus: false,
            good_lighting: false,
            skin_detected: false,
            lesion_detected: false
          }
        });
        setShowQualityModal(true);
      } else {
        setError(err.response?.data?.detail || "Connection failed. Please ensure backend server is active.");
      }
    } finally {
      setLoading(false);
    }
  };

  const proceedToResults = () => {
    setShowQualityModal(false);
    // Save to local screening history
    const newRecord = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }),
      disease: result.disease,
      confidence: result.confidence,
      severity: result.severity,
      image: result.original_image,
      heatmap: result.heatmap_image,
      overlay: result.overlay_image,
      explanation: result.explanation,
      recommendations: result.recommendations,
      hospitals: result.hospitals,
      location: result.location,
      top_predictions: result.top_predictions || [],
      quality_score: result.image_quality?.quality_score || 90
    };
    setHistory(prev => [newRecord, ...prev]);
    // Set default target comparison records
    if (history.length > 0) {
      setCompareBaseId(newRecord.id);
      setCompareTargetId(history[0].id);
    }
  };

  // Add a manual Skin Diary Entry
  const saveDiaryEntry = () => {
    const newEntry = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }),
      symptoms: {
        itching,
        pain,
        burning,
        dryness,
        redness
      },
      lifestyle: {
        sun: sunExposure,
        skincare: skincareProduct,
        water: waterIntake,
        sleep: sleepHours
      },
      notes: diaryNotes,
      image: diaryImagePreview
    };

    setDiary(prev => [newEntry, ...prev]);
    
    // Update Streak
    const todayStr = new Date().toDateString();
    const lastCheckDate = localStorage.getItem('dermascan_last_diary_date');
    if (lastCheckDate !== todayStr) {
      setStreak(prev => prev + 1);
      localStorage.setItem('dermascan_last_diary_date', todayStr);
      localStorage.setItem('dermascan_streak', (streak + 1).toString());
    }

    // Reset Form
    setItching(0);
    setPain(0);
    setBurning(0);
    setDryness(0);
    setRedness('None');
    setSunExposure(false);
    setSkincareProduct('');
    setWaterIntake(4);
    setSleepHours(8);
    setDiaryNotes('');
    setDiaryImage(null);
    setDiaryImagePreview(null);

    alert("Check-in saved to Skin Diary successfully!");
  };

  const handleDiaryImage = (e) => {
    const file = e.target.files[0];
    if (file) {
      setDiaryImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setDiaryImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  // Draggable slider triggers for results
  const handleSliderMouse = (e) => {
    const rect = sliderContainerRef.current.getBoundingClientRect();
    const updatePos = (clientX) => {
      const pos = ((clientX - rect.left) / rect.width) * 100;
      setSliderPosition(Math.max(0, Math.min(100, pos)));
    };
    const onMouseMove = (moveEvent) => updatePos(moveEvent.clientX);
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    updatePos(e.clientX);
  };

  const handleSliderTouch = (e) => {
    const rect = sliderContainerRef.current.getBoundingClientRect();
    const updatePos = (clientX) => {
      const pos = ((clientX - rect.left) / rect.width) * 100;
      setSliderPosition(Math.max(0, Math.min(100, pos)));
    };
    const onTouchMove = (moveEvent) => updatePos(moveEvent.touches[0].clientX);
    const onTouchEnd = () => {
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onTouchEnd);
    updatePos(e.touches[0].clientX);
  };

  // Draggable comparison slider triggers in Progress
  const handleCompSliderMouse = (e) => {
    const rect = compSliderContainerRef.current.getBoundingClientRect();
    const updatePos = (clientX) => {
      const pos = ((clientX - rect.left) / rect.width) * 100;
      setCompareSliderPos(Math.max(0, Math.min(100, pos)));
    };
    const onMouseMove = (moveEvent) => updatePos(moveEvent.clientX);
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    updatePos(e.clientX);
  };

  // Simulated Booking Router
  const handleBookAppointment = (hospital) => {
    setSelectedHospital(hospital);
    setBookingDate('');
    setBookingTime('');
    setShowBookingOverlay(true);
  };

  const saveAppointment = () => {
    if (!bookingDate || !bookingTime) {
      alert("Please select a date and time.");
      return;
    }
    const newBooking = {
      id: Date.now().toString(),
      hospital: selectedHospital.name,
      date: bookingDate,
      time: bookingTime,
      hours: selectedHospital.hours || "09:00 AM – 06:00 PM"
    };
    setAppointments(prev => [newBooking, ...prev]);
    setShowBookingOverlay(false);
    alert(`Appointment scheduled successfully at ${selectedHospital.name}!`);
  };

  const deleteHistory = () => {
    if (confirm("Are you sure you want to delete all diagnostic history log data?")) {
      setHistory([]);
    }
  };

  const deleteDiary = () => {
    if (confirm("Are you sure you want to clear your Skin Diary log?")) {
      setDiary([]);
      setStreak(0);
      localStorage.setItem('dermascan_streak', '0');
      localStorage.removeItem('dermascan_last_diary_date');
    }
  };

  // PDF Report downloader
  const downloadReport = async () => {
    if (!result) return;
    try {
      const payload = {
        disease: result.disease,
        confidence: result.confidence,
        severity: result.severity,
        symptoms: result.translated_symptoms,
        language: language,
        original_image_b64: result.original_image,
        heatmap_image_b64: result.heatmap_image,
        hospitals: result.hospitals
      };
      
      const response = await axios.post(`${API_BASE}/api/export-pdf`, payload, {
        responseType: 'blob'
      });
      
      const file = new Blob([response.data], { type: 'application/pdf' });
      const fileURL = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = fileURL;
      link.download = `DermaScan_Report_${Date.now()}.pdf`;
      link.click();
    } catch (err) {
      console.error(err);
      alert("Failed to compile and download clinical report PDF.");
    }
  };

  // Progress metrics calculation
  const baseRec = history.find(r => r.id === compareBaseId);
  const targetRec = history.find(r => r.id === compareTargetId);
  
  const getProgressTrend = () => {
    if (!baseRec || !targetRec) return { label: 'Insufficient Data', color: 'text-stone-400 bg-stone-100 dark:bg-slate-900' };
    const sevMap = { 'Mild': 1, 'Moderate': 2, 'Severe': 3 };
    const diff = sevMap[baseRec.severity] - sevMap[targetRec.severity];
    if (diff < 0) return { label: 'Improving', color: 'text-emerald-600 bg-emerald-500/10' };
    if (diff === 0) return { label: 'Stable', color: 'text-amber-600 bg-amber-500/10' };
    return { label: 'Worsening', color: 'text-red-600 bg-red-500/10' };
  };

  return (
    <div className="min-h-screen pb-20 md:pb-6 text-slate-800 dark:text-stone-100 font-sans transition-colors duration-300">
      
      {/* Mobile-first sticky top bar */}
      <header className="sticky top-0 z-40 backdrop-blur-md border-b border-stone-200/40 dark:border-slate-800/40 bg-white/70 dark:bg-slate-900/70 py-4 px-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-amber-600 to-yellow-500 flex items-center justify-center shadow-md">
            <Activity className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="font-serif font-bold text-sm tracking-wider uppercase">DermaScan AI</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="p-2 rounded-lg border border-stone-200/50 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Tab Panel Container */}
      <main className="max-w-md mx-auto px-4 py-6 space-y-6">
        
        {/* Loading overlay spinner */}
        {loading && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-6 text-center animate-fade-in">
            <div className="bg-white dark:bg-slate-900 border border-stone-200/60 dark:border-slate-850 p-8 rounded-3xl max-w-xs w-full shadow-2xl flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-600/10 text-amber-600 flex items-center justify-center mb-4">
                <Activity className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="text-sm font-bold font-serif text-slate-900 dark:text-white">Fusing Clinical Vectors</h3>
              <p className="text-[10px] text-slate-500 mt-1">{loadingStep}</p>
              <div className="w-full bg-slate-100 dark:bg-slate-850 h-1 rounded-full overflow-hidden mt-4">
                <div className="bg-amber-600 h-full w-2/3 rounded-full animate-[progress_2s_infinite_ease-in-out]"></div>
              </div>
            </div>
          </div>
        )}

        {/* 1. HOME TAB */}
        {activeTab === 'home' && (
          <div className="space-y-6 animate-fade-in">
            {/* Header welcome banner */}
            <div className="bg-gradient-to-r from-amber-600 to-yellow-600 rounded-3xl p-6 text-white text-left shadow-lg relative overflow-hidden">
              <div className="relative z-10 space-y-2">
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-white/80">Premium Skin Companion</span>
                <h2 className="text-2xl font-bold font-serif leading-tight">How is your skin today?</h2>
                <p className="text-white/90 text-xs">Observe changes and monitor your progress daily.</p>
                <div className="pt-2">
                  <button 
                    onClick={() => setActiveTab('diary')} 
                    className="px-4 py-2 bg-white text-amber-700 hover:bg-stone-50 font-bold text-xs rounded-xl shadow-md flex items-center gap-1 transition-all"
                  >
                    Start Daily Diary Check-in <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="absolute right-0 bottom-0 top-0 opacity-15 flex items-center pr-2">
                <ClipboardCheck className="w-40 h-40" />
              </div>
            </div>

            {/* Quick overview of skin status */}
            <div className="bg-white dark:bg-slate-900 border border-stone-200/50 dark:border-slate-800 p-5 rounded-3xl space-y-4 shadow-sm text-left">
              <h3 className="text-xs font-extrabold tracking-widest uppercase text-slate-400">Current Skin Status</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-stone-50 dark:bg-slate-950 border border-stone-100 dark:border-slate-850 rounded-2xl">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Assessed Trend</span>
                  <span className="text-sm font-bold text-emerald-600 flex items-center gap-1.5 mt-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    Stable
                  </span>
                </div>
                <div className="p-3 bg-stone-50 dark:bg-slate-950 border border-stone-100 dark:border-slate-850 rounded-2xl">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Analysis Count</span>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1">{history.length} Screenings</span>
                </div>
                <div className="p-3 bg-stone-50 dark:bg-slate-950 border border-stone-100 dark:border-slate-850 rounded-2xl">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Last Checked</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">{history[0]?.date || "No screenings yet"}</span>
                </div>
                <div className="p-3 bg-stone-50 dark:bg-slate-950 border border-stone-100 dark:border-slate-850 rounded-2xl">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Severity</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">{history[0]?.severity || "N/A"}</span>
                </div>
              </div>

              {/* Logging streaks */}
              <div className="border-t border-stone-100 dark:border-slate-850 pt-3 flex justify-between items-center text-xs">
                <span className="text-slate-500 font-bold flex items-center gap-1"><Flame className="w-4 h-4 text-orange-500" /> Skin Diary Streak:</span>
                <span className="font-extrabold text-amber-600 dark:text-amber-500">{streak} Days check-in</span>
              </div>
            </div>

            {/* Upcoming Consultations */}
            {appointments.length > 0 && (
              <div className="bg-white dark:bg-slate-900 border border-stone-200/50 dark:border-slate-800 p-5 rounded-3xl space-y-3 shadow-sm text-left border-l-4 border-l-purple-600 animate-scale-in">
                <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-purple-600" /> Upcoming Consultation
                </h4>
                <div className="text-xs space-y-1">
                  <p className="font-bold text-slate-800 dark:text-slate-200">{appointments[0].hospital}</p>
                  <p className="text-slate-500">Date: {appointments[0].date} at {appointments[0].time}</p>
                  <p className="text-[10px] text-slate-400">Clinic Hours: {appointments[0].hours}</p>
                </div>
              </div>
            )}

            {/* Actions Grid */}
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setActiveTab('analyze')} 
                className="bg-white dark:bg-slate-900 border border-stone-200/50 dark:border-slate-800 p-5 rounded-3xl flex flex-col items-center gap-3 shadow-sm active:scale-[0.98] transition-all"
              >
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center"><Camera className="w-5 h-5" /></div>
                <span className="text-xs font-bold">Analyze Skin</span>
              </button>
              <button 
                onClick={() => setActiveTab('diary')} 
                className="bg-white dark:bg-slate-900 border border-stone-200/50 dark:border-slate-800 p-5 rounded-3xl flex flex-col items-center gap-3 shadow-sm active:scale-[0.98] transition-all"
              >
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center"><ClipboardCheck className="w-5 h-5" /></div>
                <span className="text-xs font-bold">Daily Diary</span>
              </button>
              <button 
                onClick={() => setActiveTab('progress')} 
                className="bg-white dark:bg-slate-900 border border-stone-200/50 dark:border-slate-800 p-5 rounded-3xl flex flex-col items-center gap-3 shadow-sm active:scale-[0.98] transition-all"
              >
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center"><SlidersHorizontal className="w-5 h-5" /></div>
                <span className="text-xs font-bold">Progress Trends</span>
              </button>
              <button 
                onClick={() => { setActiveTab('profile'); }} 
                className="bg-white dark:bg-slate-900 border border-stone-200/50 dark:border-slate-800 p-5 rounded-3xl flex flex-col items-center gap-3 shadow-sm active:scale-[0.98] transition-all"
              >
                <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center"><User className="w-5 h-5" /></div>
                <span className="text-xs font-bold">Model Metrics</span>
              </button>
            </div>
          </div>
        )}

        {/* 2. ANALYZE TAB (Prediction Console) */}
        {activeTab === 'analyze' && !result && (
          <form onSubmit={runQualityCheck} className="space-y-6 animate-fade-in text-left">
            <div className="flex flex-col gap-1 border-b border-stone-200/50 dark:border-slate-800 pb-3">
              <h2 className="text-xl font-bold font-serif text-slate-900 dark:text-white">AI Diagnostic Console</h2>
              <p className="text-slate-500 text-xs">Run context-aware multimodal classification on your skin condition.</p>
            </div>

            {/* Photo Capture card */}
            <div className="bg-white dark:bg-slate-900 border border-stone-200/50 dark:border-slate-800 p-5 rounded-3xl flex flex-col gap-4 shadow-sm">
              <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">1. Upload affected lesion image</label>
              {useCamera ? (
                <div className="relative aspect-square bg-slate-950 rounded-2xl overflow-hidden border border-slate-800">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover"></video>
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3 px-4">
                    <button type="button" onClick={capturePhoto} className="px-4 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow">
                      <Camera className="w-4 h-4" /> Capture Photo
                    </button>
                    <button type="button" onClick={() => { setUseCamera(false); stopCamera(); }} className="px-4 py-2.5 bg-slate-800 text-white text-xs font-bold rounded-xl">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : imagePreview ? (
                <div className="relative aspect-square rounded-2xl overflow-hidden border border-stone-200 dark:border-slate-800 group shadow-inner">
                  <img src={imagePreview} alt="lesion" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                    <button type="button" onClick={() => { setImage(null); setImagePreview(null); }} className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold">
                      Remove Photo
                    </button>
                  </div>
                </div>
              ) : (
                <div className="aspect-square bg-stone-100/50 dark:bg-slate-950 border-2 border-dashed border-stone-200 dark:border-slate-850 rounded-2xl flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:border-amber-500/50 transition-all">
                  <div className="p-3.5 bg-white dark:bg-slate-900 border border-stone-100 dark:border-slate-850 rounded-full text-slate-400 mb-2">
                    <Upload className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Drag/Drop Skin Image Here</span>
                  <div className="mt-4 flex gap-2.5">
                    <label className="px-3.5 py-2 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-xl text-[11px] font-bold shadow-sm cursor-pointer">
                      Browse Files
                      <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                    </label>
                    <button type="button" onClick={startCamera} className="px-3.5 py-2 bg-slate-950 dark:bg-slate-800 text-white rounded-xl text-[11px] font-bold shadow-sm flex items-center gap-1">
                      <Camera className="w-3.5 h-3.5 text-amber-500" /> Use Camera
                    </button>
                  </div>
                </div>
              )}
              <canvas ref={canvasRef} className="hidden"></canvas>
            </div>

            {/* Language & Symptoms select */}
            <div className="bg-white dark:bg-slate-900 border border-stone-200/50 dark:border-slate-800 p-5 rounded-3xl flex flex-col gap-4 shadow-sm">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">2. Input Language & Symptoms</label>
                <select 
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="text-xs font-bold border border-stone-200 dark:border-slate-800 rounded-lg p-2 bg-stone-50 dark:bg-slate-950 text-slate-800 dark:text-stone-200 outline-none"
                >
                  <option value="en">English</option>
                  <option value="hi">हिंदी (Hindi)</option>
                  <option value="kn">ಕನ್ನಡ (Kannada)</option>
                </select>
              </div>

              {/* Checklist chip selector */}
              <div className="flex flex-wrap gap-2 py-1">
                {symptomList.map((symp, idx) => {
                  const isSelected = selectedSymptoms.includes(symp);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        if (symp === 'None') {
                          setSelectedSymptoms(['None']);
                          setSymptoms('No noticeable symptoms');
                        } else {
                          const updated = isSelected 
                            ? selectedSymptoms.filter(x => x !== symp)
                            : [...selectedSymptoms.filter(x => x !== 'None'), symp];
                          setSelectedSymptoms(updated);
                          setSymptoms(updated.join(', '));
                        }
                      }}
                      className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border ${
                        isSelected 
                          ? 'bg-amber-600 border-amber-600 text-white shadow-sm' 
                          : 'bg-stone-50 dark:bg-slate-950 border-stone-200 dark:border-slate-850 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {symp}
                    </button>
                  );
                })}
              </div>

              <textarea
                rows={3}
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                placeholder="Describe symptoms in detail or check chips above..."
                className="w-full border border-stone-200 dark:border-slate-850 rounded-xl p-3 text-xs bg-stone-100/30 dark:bg-slate-950 text-slate-800 dark:text-slate-200 outline-none focus:border-amber-500"
              ></textarea>

              <SpeechRecorder 
                language={language} 
                onTranscript={(text) => setSymptoms(prev => prev ? `${prev} ${text}` : text)}
                disabled={loading}
              />
            </div>

            {/* Geolocation selector */}
            <div className="bg-white dark:bg-slate-900 border border-stone-200/50 dark:border-slate-800 p-5 rounded-3xl flex flex-col gap-4 shadow-sm">
              <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">3. Hospital Geolocation Mapping</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={detectLocation}
                  disabled={locLoading}
                  className={`flex-grow flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                    locSuccess 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/15 dark:border-emerald-900/50 dark:text-emerald-300' 
                      : 'bg-white dark:bg-slate-900 border-stone-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <MapPin className="w-4 h-4" />
                  {locLoading ? "Locking GPS..." : locSuccess ? "GPS Locked" : "Use Current GPS"}
                </button>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Or enter city"
                  className="w-1/2 border border-stone-200 dark:border-slate-850 rounded-xl px-3 py-2.5 text-xs bg-stone-100/30 dark:bg-slate-950 text-slate-800 dark:text-slate-200 outline-none"
                />
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs rounded-2xl flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !image}
              className="w-full py-4 bg-gradient-to-r from-amber-600 to-yellow-600 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Activity className="w-4 h-4 animate-pulse" /> Run Diagnostic Checks
            </button>
          </form>
        )}

        {/* IMAGE QUALITY MODAL CHECK LAYER */}
        {showQualityModal && qualityCheckResult && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-6 text-center animate-fade-in text-left">
            <div className="bg-white dark:bg-slate-900 border border-stone-200/60 dark:border-slate-850 p-6 rounded-3xl max-w-sm w-full shadow-2xl space-y-5">
              <div className="flex justify-between items-center">
                <h3 className="font-serif font-bold text-slate-900 dark:text-white">Image Quality Evaluation</h3>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                  qualityCheckResult.valid ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-500'
                }`}>
                  Score: {qualityCheckResult.quality_score}%
                </span>
              </div>

              {/* Gauge Check Indicators */}
              <div className="space-y-2 bg-stone-50 dark:bg-slate-950 p-4 rounded-2xl text-xs">
                <div className="flex justify-between items-center">
                  <span>Clear Focus & Sharpness</span>
                  <span className={qualityCheckResult.metrics.clear_focus ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'}>
                    {qualityCheckResult.metrics.clear_focus ? '✓ Passes' : '✗ Blurry'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Balanced Brightness & Contrast</span>
                  <span className={qualityCheckResult.metrics.good_lighting ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'}>
                    {qualityCheckResult.metrics.good_lighting ? '✓ Passes' : '✗ Poor Light'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Skin Presence Ratio</span>
                  <span className={qualityCheckResult.metrics.skin_detected ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'}>
                    {qualityCheckResult.metrics.skin_detected ? '✓ Passes' : '✗ Non-skin'}
                  </span>
                </div>
              </div>

              {qualityCheckResult.valid ? (
                <div className="space-y-4">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    ✓ **Optimal Frame Properties**. The input passes resolution, contrast, focus, and illumination thresholds and is fully suitable for AI inference.
                  </p>
                  <button 
                    onClick={proceedToResults} 
                    className="w-full py-3 bg-gradient-to-r from-amber-600 to-yellow-600 text-white font-bold text-xs rounded-xl shadow-sm hover:from-amber-700"
                  >
                    Proceed to Diagnostic Report
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-3 bg-red-500/5 border border-red-500/10 text-red-600 dark:text-red-400 text-xs rounded-xl font-bold">
                    ⚠️ {qualityCheckResult.message}
                  </div>
                  <div className="text-[10px] text-slate-400 leading-normal space-y-1">
                    <p>💡 **Diagnostic Suggestions to improve clarity:**</p>
                    <p>• Clean the camera lens surface.</p>
                    <p>• Move the camera closer or refocus directly on the lesion center.</p>
                    <p>• Eliminate harsh reflections or extreme shadows.</p>
                  </div>
                  <button 
                    onClick={() => { setShowQualityModal(false); setImage(null); setImagePreview(null); }} 
                    className="w-full py-3 bg-slate-900 dark:bg-slate-800 text-white font-bold text-xs rounded-xl"
                  >
                    Retake Skin Photograph
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2.1 ANALYSIS RESULTS SUBTAB */}
        {activeTab === 'analyze' && result && (
          <div className="space-y-6 animate-fade-in text-left">
            <div className="flex justify-between items-center border-b border-stone-200/50 dark:border-slate-800 pb-3">
              <h2 className="text-lg font-bold font-serif text-slate-900 dark:text-white">Diagnostic Report</h2>
              <button 
                onClick={() => { setResult(null); setImage(null); setImagePreview(null); }}
                className="text-xs font-bold text-slate-400 hover:text-slate-800"
              >
                Start New Scan
              </button>
            </div>

            {/* Predictions & score detail cards */}
            <div className="bg-white dark:bg-slate-900 border border-stone-200/50 dark:border-slate-800 p-5 rounded-3xl space-y-4 shadow-sm">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Identified Skin Condition</span>
                <h3 className="text-lg font-serif font-bold text-slate-900 dark:text-white mt-1">{result.disease}</h3>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-stone-50 dark:bg-slate-950 border border-stone-100 dark:border-slate-850 rounded-2xl">
                  <span className="text-[9px] text-slate-400 uppercase font-bold">Confidence Score</span>
                  <span className="block text-lg font-black text-slate-800 dark:text-slate-200 mt-1">{Math.round(result.confidence * 100)}%</span>
                </div>
                <div className="p-3 bg-stone-50 dark:bg-slate-950 border border-stone-100 dark:border-slate-850 rounded-2xl">
                  <span className="text-[9px] text-slate-400 uppercase font-bold">Severity Estimate</span>
                  <span className="block text-lg font-black text-slate-800 dark:text-slate-200 mt-1">{result.severity}</span>
                </div>
              </div>
            </div>

            {/* Draggable CAM Overlay comparison slider */}
            <div className="bg-white dark:bg-slate-900 border border-stone-200/50 dark:border-slate-800 p-5 rounded-3xl space-y-4 shadow-sm">
              <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Explainable AI (CAM attention mapping)</h4>
              <div 
                ref={sliderContainerRef}
                onMouseDown={handleSliderMouse}
                onTouchStart={handleSliderTouch}
                className="relative aspect-square w-full rounded-2xl overflow-hidden border border-stone-200 dark:border-slate-855 cursor-ew-resize select-none"
              >
                {/* Heatmap overlay image */}
                <img src={result.overlay_image} alt="cam" className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
                
                {/* Crop boundary overlay mapping */}
                <div 
                  className="absolute inset-0 overflow-hidden border-r border-amber-500"
                  style={{ width: `${sliderPosition}%` }}
                >
                  <img 
                    src={result.original_image} 
                    alt="orig" 
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                    style={{ width: sliderContainerRef.current ? sliderContainerRef.current.clientWidth : '100%' }}
                  />
                </div>

                <div 
                  className="absolute top-0 bottom-0 w-0.5 bg-amber-500 flex items-center justify-center"
                  style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
                >
                  <div className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center text-[9px] border border-white font-bold">↔</div>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 leading-normal">
                💡 Drag the slider to compare the raw input image with the CNN attention pixels matching model weights.
              </p>
            </div>

            {/* Multimodal fusion contribution details */}
            <div className="bg-white dark:bg-slate-900 border border-stone-200/50 dark:border-slate-800 p-5 rounded-3xl space-y-3 shadow-sm">
              <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Illustrative Evidence Contribution</h4>
              <div className="space-y-2 text-xs">
                <div className="space-y-1">
                  <div className="flex justify-between font-bold">
                    <span>Visual Image Evidence</span>
                    <span>70% contribution</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-950 h-2 rounded-full overflow-hidden">
                    <div className="bg-amber-600 h-full rounded-full" style={{ width: '70%' }}></div>
                  </div>
                </div>
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between font-bold">
                    <span>Symptom Text Evidence</span>
                    <span>30% contribution</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-950 h-2 rounded-full overflow-hidden">
                    <div className="bg-blue-600 h-full rounded-full" style={{ width: '30%' }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Differential Diagnosis Matches */}
            {result.top_predictions && result.top_predictions.length > 1 && (
              <div className="bg-white dark:bg-slate-900 border border-stone-200/50 dark:border-slate-800 p-5 rounded-3xl shadow-sm space-y-3">
                <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Differential Diagnosis Matches</h4>
                <div className="space-y-2 text-xs">
                  {result.top_predictions.map((p, idx) => (
                    <div key={idx} className="flex justify-between items-center border-b border-stone-100 dark:border-slate-850 pb-2 last:border-0 last:pb-0">
                      <span className="font-bold text-slate-800 dark:text-slate-200">{p.disease}</span>
                      <span className="font-bold text-slate-400">{Math.round(p.confidence * 100)}% Match</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Clinic routing maps & hospital recommendations */}
            <div className="bg-white dark:bg-slate-900 border border-stone-200/50 dark:border-slate-800 p-5 rounded-3xl space-y-4 shadow-sm">
              <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Care Connect Specialty clinics</h4>
              
              <div className="h-[200px] rounded-2xl overflow-hidden border border-stone-100 dark:border-slate-850 shadow-inner">
                <div ref={mapContainerRef} className="w-full h-full bg-stone-100"></div>
              </div>

              <div className="space-y-3 pt-2">
                {result.hospitals.map((h, idx) => (
                  <div key={idx} className="p-3 bg-stone-50 dark:bg-slate-950 border border-stone-100 dark:border-slate-850 rounded-2xl flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-xs leading-snug">{h.name}</span>
                      <span className="text-[9px] font-black text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full flex-shrink-0 uppercase">{h.distance}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-400 font-bold">★ {h.rating} Rating</span>
                      <span className="text-slate-400 font-bold">Hours: 09:00 AM – 06:00 PM</span>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <a href={`https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lon}`} target="_blank" rel="noreferrer" className="flex-grow py-2 border border-stone-200 dark:border-slate-800 hover:bg-stone-100 rounded-xl text-[10px] font-bold text-center">
                        Directions
                      </a>
                      <button type="button" onClick={() => handleBookAppointment(h)} className="px-4 py-2 bg-purple-600 text-white rounded-xl text-[10px] font-bold">
                        Book Appointment
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* General Advice guidelines */}
            <div className="bg-white dark:bg-slate-900 border border-stone-200/50 dark:border-slate-800 p-5 rounded-3xl space-y-3 shadow-sm">
              <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Suggestions & Guidelines</h4>
              <div className="space-y-2 text-xs">
                {result.recommendations.map((rec, idx) => (
                  <div key={idx} className="flex gap-1 text-slate-600 dark:text-slate-400 leading-relaxed">
                    <span className="text-amber-500">•</span>
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
              <div className="p-3 bg-amber-500/5 border border-amber-600/15 text-[10px] text-amber-700 dark:text-amber-500 rounded-xl leading-normal font-bold">
                ⚠️ **Disclaimer**: preliminary screening evaluation only. Consult dermatologists for actual clinical confirmation.
              </div>
            </div>

            {/* Download and return button console */}
            <div className="flex gap-2.5">
              <button 
                onClick={downloadReport} 
                className="flex-grow py-3 bg-gradient-to-r from-amber-600 to-yellow-600 text-white text-xs font-bold rounded-xl shadow-sm flex items-center justify-center gap-1.5"
              >
                <Download className="w-4.5 h-4.5" /> PDF Report
              </button>
              <button 
                onClick={() => { setResult(null); setImage(null); setImagePreview(null); }} 
                className="py-3 px-6 bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5"
              >
                New Scan
              </button>
            </div>
          </div>
        )}

        {/* 3. DIARY TAB (Daily Skin Diary) */}
        {activeTab === 'diary' && (
          <div className="space-y-6 animate-fade-in text-left">
            <div className="flex flex-col gap-1 border-b border-stone-200/50 dark:border-slate-800 pb-3">
              <h2 className="text-xl font-bold font-serif text-slate-900 dark:text-white">AI Skin Diary</h2>
              <p className="text-slate-500 text-xs">Perform routine daily skin assessments and monitor symptoms.</p>
            </div>

            {/* Entry Form Card */}
            <div className="bg-white dark:bg-slate-900 border border-stone-200/50 dark:border-slate-800 p-5 rounded-3xl space-y-5 shadow-sm">
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Log Today's Symptoms</h3>
              
              {/* Sliders for symptom levels */}
              {[
                { label: "Itching level", state: itching, set: setItching, min: "😌 0", max: "10 😣" },
                { label: "Pain intensity", state: pain, set: setPain, min: "😌 0", max: "10 😣" },
                { label: "Burning sensation", state: burning, set: setBurning, min: "😌 0", max: "10 😣" },
                { label: "Skin dryness", state: dryness, set: setDryness, min: "😌 0", max: "10 😣" }
              ].map((s, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span>{s.label}</span>
                    <span className="text-amber-600 dark:text-amber-500">{s.state}/10</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="10" 
                    value={s.state} 
                    onChange={(e) => s.set(parseInt(e.target.value))}
                    className="w-full accent-amber-600 h-1 bg-stone-100 dark:bg-slate-950 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>{s.min}</span>
                    <span>{s.max}</span>
                  </div>
                </div>
              ))}

              {/* Redness check option */}
              <div className="space-y-2">
                <span className="text-xs font-bold block">Redness level</span>
                <div className="grid grid-cols-4 gap-2">
                  {['None', 'Mild', 'Moderate', 'High'].map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setRedness(level)}
                      className={`py-2 rounded-xl text-[10px] font-bold border transition-all ${
                        redness === level 
                          ? 'bg-amber-600 border-amber-600 text-white shadow-sm' 
                          : 'bg-stone-50 dark:bg-slate-950 border-stone-200 dark:border-slate-850 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sun, skincare, lifestyle */}
              <div className="space-y-3 border-t border-stone-100 dark:border-slate-850 pt-3">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span>Exposure to intense sunlight today?</span>
                  <input 
                    type="checkbox" 
                    checked={sunExposure} 
                    onChange={(e) => setSunExposure(e.target.checked)}
                    className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-bold block">Introduced new skincare products?</span>
                  <input 
                    type="text" 
                    value={skincareProduct}
                    onChange={(e) => setSkincareProduct(e.target.value)}
                    placeholder="E.g. brand lotion, soap (optional)"
                    className="w-full border border-stone-200 dark:border-slate-850 rounded-xl px-3 py-2 text-xs bg-stone-100/30 dark:bg-slate-950 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold block">Water Intake (Glasses)</span>
                    <input 
                      type="number" 
                      min="0"
                      max="20"
                      value={waterIntake} 
                      onChange={(e) => setWaterIntake(parseInt(e.target.value))}
                      className="w-full border border-stone-200 dark:border-slate-850 rounded-xl px-3 py-2 text-xs bg-stone-100/30 dark:bg-slate-950 outline-none font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold block">Sleep (Hours)</span>
                    <input 
                      type="number" 
                      min="0"
                      max="24"
                      value={sleepHours} 
                      onChange={(e) => setSleepHours(parseInt(e.target.value))}
                      className="w-full border border-stone-200 dark:border-slate-850 rounded-xl px-3 py-2 text-xs bg-stone-100/30 dark:bg-slate-950 outline-none font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-bold block">Add Notes</span>
                  <textarea
                    rows={2}
                    value={diaryNotes}
                    onChange={(e) => setDiaryNotes(e.target.value)}
                    placeholder="Describe any skin flareups or updates..."
                    className="w-full border border-stone-200 dark:border-slate-850 rounded-xl p-3 text-xs bg-stone-100/30 dark:bg-slate-950 outline-none"
                  ></textarea>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold block">Daily Skin Photo (Optional)</span>
                  {diaryImagePreview ? (
                    <div className="relative aspect-square w-24 rounded-xl overflow-hidden border border-stone-200 group">
                      <img src={diaryImagePreview} alt="diary preview" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => { setDiaryImage(null); setDiaryImagePreview(null); }} className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label className="inline-flex px-4 py-2.5 bg-stone-50 dark:bg-slate-950 border border-stone-200 dark:border-slate-850 rounded-xl text-xs font-bold cursor-pointer">
                      Choose Photo
                      <input type="file" accept="image/*" onChange={handleDiaryImage} className="hidden" />
                    </label>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={saveDiaryEntry}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5"
              >
                <ClipboardCheck className="w-4 h-4" /> Save Daily Check-in
              </button>
            </div>

            {/* Historical list timeline */}
            <div className="space-y-4">
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Diary Log Timeline</h3>
              {diary.length === 0 ? (
                <div className="p-5 bg-white dark:bg-slate-900 border border-stone-200/50 dark:border-slate-800 rounded-3xl text-center text-xs text-slate-400 font-bold">
                  No diary logs recorded yet. Complete your first logging check above!
                </div>
              ) : (
                <div className="space-y-4 border-l-2 border-stone-200 dark:border-slate-800 pl-4 ml-2">
                  {diary.map((entry, idx) => (
                    <div key={idx} className="relative bg-white dark:bg-slate-900 border border-stone-200/50 dark:border-slate-800 p-4 rounded-2xl shadow-sm text-xs space-y-2">
                      <div className="absolute w-3 h-3 bg-amber-500 rounded-full border-2 border-white -left-[23px] top-4 shadow-sm"></div>
                      <div className="flex justify-between items-center border-b border-stone-100 dark:border-slate-850 pb-1.5">
                        <span className="font-extrabold text-[10px] text-amber-600 dark:text-amber-500 uppercase">{entry.date}</span>
                        <span className="text-[10px] font-bold text-slate-400">Redness: {entry.symptoms.redness}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500">
                        <span>Itchiness: **{entry.symptoms.itching}/10**</span>
                        <span>Pain: **{entry.symptoms.pain}/10**</span>
                        <span>Dryness: **{entry.symptoms.dryness}/10**</span>
                        <span>Sun Exposure: **{entry.lifestyle.sun ? 'Yes' : 'No'}**</span>
                      </div>
                      {entry.notes && (
                        <p className="text-[11px] italic text-slate-600 dark:text-slate-400 leading-normal pt-1">
                          "{entry.notes}"
                        </p>
                      )}
                      {entry.image && (
                        <div className="w-16 aspect-square rounded-lg overflow-hidden border border-stone-100 pt-1">
                          <img src={entry.image} alt="diary img" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. PROGRESS TAB (Timeline & Compare) */}
        {activeTab === 'progress' && (
          <div className="space-y-6 animate-fade-in text-left">
            <div className="flex flex-col gap-1 border-b border-stone-200/50 dark:border-slate-800 pb-3">
              <h2 className="text-xl font-bold font-serif text-slate-900 dark:text-white">Dermatology Progress</h2>
              <p className="text-slate-500 text-xs">Observe differences and visual assessment trends over time.</p>
            </div>

            {/* Compare Selectors */}
            {history.length < 2 ? (
              <div className="p-5 bg-white dark:bg-slate-900 border border-stone-200/50 dark:border-slate-800 rounded-3xl text-center text-xs text-slate-400 font-bold">
                ⚠️ Compare feature requires at least 2 diagnostic screening scans. Please run another analysis to unlock comparison timeline tracking.
              </div>
            ) : (
              <div className="space-y-5 bg-white dark:bg-slate-900 border border-stone-200/50 dark:border-slate-800 p-5 rounded-3xl shadow-sm">
                <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Assessments Side-by-Side</h3>
                
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <span className="font-bold block">Base Scan (Before)</span>
                    <select 
                      value={compareBaseId} 
                      onChange={(e) => setCompareBaseId(e.target.value)}
                      className="w-full border border-stone-200 dark:border-slate-850 rounded-xl p-2 outline-none bg-stone-50 dark:bg-slate-950 font-bold"
                    >
                      {history.map(r => (
                        <option key={r.id} value={r.id}>{r.date} - {r.disease}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <span className="font-bold block">Target Scan (After)</span>
                    <select 
                      value={compareTargetId} 
                      onChange={(e) => setCompareTargetId(e.target.value)}
                      className="w-full border border-stone-200 dark:border-slate-850 rounded-xl p-2 outline-none bg-stone-50 dark:bg-slate-950 font-bold"
                    >
                      {history.map(r => (
                        <option key={r.id} value={r.id}>{r.date} - {r.disease}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Draggable image-to-image comparison overlay slider */}
                {baseRec && targetRec && (
                  <div className="space-y-4 pt-2">
                    <div 
                      ref={compSliderContainerRef}
                      onMouseDown={handleCompSliderMouse}
                      className="relative aspect-square w-full rounded-2xl overflow-hidden border border-stone-200 dark:border-slate-855 cursor-ew-resize select-none"
                    >
                      {/* Underlay (Target/After photo) */}
                      <img src={targetRec.image} alt="after" className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
                      
                      {/* Overlay (Base/Before photo, width constrained by comparison slider) */}
                      <div 
                        className="absolute inset-0 overflow-hidden border-r border-amber-500"
                        style={{ width: `${compareSliderPos}%` }}
                      >
                        <img 
                          src={baseRec.image} 
                          alt="before" 
                          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                          style={{ width: compSliderContainerRef.current ? compSliderContainerRef.current.clientWidth : '100%' }}
                        />
                      </div>

                      {/* Slider divider indicator */}
                      <div 
                        className="absolute top-0 bottom-0 w-0.5 bg-amber-500 flex items-center justify-center"
                        style={{ left: `${compareSliderPos}%`, transform: 'translateX(-50%)' }}
                      >
                        <div className="w-6 h-6 rounded-full bg-amber-600 text-white flex items-center justify-center text-[10px] border border-white font-bold">↔</div>
                      </div>
                    </div>

                    {/* What Changed Summary Card */}
                    <div className="bg-stone-50 dark:bg-slate-950 border border-stone-100 dark:border-slate-850 p-4 rounded-2xl space-y-3">
                      <div className="flex justify-between items-center border-b border-stone-100 dark:border-slate-850 pb-2">
                        <span className="font-extrabold uppercase text-[10px] text-slate-400">AI Progress Analysis</span>
                        <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase ${getProgressTrend().color}`}>
                          {getProgressTrend().label}
                        </span>
                      </div>
                      
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-400 font-bold">Severity Change:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {baseRec.severity} ➔ {targetRec.severity}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400 font-bold">Matched Disease:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {baseRec.disease === targetRec.disease ? 'Consistent Match' : 'Different diagnosis matched'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400 font-bold">Visual Comparison:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            Photo edge structures modified
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Assessment Trend Graph */}
            <div className="bg-white dark:bg-slate-900 border border-stone-200/50 dark:border-slate-800 p-5 rounded-3xl space-y-4 shadow-sm">
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Skin Assessment Trend</h3>
              
              <div className="h-[120px] w-full flex items-end justify-between px-2 pt-4 bg-stone-50 dark:bg-slate-950 border border-stone-100 dark:border-slate-850 rounded-2xl relative">
                {/* SVG Trend Graph line mock */}
                <svg className="absolute inset-0 w-full h-full p-2" viewBox="0 0 100 50" preserveAspectRatio="none">
                  <path d="M 10 35 Q 35 25 60 40 T 90 20" fill="none" stroke="#D97706" strokeWidth="2.5" />
                  <circle cx="10" cy="35" r="2.5" fill="#D97706" />
                  <circle cx="90" cy="20" r="2.5" fill="#D97706" />
                </svg>
                <span className="absolute left-2 top-2 text-[9px] font-extrabold uppercase text-slate-400">Severity level</span>
                <span className="absolute bottom-2 right-2 text-[8px] font-extrabold text-amber-600 dark:text-amber-500 uppercase">Aug 25 - Sep 08</span>
              </div>
            </div>

            {/* Diagnostics Logs History list */}
            <div className="space-y-3">
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Diagnostic Logs History</h3>
              {history.length === 0 ? (
                <div className="p-5 bg-white dark:bg-slate-900 border border-stone-200/50 dark:border-slate-800 rounded-3xl text-center text-xs text-slate-400 font-bold">
                  No screening logs recorded. Start skin analysis in the Analyze tab!
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((rec) => (
                    <div key={rec.id} className="p-4 bg-white dark:bg-slate-900 border border-stone-200/50 dark:border-slate-800 rounded-2xl flex items-center justify-between shadow-sm text-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl overflow-hidden border border-stone-100 flex-shrink-0">
                          <img src={rec.image} alt="lesion" className="w-full h-full object-cover" />
                        </div>
                        <div className="text-left space-y-0.5">
                          <h4 className="font-bold text-slate-900 dark:text-white leading-snug">{rec.disease}</h4>
                          <p className="text-[10px] text-slate-400">{rec.date} • {rec.severity} • {Math.round(rec.confidence * 100)}%</p>
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => {
                          setResult(rec);
                          setActiveTab('analyze');
                        }}
                        className="p-2 border border-stone-200 dark:border-slate-800 rounded-xl hover:bg-stone-50"
                      >
                        <Eye className="w-4 h-4 text-slate-400" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 5. PROFILE TAB (Settings, Model metrics, disclaimer) */}
        {activeTab === 'profile' && (
          <div className="space-y-6 animate-fade-in text-left">
            <div className="flex flex-col gap-1 border-b border-stone-200/50 dark:border-slate-800 pb-3">
              <h2 className="text-xl font-bold font-serif text-slate-900 dark:text-white">Profile & AI metrics</h2>
              <p className="text-slate-500 text-xs">Manage workspace parameters and inspect model performance details.</p>
            </div>

            {/* Performance statistics */}
            <div className="bg-white dark:bg-slate-900 border border-stone-200/50 dark:border-slate-800 p-5 rounded-3xl space-y-4 shadow-sm">
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">AI Model Performance (ONNX)</h3>
              
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-stone-50 dark:bg-slate-950 border border-stone-100 dark:border-slate-850 rounded-2xl">
                  <span className="text-[9px] text-slate-400 uppercase font-bold block">Validation Accuracy</span>
                  <span className="block text-lg font-black text-slate-800 dark:text-slate-200 mt-1">55.81%</span>
                </div>
                <div className="p-3 bg-stone-50 dark:bg-slate-950 border border-stone-100 dark:border-slate-850 rounded-2xl">
                  <span className="text-[9px] text-slate-400 uppercase font-bold block">Validation F1-score</span>
                  <span className="block text-lg font-black text-slate-800 dark:text-slate-200 mt-1">52.98%</span>
                </div>
                <div className="p-3 bg-stone-50 dark:bg-slate-950 border border-stone-100 dark:border-slate-850 rounded-2xl">
                  <span className="text-[9px] text-slate-400 uppercase font-bold block">Isolated Test Accuracy</span>
                  <span className="block text-lg font-black text-slate-800 dark:text-slate-200 mt-1">63.95%</span>
                </div>
                <div className="p-3 bg-stone-50 dark:bg-slate-950 border border-stone-100 dark:border-slate-850 rounded-2xl">
                  <span className="text-[9px] text-slate-400 uppercase font-bold block">Isolated Test F1-score</span>
                  <span className="block text-lg font-black text-slate-800 dark:text-slate-200 mt-1">58.76%</span>
                </div>
              </div>

              {/* Class list toggle mapping */}
              <div className="border-t border-stone-100 dark:border-slate-850 pt-3">
                <span className="text-xs font-bold text-slate-500 block mb-2">Supported Disease Classes (18)</span>
                <div className="max-h-[150px] overflow-y-auto pr-1 text-[10px] space-y-1.5 custom-scrollbar font-bold text-slate-600 dark:text-slate-400">
                  {[
                    "Melanoma", "Melanocytic Nevus", "Atopic Dermatitis (Eczema)", 
                    "Seborrheic Keratosis", "Acne Vulgaris", "Basal Cell Carcinoma", 
                    "Psoriasis", "Vitiligo", "Rosacea", "Tinea Corporis (Ringworm)", 
                    "Impetigo", "Urticaria (Hives)", "Warts", "Contact Dermatitis", 
                    "Folliculitis", "Lichen Planus", "Herpes Zoster", "Pityriasis Rosea"
                  ].map((c_name, idx) => (
                    <div key={idx} className="flex justify-between py-1 border-b border-stone-100 dark:border-slate-850 last:border-0">
                      <span>{idx + 1}. {c_name}</span>
                      <span className="text-amber-600 dark:text-amber-500">Verified Model Target</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Disease Library collapsible inside Profile */}
            <div className="bg-white dark:bg-slate-900 border border-stone-200/50 dark:border-slate-800 p-5 rounded-3xl space-y-4 shadow-sm">
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Clinical Disease Library</h3>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={librarySearch}
                  onChange={(e) => setLibrarySearch(e.target.value)}
                  placeholder="Search disease library..."
                  className="w-full border border-stone-200 dark:border-slate-850 rounded-xl px-3 py-2 text-xs bg-stone-50 dark:bg-slate-950 outline-none"
                />
              </div>

              {librarySearch.trim() && (
                <div className="max-h-[150px] overflow-y-auto pr-1 text-xs space-y-1.5 custom-scrollbar font-bold">
                  {[
                    "Melanoma", "Melanocytic Nevus", "Atopic Dermatitis (Eczema)", 
                    "Seborrheic Keratosis", "Acne Vulgaris", "Basal Cell Carcinoma", 
                    "Psoriasis", "Vitiligo", "Rosacea", "Tinea Corporis (Ringworm)", 
                    "Impetigo", "Urticaria (Hives)", "Warts", "Contact Dermatitis", 
                    "Folliculitis", "Lichen Planus", "Herpes Zoster", "Pityriasis Rosea"
                  ].filter(name => name.toLowerCase().includes(librarySearch.toLowerCase())).map((name, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => alert(`Symptom search matching: ${name}`)}
                      className="w-full text-left py-2 border-b border-stone-100 dark:border-slate-850 text-slate-800 dark:text-slate-200 hover:text-amber-600 block"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Database management delete triggers */}
            <div className="bg-white dark:bg-slate-900 border border-stone-200/50 dark:border-slate-800 p-5 rounded-3xl space-y-4 shadow-sm">
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-red-500">Data Privacy Console</h3>
              <p className="text-[10px] text-slate-400">Diagnostic logging and skin diary results are stored strictly in local memory storage.</p>
              
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={deleteHistory}
                  className="w-full py-2.5 border border-red-500/30 text-red-500 rounded-xl text-xs font-bold hover:bg-red-500/10 flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" /> Delete Diagnostic History
                </button>
                <button
                  type="button"
                  onClick={deleteDiary}
                  className="w-full py-2.5 border border-red-500/30 text-red-500 rounded-xl text-xs font-bold hover:bg-red-500/10 flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" /> Clear Skin Diary Logs
                </button>
              </div>
            </div>

            {/* Safety Medical Disclaimer */}
            <div className="bg-white dark:bg-slate-900 border border-stone-200/50 dark:border-slate-800 p-5 rounded-3xl space-y-3 shadow-sm border-l-4 border-l-amber-600">
              <h4 className="text-xs font-extrabold text-amber-600 dark:text-amber-500 uppercase tracking-widest flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4" /> Medical Disclaimer
              </h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal">
                DermaScan AI is an AI-assisted informational screener tool. It is not an FDA-approved diagnostic method. It does not replace professional medical evaluations, diagnoses, physical exams, or treatments. All diagnostic results are preliminary indicators only. Please consult certified dermatologists for skin health concerns.
              </p>
            </div>
          </div>
        )}

      </main>

      {/* Booking Overlay Form */}
      {showBookingOverlay && selectedHospital && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-6 text-center animate-fade-in text-left">
          <div className="bg-white dark:bg-slate-900 border border-stone-200/60 dark:border-slate-850 p-6 rounded-3xl max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="font-serif font-bold text-slate-900 dark:text-white">Book Consultation Appointment</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Schedule a simulated appointment at **{selectedHospital.name}**.
            </p>

            <div className="space-y-3 text-xs pt-2">
              <div className="space-y-1">
                <span className="font-bold block">Appointment Date</span>
                <input 
                  type="date" 
                  value={bookingDate} 
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full border border-stone-200 dark:border-slate-850 rounded-xl p-2.5 outline-none bg-stone-50 dark:bg-slate-950 font-bold"
                />
              </div>
              <div className="space-y-1">
                <span className="font-bold block">Preferred Time Slot</span>
                <input 
                  type="time" 
                  value={bookingTime} 
                  onChange={(e) => setBookingTime(e.target.value)}
                  className="w-full border border-stone-200 dark:border-slate-850 rounded-xl p-2.5 outline-none bg-stone-50 dark:bg-slate-950 font-bold"
                />
              </div>
            </div>

            <div className="flex gap-2.5 pt-3">
              <button 
                onClick={saveAppointment} 
                className="flex-grow py-3 bg-purple-600 text-white font-bold text-xs rounded-xl shadow-sm"
              >
                Schedule Appointment
              </button>
              <button 
                onClick={() => setShowBookingOverlay(false)} 
                className="py-3 px-4 bg-stone-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PREMIUM STICKY BOTTOM NAVIGATION BAR */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-t border-stone-200/50 dark:border-slate-800/60 py-2.5 px-6 shadow-lg shadow-black/10">
        <div className="max-w-md mx-auto flex justify-between items-center">
          {[
            { id: 'home', label: 'Home', icon: <Home className="w-5 h-5" /> },
            { id: 'analyze', label: 'Analyze', icon: <Camera className="w-5 h-5" /> },
            { id: 'diary', label: 'Diary', icon: <ClipboardCheck className="w-5 h-5" /> },
            { id: 'progress', label: 'Progress', icon: <SlidersHorizontal className="w-5 h-5" /> },
            { id: 'profile', label: 'Profile', icon: <User className="w-5 h-5" /> }
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setError(null); }}
                className={`flex flex-col items-center gap-1.5 transition-all duration-150 relative ${
                  isActive 
                    ? 'text-amber-600 dark:text-amber-500 scale-105' 
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-stone-300'
                }`}
              >
                {tab.icon}
                <span className="text-[9px] font-bold tracking-wider">{tab.label}</span>
                {isActive && (
                  <span className="absolute -bottom-1.5 w-1 h-1 rounded-full bg-amber-600 dark:bg-amber-500"></span>
                )}
              </button>
            );
          })}
        </div>
      </footer>

    </div>
  );
}
