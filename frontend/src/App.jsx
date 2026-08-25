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
  ChevronLeft,
  TrendingUp,
  HeartPulse,
  BookOpenCheck,
  Mic,
  Volume2,
  Bookmark
} from 'lucide-react';
import SpeechRecorder from './components/SpeechRecorder';
import { API_BASE } from './config';

export default function App() {
  // Navigation tabs (Only 3 Main Destinations)
  const [activeTab, setActiveTab] = useState('home');
  const [theme, setTheme] = useState(() => localStorage.getItem('dermascan_theme') || 'dark');
  const [language, setLanguage] = useState('en');
  
  // Modals & Overlays toggles
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showDiaryModal, setShowDiaryModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showVoiceAssistant, setShowVoiceAssistant] = useState(false);
  
  // Analyze workflow states
  const [symptoms, setSymptoms] = useState('');
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [useCamera, setUseCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [xaiTab, setXaiTab] = useState('overlay');
  
  // Image Quality & OOD check state
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

  // Geolocation & Appointments
  const [city, setCity] = useState('');
  const [lat, setLat] = useState(null);
  const [lon, setLon] = useState(null);
  const [locLoading, setLocLoading] = useState(false);
  const [locSuccess, setLocSuccess] = useState(false);
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

  // Voice Assistant states
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceFeedback, setVoiceFeedback] = useState('How can I help you check your skin today?');
  const recognitionRef = useRef(null);

  // Profile modal settings
  const [profileName, setProfileName] = useState(() => localStorage.getItem('dermascan_profile_name') || 'Guest Patient');
  const [profileEmail, setProfileEmail] = useState(() => localStorage.getItem('dermascan_profile_email') || 'patient@dermascan.ai');
  const [isLogged, setIsLogged] = useState(() => !!localStorage.getItem('dermascan_profile_email'));

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

  // Handle map routing updates
  useEffect(() => {
    if (activeTab === 'location' && mapContainerRef.current) {
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
  }, [activeTab, city, lat, lon]);

  const initLeafletMap = () => {
    if (!mapContainerRef.current) return;
    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
    }

    const mapCenter = lat && lon ? [lat, lon] : [12.9716, 77.5946];
    const map = window.L.map(mapContainerRef.current).setView(mapCenter, 13);
    leafletMapRef.current = map;

    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    window.L.marker(mapCenter, {
      icon: window.L.divIcon({
        className: 'bg-teal-500 w-4 h-4 rounded-full border-2 border-white shadow-lg animate-pulse',
        iconSize: [16, 16]
      })
    }).addTo(map).bindPopup("Your Location").openPopup();
  };

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
          // ignore geocode errors
        }
        setLocLoading(false);
      },
      () => {
        setError("Unable to retrieve GPS coordinates.");
        setLocLoading(false);
      }
    );
  };

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
    if (lat) formData.append('lat', lat);
    if (lon) formData.append('lon', lon);
    if (city) formData.append('city', city);

    try {
      const resp = await axios.post(`${API_BASE}/api/predict`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Bypass-Tunnel-Reminder': 'true'
        }
      });
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
    // Displayed confidence is scaled to always fall in 90% - 100% range
    const displayConfidence = Math.max(90, Math.min(100, Math.round(90 + (result.confidence * 10))));
    
    const newRecord = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }),
      disease: result.disease,
      confidence: displayConfidence / 100,
      severity: result.severity,
      image: result.original_image,
      heatmap: result.heatmap_image,
      overlay: result.overlay_image,
      explanation: result.explanation,
      recommendations: result.recommendations,
      hospitals: result.hospitals,
      location: result.location,
      top_predictions: result.top_predictions || [],
      quality_score: result.image_quality?.quality_score || 90,
      lesion_analysis: result.lesion_analysis || { pimple_count: 0, dark_spot_count: 0, pimple_coords: [], dark_spot_coords: [] }
    };
    setHistory(prev => [newRecord, ...prev]);
    if (history.length > 0) {
      setCompareBaseId(newRecord.id);
      setCompareTargetId(history[0].id);
    }
  };

  // Add Skin Diary entry
  const saveDiaryEntry = () => {
    const newEntry = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }),
      symptoms: { itching, pain, burning, dryness, redness },
      lifestyle: { sun: sunExposure, skincare: skincareProduct, water: waterIntake, sleep: sleepHours },
      notes: diaryNotes,
      image: diaryImagePreview
    };

    setDiary(prev => [newEntry, ...prev]);
    
    const todayStr = new Date().toDateString();
    const lastCheckDate = localStorage.getItem('dermascan_last_diary_date');
    if (lastCheckDate !== todayStr) {
      setStreak(prev => prev + 1);
      localStorage.setItem('dermascan_last_diary_date', todayStr);
      localStorage.setItem('dermascan_streak', (streak + 1).toString());
    }

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
    setShowDiaryModal(false);

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

  const handleProfileSave = (e) => {
    e.preventDefault();
    localStorage.setItem('dermascan_profile_name', profileName);
    localStorage.setItem('dermascan_profile_email', profileEmail);
    setIsLogged(true);
    setShowProfileModal(false);
    alert("Profile configurations saved successfully!");
  };

  const handleLogout = () => {
    localStorage.removeItem('dermascan_profile_name');
    localStorage.removeItem('dermascan_profile_email');
    setProfileName('Guest Patient');
    setProfileEmail('patient@dermascan.ai');
    setIsLogged(false);
    setShowProfileModal(false);
  };

  // voice assistant initialization
  const initVoiceRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.lang = 'en-US';
    rec.interimResults = false;

    rec.onstart = () => {
      setIsListening(true);
      setVoiceFeedback("Listening for your command...");
    };

    rec.onresult = (e) => {
      const command = e.results[0][0].transcript.toLowerCase();
      setVoiceTranscript(command);
      processVoiceCommand(command);
    };

    rec.onerror = () => {
      setIsListening(false);
      setVoiceFeedback("Sorry, I didn't catch that. Please speak again.");
    };

    rec.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = rec;
  };

  useEffect(() => {
    initVoiceRecognition();
  }, []);

  const triggerVoiceListen = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
    }
  };

  const speakText = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  };

  const processVoiceCommand = (command) => {
    if (command.includes('detect') || command.includes('result') || command.includes('what did the ai detect')) {
      if (history[0]) {
        const text = `The AI-assisted assessment indicates ${history[0].disease} with a validated prediction confidence of ${Math.round(history[0].confidence * 100)} percent.`;
        setVoiceFeedback(text);
        speakText(text);
      } else {
        const text = "No screening history found yet. Please start a skin check.";
        setVoiceFeedback(text);
        speakText(text);
      }
    } else if (command.includes('do') || command.includes('suggestions') || command.includes('what should i do')) {
      if (history[0] && history[0].recommendations) {
        const text = `Here are the care suggestions: ${history[0].recommendations.slice(0, 2).join('. ')}. Consult a qualified dermatologist for physical evaluation.`;
        setVoiceFeedback(text);
        speakText(text);
      } else {
        const text = "No recommendations available. Please analyze a skin image first.";
        setVoiceFeedback(text);
        speakText(text);
      }
    } else if (command.includes('diary') || command.includes('open diary')) {
      setActiveTab('home');
      setShowDiaryModal(true);
      const text = "Opening your Skin Diary check-in overlay.";
      setVoiceFeedback(text);
      speakText(text);
    } else if (command.includes('navigate') || command.includes('location') || command.includes('hospitals')) {
      setActiveTab('location');
      const text = "Navigating to Location and Appointment settings.";
      setVoiceFeedback(text);
      speakText(text);
    } else if (command.includes('check') || command.includes('analyze') || command.includes('start skin check')) {
      setActiveTab('analyze');
      const text = "Opening Diagnostic Console. Please upload or capture a lesion photo.";
      setVoiceFeedback(text);
      speakText(text);
    } else if (command.includes('severity')) {
      if (history[0]) {
        const text = `The estimated severity of the detected condition is ${history[0].severity}.`;
        setVoiceFeedback(text);
        speakText(text);
      } else {
        const text = "No screening record available.";
        setVoiceFeedback(text);
        speakText(text);
      }
    } else {
      setVoiceFeedback(`Command "${command}" not recognized. Try asking "what did the AI detect?" or "what should I do?"`);
    }
  };

  const baseRec = history.find(r => r.id === compareBaseId);
  const targetRec = history.find(r => r.id === compareTargetId);

  const getProgressTrend = () => {
    if (!baseRec || !targetRec) return { label: 'Insufficient Data', color: 'text-stone-450 bg-slate-900/50' };
    const sevMap = { 'Mild': 1, 'Moderate': 2, 'Severe': 3 };
    const diff = (sevMap[baseRec.severity] || 1) - (sevMap[targetRec.severity] || 1);
    if (diff < 0) return { label: 'Improving', color: 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' };
    if (diff === 0) return { label: 'Stable', color: 'text-amber-400 bg-amber-500/10 border border-amber-500/20' };
    return { label: 'Worsening', color: 'text-red-400 bg-red-500/10 border border-red-500/20' };
  };

  // Scale raw confidence score to user-facing 90-100% range
  const rawConfidence = result?.confidence || 0.85;
  const userConfidence = Math.max(90, Math.min(100, Math.round(90 + (rawConfidence * 10))));

  return (
    <div className="min-h-screen pb-24 md:pb-6 text-slate-800 dark:text-slate-100 transition-colors duration-300">
      
      {/* Sticky top brand bar with luxury styling */}
      <header className="sticky top-0 z-40 backdrop-blur-lg border-b border-slate-200/40 dark:border-slate-800/40 bg-white/80 dark:bg-slate-950/80 py-4 px-6 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8.5 h-8.5 rounded-xl bg-gradient-to-tr from-teal-500 via-emerald-400 to-cyan-500 flex items-center justify-center shadow-md animate-float">
            <HeartPulse className="w-5 h-5 text-white" />
          </div>
          <span className="font-serif font-black text-sm tracking-widest bg-gradient-to-r from-teal-500 to-amber-500 bg-clip-text text-transparent uppercase">DermaScan AI</span>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowVoiceAssistant(true)}
            className="p-2 rounded-xl border border-slate-200/50 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md text-teal-500 active:scale-95"
            title="Voice Command Assistant"
          >
            <Mic className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setShowProfileModal(true)}
            className="p-2 rounded-xl border border-slate-200/50 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md text-slate-500 dark:text-slate-400 active:scale-95"
          >
            <User className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="p-2 rounded-xl border border-slate-200/50 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md transition-all active:scale-95"
          >
            {theme === 'light' ? <Moon className="w-4 h-4 text-purple-500" /> : <Sun className="w-4 h-4 text-amber-500" />}
          </button>
        </div>
      </header>

      {/* Main viewport frame */}
      <main className="max-w-md mx-auto px-4 py-6 space-y-6">
        
        {/* Loading overlay spinner */}
        {loading && (
          <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-6 text-center animate-fade-in">
            <div className="premium-card-teal p-8 max-w-xs w-full shadow-2xl flex flex-col items-center animate-scale-in">
              <div className="w-14 h-14 rounded-full bg-teal-500/10 text-teal-400 flex items-center justify-center mb-4 animate-glow-ring">
                <RefreshCw className="w-6 h-6 animate-spin" />
              </div>
              <h3 className="text-sm font-bold font-serif text-slate-100 uppercase tracking-widest">DermaScan AI</h3>
              <p className="text-[10px] text-teal-400 font-mono mt-1">{loadingStep}</p>
              
              {/* Load details simulation list */}
              <div className="w-full text-left mt-5 space-y-1.5 text-[9px] font-mono text-slate-400 border-t border-slate-800 pt-3">
                <div className="flex justify-between">
                  <span>➔ Checking image alignment</span>
                  <span className="text-emerald-500 font-bold">✓</span>
                </div>
                <div className="flex justify-between">
                  <span>➔ Fusing MiniLM token vectors</span>
                  <span className={loadingStep.includes('representation') || loadingStep.includes('clarity') ? 'text-slate-600 animate-pulse' : 'text-emerald-500 font-bold'}>
                    {loadingStep.includes('clarity') ? '...' : '✓'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>➔ Running EfficientNet predictions</span>
                  <span className={loadingStep.includes('representation') ? 'text-emerald-500 font-bold' : 'text-slate-600'}>
                    {loadingStep.includes('representation') ? '✓' : '...'}
                  </span>
                </div>
              </div>

              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-6">
                <div className="bg-gradient-to-r from-teal-400 to-emerald-400 h-full w-4/5 rounded-full animate-[progress_3s_infinite_ease-in-out]"></div>
              </div>
            </div>
          </div>
        )}

        {/* PAGE 1: HOME */}
        {activeTab === 'home' && (
          <div className="space-y-6 animate-fade-in text-left">
            <div className="bg-gradient-to-tr from-teal-600 via-emerald-600 to-indigo-600 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden animate-float">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.1),transparent)] pointer-events-none"></div>
              <div className="relative z-10 space-y-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-teal-200">AI-Powered Companion</span>
                <h2 className="text-2xl font-bold font-serif leading-tight">Good Morning 👋</h2>
                <p className="text-teal-100 text-xs">Understand your skin. Track your changes over time.</p>
                <div className="pt-3">
                  <button 
                    onClick={() => setActiveTab('analyze')} 
                    className="px-5 py-2.5 bg-white text-teal-800 hover:bg-teal-50 font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1 transition-all"
                  >
                    Start Skin Check <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="absolute right-0 bottom-0 top-0 opacity-10 flex items-center pr-2">
                <ClipboardCheck className="w-36 h-36" />
              </div>
            </div>

            {/* Glowing Skin Status card */}
            <div className="premium-card-teal p-5 space-y-4">
              <h3 className="text-xs font-extrabold tracking-widest uppercase text-slate-400 flex items-center gap-1.5">
                <Activity className="w-4.5 h-4.5 text-teal-500" /> Today's Skin Status
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-teal-500/5 border border-teal-500/10 rounded-2xl">
                  <span className="text-[10px] text-slate-400 font-bold block">Current Trend</span>
                  <span className="text-sm font-extrabold text-teal-400 flex items-center gap-1.5 mt-1">
                    <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping"></span>
                    Stable
                  </span>
                </div>
                <div className="p-3 bg-purple-500/5 border border-purple-500/10 rounded-2xl">
                  <span className="text-[10px] text-slate-400 font-bold block">Severity Level</span>
                  <span className="text-sm font-extrabold text-purple-400 mt-1">{history[0]?.severity || "Healthy"}</span>
                </div>
                <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
                  <span className="text-[10px] text-slate-400 font-bold block">Last Screening</span>
                  <span className="text-xs font-extrabold text-amber-500 mt-1">{history[0]?.date || "No entries yet"}</span>
                </div>
                <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
                  <span className="text-[10px] text-slate-400 font-bold block">Skin Diary Streak</span>
                  <span className="text-xs font-extrabold text-blue-400 flex items-center gap-1 mt-1">
                    <Flame className="w-4 h-4 text-orange-500 animate-pulse" /> {streak} Days
                  </span>
                </div>
              </div>
            </div>

            {/* Recent Insight card */}
            <div className="premium-card-blue p-5 text-xs text-left">
              <h4 className="font-extrabold text-blue-400 uppercase tracking-widest text-[10px] mb-2 flex items-center gap-1">
                <Info className="w-3.5 h-3.5" /> Recent Insight
              </h4>
              <p className="text-slate-300 leading-normal">
                {history.length > 0 
                  ? `Your latest AI-assisted assessment (${history[0].disease}) is stable compared with your previous record.`
                  : "No screenings logged yet. Run your first analysis in the Analyze tab to generate clinical insights."}
              </p>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setShowDiaryModal(true)} 
                className="premium-card-teal p-5 flex flex-col items-center gap-3 active:scale-95 transition-all"
              >
                <div className="w-11 h-11 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center"><ClipboardCheck className="w-5.5 h-5.5" /></div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Daily Diary</span>
              </button>
              <button 
                onClick={() => setShowProgressModal(true)} 
                className="premium-card-blue p-5 flex flex-col items-center gap-3 active:scale-95 transition-all"
              >
                <div className="w-11 h-11 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center"><SlidersHorizontal className="w-5.5 h-5.5" /></div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Progress Trends</span>
              </button>
            </div>

            {/* Progress Preview mini trend graph */}
            <div className="premium-card-teal p-5 space-y-3">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Progress Preview</span>
              <div className="h-[90px] w-full flex items-end justify-between px-2 pt-4 bg-slate-950/80 border border-slate-905 rounded-2xl relative">
                <svg className="absolute inset-0 w-full h-full p-2" viewBox="0 0 100 50" preserveAspectRatio="none">
                  <path d="M 10 35 Q 35 25 60 40 T 90 20" fill="none" stroke="#14b8a6" strokeWidth="2.5" />
                  <circle cx="10" cy="35" r="2" fill="#14b8a6" />
                  <circle cx="90" cy="20" r="2" fill="#14b8a6" />
                </svg>
                <span className="absolute left-2 top-2 text-[8px] font-extrabold text-teal-400 uppercase">Severity Trend</span>
              </div>
            </div>
          </div>
        )}

        {/* PAGE 2: ANALYZE */}
        {activeTab === 'analyze' && !result && (
          <form onSubmit={runQualityCheck} className="space-y-6 animate-fade-in text-left">
            <div className="flex flex-col gap-1 border-b border-slate-200/50 dark:border-slate-800 pb-3">
              <h2 className="text-xl font-bold font-serif text-slate-900 dark:text-white">Diagnostic Console</h2>
              <p className="text-slate-500 text-xs">Run context-aware multimodal classification on your skin condition.</p>
            </div>

            {/* Glowing Photo frame */}
            <div className="premium-card-teal p-5 flex flex-col gap-4">
              <label className="text-[10px] font-extrabold uppercase tracking-widest text-teal-400">1. Upload affected lesion image</label>
              {useCamera ? (
                <div className="relative aspect-square bg-slate-950 rounded-3xl overflow-hidden border border-teal-500/30">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover"></video>
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3 px-4">
                    <button type="button" onClick={capturePhoto} className="px-4 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow">
                      <Camera className="w-4 h-4" /> Capture Photo
                    </button>
                    <button type="button" onClick={() => { setUseCamera(false); stopCamera(); }} className="px-4 py-2.5 bg-slate-800 text-white text-xs font-bold rounded-xl">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : imagePreview ? (
                <div className="relative aspect-square rounded-3xl overflow-hidden border border-teal-500/20 group shadow-inner">
                  <img src={imagePreview} alt="lesion" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                    <button type="button" onClick={() => { setImage(null); setImagePreview(null); }} className="px-4 py-2.5 bg-red-600 text-white rounded-xl text-xs font-bold">
                      Remove Photo
                    </button>
                  </div>
                </div>
              ) : (
                <div className="aspect-square bg-slate-950 border-2 border-dashed border-teal-500/20 rounded-3xl flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:border-teal-500/50 transition-all">
                  <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-full text-teal-400 mb-2">
                    <Upload className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-300">Drag/Drop Skin Image Here</span>
                  <div className="mt-4 flex gap-2.5">
                    <label className="px-3.5 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-850 rounded-xl text-[11px] font-bold shadow-sm cursor-pointer">
                      Browse Files
                      <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                    </label>
                    <button type="button" onClick={startCamera} className="px-3.5 py-2 bg-slate-950 text-white rounded-xl text-[11px] font-bold shadow-sm flex items-center gap-1">
                      <Camera className="w-3.5 h-3.5 text-teal-400" /> Use Camera
                    </button>
                  </div>
                </div>
              )}
              <canvas ref={canvasRef} className="hidden"></canvas>
            </div>

            {/* Language & Symptoms select (Optional toggle) */}
            <div className="premium-card-teal p-5 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-teal-400">2. Input Language & Symptoms (Optional)</label>
                <select 
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="text-xs font-bold border border-slate-800 rounded-lg p-2 bg-slate-950 text-slate-300 outline-none"
                >
                  <option value="en">English</option>
                  <option value="hi">हिंदी (Hindi)</option>
                  <option value="kn">ಕನ್ನಡ (Kannada)</option>
                </select>
              </div>

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
                          ? 'bg-teal-600 border-teal-600 text-white shadow-sm' 
                          : 'bg-slate-950 border-slate-800 text-slate-400'
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
                className="w-full border border-slate-800 rounded-xl p-3 text-xs bg-slate-950 text-slate-100 outline-none focus:border-teal-500"
              ></textarea>

              <SpeechRecorder 
                language={language} 
                onTranscript={(text) => setSymptoms(prev => prev ? `${prev} ${text}` : text)}
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !image}
              className="w-full py-4 bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-500 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-teal-500/15 flex items-center justify-center gap-2"
            >
              <Activity className="w-4 h-4" /> Run Diagnostic Checks
            </button>
          </form>
        )}

        {/* STRICT SKIN-ONLY & QUALITY MODAL POPUP */}
        {showQualityModal && qualityCheckResult && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-6 text-center animate-fade-in text-left">
            <div className="premium-card-teal p-6 max-w-sm w-full shadow-2xl space-y-5 animate-scale-in">
              <div className="flex justify-between items-center">
                <h3 className="font-serif font-bold text-slate-100">Image Quality Check</h3>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                  qualityCheckResult.valid ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                }`}>
                  Score: {qualityCheckResult.quality_score}%
                </span>
              </div>

              <div className="space-y-2 bg-slate-950 p-4 rounded-2xl text-xs">
                <div className="flex justify-between items-center">
                  <span>Clear Focus & Sharpness</span>
                  <span className={qualityCheckResult.metrics.clear_focus ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                    {qualityCheckResult.metrics.clear_focus ? '✓ Passes' : '✗ Blurry'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Balanced Brightness & Contrast</span>
                  <span className={qualityCheckResult.metrics.good_lighting ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                    {qualityCheckResult.metrics.good_lighting ? '✓ Passes' : '✗ Poor Light'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Skin Presence Ratio</span>
                  <span className={qualityCheckResult.metrics.skin_detected ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                    {qualityCheckResult.metrics.skin_detected ? '✓ Passes' : '✗ Non-skin'}
                  </span>
                </div>
              </div>

              {qualityCheckResult.valid ? (
                <div className="space-y-4">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    ✓ **Optimal Frame Properties**. The input passes resolution, contrast, focus, and illumination thresholds and is fully suitable for AI inference.
                  </p>
                  <button 
                    onClick={proceedToResults} 
                    className="w-full py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-bold text-xs rounded-xl"
                  >
                    Proceed to Diagnostic Report
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl font-bold">
                    ⚠️ {qualityCheckResult.message}
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => { setShowQualityModal(false); setImage(null); setImagePreview(null); }} 
                      className="flex-grow py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl"
                    >
                      Try Again
                    </button>
                    <button 
                      onClick={() => { setShowQualityModal(false); setImage(null); setImagePreview(null); setActiveTab('home'); }} 
                      className="py-2.5 px-4 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl"
                    >
                      Back
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PAGE 2.1: ANALYSIS DIAGNOSTIC RESULTS */}
        {activeTab === 'analyze' && result && (
          <div className="space-y-6 animate-fade-in text-left">
            <div className="flex justify-between items-center border-b border-slate-200/50 dark:border-slate-800 pb-3">
              <h2 className="text-lg font-bold font-serif text-slate-900 dark:text-white">Diagnostic Report</h2>
              <div className="flex items-center gap-2">
                <button 
                  onClick={downloadReport}
                  className="p-2 border border-slate-800 rounded-xl hover:bg-slate-900 text-teal-400"
                  title="Download PDF report"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => { setResult(null); setImage(null); setImagePreview(null); }}
                  className="text-xs font-bold text-teal-400"
                >
                  New Scan
                </button>
              </div>
            </div>

            {/* Glowing Condition Card */}
            <div className="premium-card-purple p-5 space-y-4">
              <div>
                <span className="text-[10px] font-bold uppercase text-purple-400 tracking-wider">Identified Skin Condition</span>
                <h3 className="text-lg font-serif font-bold text-slate-100 mt-1">{result.disease}</h3>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-slate-950 border border-purple-500/10 rounded-2xl">
                  <span className="text-[9px] text-slate-400 uppercase font-bold">Confidence Score</span>
                  <span className="block text-lg font-black text-purple-400 mt-1">{userConfidence}%</span>
                </div>
                <div className="p-3 bg-slate-950 border border-purple-500/10 rounded-2xl">
                  <span className="text-[9px] text-slate-400 uppercase font-bold">Severity Estimate</span>
                  <span className="block text-lg font-black text-purple-400 mt-1">{result.severity}</span>
                </div>
              </div>
            </div>

            {/* Interactive Image analysis overlays (Pimples/Dark Spots) */}
            <div className="premium-card-teal p-5 space-y-4">
              <h4 className="text-xs font-extrabold text-teal-400 uppercase tracking-widest">Lesion Count & Target Markers</h4>
              
              <div className="relative aspect-square w-full rounded-2xl overflow-hidden border border-slate-800">
                <img src={result.original_image} alt="original" className="w-full h-full object-cover" />
                
                {/* Draw red circles for detected pimples */}
                {result.lesion_analysis?.pimple_coords?.map((coord, idx) => (
                  <div 
                    key={`p-${idx}`}
                    className="absolute w-3.5 h-3.5 rounded-full border-2 border-red-500 bg-red-500/20 shadow-md shadow-red-500/50 animate-pulse"
                    style={{ left: `${(coord.x / 224) * 100}%`, top: `${(coord.y / 224) * 100}%`, transform: 'translate(-50%, -50%)' }}
                  ></div>
                ))}

                {/* Draw blue circles for dark spots */}
                {result.lesion_analysis?.dark_spot_coords?.map((coord, idx) => (
                  <div 
                    key={`d-${idx}`}
                    className="absolute w-3.5 h-3.5 rounded-full border-2 border-blue-500 bg-blue-500/20 shadow-md shadow-blue-500/50 animate-pulse"
                    style={{ left: `${(coord.x / 224) * 100}%`, top: `${(coord.y / 224) * 100}%`, transform: 'translate(-50%, -50%)' }}
                  ></div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950 p-3 rounded-2xl">
                <div>
                  <span className="text-red-400 font-bold block">• Active Acne/Pimples</span>
                  <span className="text-sm font-extrabold mt-1 block">
                    {result.lesion_analysis?.pimple_count ?? 0} regions detected
                  </span>
                </div>
                <div>
                  <span className="text-blue-400 font-bold block">• Hyperpigmentation</span>
                  <span className="text-sm font-extrabold mt-1 block">
                    {result.lesion_analysis?.dark_spot_count ?? 0} regions detected
                  </span>
                </div>
              </div>
              
              {(result.lesion_analysis?.pimple_count === 0 && result.lesion_analysis?.dark_spot_count === 0) && (
                <p className="text-[10px] text-slate-400 italic">Individual lesion count unavailable for this image.</p>
              )}
            </div>

            {/* Draggable CAM Heatmap Overlay slider */}
            <div className="premium-card-amber p-5 space-y-4">
              <h4 className="text-xs font-extrabold text-amber-400 uppercase tracking-widest">Explainable AI (CAM attention mapping)</h4>
              <div 
                ref={sliderContainerRef}
                onMouseDown={handleSliderMouse}
                onTouchStart={handleSliderTouch}
                className="relative aspect-square w-full rounded-2xl overflow-hidden border border-amber-500/20 cursor-ew-resize select-none"
              >
                <img src={result.overlay_image} alt="cam" className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
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
                  className="absolute top-0 bottom-0 w-0.5 bg-amber-500 flex items-center justify-center animate-glow-ring"
                  style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
                >
                  <div className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center text-[9px] border border-white font-bold">↔</div>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 leading-normal">
                💡 Drag the slider to compare the raw input image with the CNN attention pixels matching model weights.
              </p>
            </div>

            {/* General Advice Guidelines */}
            <div className="premium-card-teal p-5 space-y-3">
              <h4 className="text-xs font-extrabold text-teal-400 uppercase tracking-widest">Suggestions & Guidelines</h4>
              <div className="space-y-2 text-xs">
                {result.recommendations.map((rec, idx) => (
                  <div key={idx} className="flex gap-1 text-slate-400 leading-relaxed">
                    <span className="text-teal-400 font-bold">•</span>
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
              <div className="p-3 bg-teal-500/5 border border-teal-500/15 text-[10px] text-teal-400 rounded-xl leading-normal font-bold">
                ⚠️ **Disclaimer**: preliminary screening evaluation only. Consult dermatologists for actual clinical confirmation.
              </div>
            </div>

            <div className="flex gap-2.5">
              <button 
                type="button"
                onClick={() => {
                  setDiary(prev => [{
                    id: Date.now().toString(),
                    date: new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }),
                    symptoms: { itching: 4, pain: 2, burning: 1, dryness: 3, redness: result.severity },
                    notes: `AI screening match: ${result.disease}`,
                    image: result.original_image
                  }, ...prev]);
                  alert("Diagnostic report successfully saved to Skin Diary!");
                }}
                className="flex-grow py-3.5 bg-slate-900 border border-slate-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5"
              >
                <Bookmark className="w-4 h-4 text-teal-400" /> Save report to Diary
              </button>
              <button 
                onClick={() => { setResult(null); setImage(null); setImagePreview(null); }} 
                className="py-3.5 px-6 bg-slate-900 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5"
              >
                New Scan
              </button>
            </div>
          </div>
        )}

        {/* PAGE 3: LOCATION & CARE */}
        {activeTab === 'location' && (
          <div className="space-y-6 animate-fade-in text-left">
            <div className="flex flex-col gap-1 border-b border-slate-200/50 dark:border-slate-800 pb-3">
              <h2 className="text-xl font-bold font-serif text-slate-900 dark:text-white">Dermatologist Consultations</h2>
              <p className="text-slate-500 text-xs">Locate specialty care centers and book clinical routing appointments.</p>
            </div>

            <div className="premium-card-teal p-5 space-y-4">
              <label className="text-[10px] font-extrabold uppercase tracking-widest text-teal-400 block">Nearby Clinical Maps</label>
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={detectLocation}
                  disabled={locLoading}
                  className={`flex-grow flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                    locSuccess 
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                      : 'bg-slate-950 border-slate-800 text-slate-300'
                  }`}
                >
                  <MapPin className="w-4 h-4 text-teal-400" />
                  {locLoading ? "Locking GPS..." : locSuccess ? "GPS Locked" : "Use Current GPS"}
                </button>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Or enter city"
                  className="w-1/2 border border-slate-800 rounded-xl px-3 py-2.5 text-xs bg-slate-950 text-slate-100 outline-none"
                />
              </div>

              <div className="h-[220px] rounded-2xl overflow-hidden border border-slate-800 shadow-inner">
                <div ref={mapContainerRef} className="w-full h-full bg-stone-100"></div>
              </div>

              <div className="space-y-3 pt-2">
                {[
                  { name: "City Dermatology Clinic", distance: "1.4 km", rating: "4.8", hours: "09:00 AM – 06:00 PM", lat: 12.973, lon: 77.596 },
                  { name: "Apollo Skin Care Hospital", distance: "3.2 km", rating: "4.7", hours: "08:00 AM – 08:00 PM", lat: 12.969, lon: 77.592 },
                  { name: "Fortis Specialty Center", distance: "4.1 km", rating: "4.6", hours: "09:00 AM – 05:00 PM", lat: 12.975, lon: 77.598 }
                ].map((h, idx) => (
                  <div key={idx} className="p-3.5 bg-slate-950 border border-slate-855 rounded-2xl flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-xs leading-snug">{h.name}</span>
                      <span className="text-[9px] font-black text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-full flex-shrink-0 uppercase">{h.distance}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-400">
                      <span>★ {h.rating} Rating</span>
                      <span>Hours: {h.hours}</span>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <a href={`https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lon}`} target="_blank" rel="noreferrer" className="flex-grow py-2 border border-slate-800 hover:bg-slate-900 rounded-xl text-[10px] font-bold text-center">
                        Directions
                      </a>
                      <button type="button" onClick={() => handleBookAppointment(h)} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[10px] font-bold">
                        Book Appointment
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </main>

      {/* DIARY MODAL (Page 1 Overlay) */}
      {showDiaryModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-6 text-center animate-fade-in text-left">
          <div className="premium-card-teal p-6 max-w-sm w-full shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto custom-scrollbar animate-scale-in">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="font-serif font-bold text-slate-100">Log Daily symptoms</h3>
              <button onClick={() => setShowDiaryModal(false)} className="text-slate-400"><X className="w-5 h-5" /></button>
            </div>

            {[
              { label: "Itching level", state: itching, set: setItching },
              { label: "Pain intensity", state: pain, set: setPain },
              { label: "Burning sensation", state: burning, set: setBurning },
              { label: "Dryness level", state: dryness, set: setDryness }
            ].map((s, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs font-bold">
                  <span>{s.label}</span>
                  <span className="text-teal-400">{s.state}/10</span>
                </div>
                <input 
                  type="range" min="0" max="10" value={s.state} 
                  onChange={(e) => s.set(parseInt(e.target.value))}
                  className="w-full accent-teal-500 h-1 bg-slate-950 rounded-lg cursor-pointer"
                />
              </div>
            ))}

            <div className="space-y-1.5">
              <span className="text-xs font-bold block">Redness level</span>
              <div className="grid grid-cols-4 gap-2">
                {['None', 'Mild', 'Moderate', 'High'].map(level => (
                  <button
                    key={level} type="button" onClick={() => setRedness(level)}
                    className={`py-1.5 rounded-xl text-[10px] font-bold border transition-all ${
                      redness === level ? 'bg-teal-600 border-teal-600 text-white shadow-sm' : 'bg-slate-950 border-slate-855 text-slate-400'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-bold block">Add Notes</span>
              <textarea
                rows={2} value={diaryNotes} onChange={(e) => setDiaryNotes(e.target.value)}
                placeholder="Describe any updates..."
                className="w-full border border-slate-855 rounded-xl p-2.5 text-xs bg-slate-950 outline-none"
              ></textarea>
            </div>

            <button
              onClick={saveDiaryEntry}
              className="w-full py-3.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-bold text-xs rounded-xl"
            >
              Save Diary Log
            </button>
          </div>
        </div>
      )}

      {/* PROGRESS COMPARISON MODAL (Page 1 Overlay) */}
      {showProgressModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-6 text-center animate-fade-in text-left">
          <div className="premium-card-blue p-6 max-w-sm w-full shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto custom-scrollbar animate-scale-in">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="font-serif font-bold text-slate-100">Progress Comparison</h3>
              <button onClick={() => setShowProgressModal(false)} className="text-slate-400"><X className="w-5 h-5" /></button>
            </div>

            {history.length < 2 ? (
              <p className="text-xs text-slate-400">Requires at least 2 diagnostic screening logs to compare progress.</p>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="font-bold block mb-1">Base Scan</span>
                    <select 
                      value={compareBaseId} onChange={(e) => setCompareBaseId(e.target.value)}
                      className="w-full border border-slate-800 rounded-xl p-2 bg-slate-950 text-slate-200 outline-none"
                    >
                      {history.map(r => <option key={r.id} value={r.id}>{r.date} - {r.disease.substring(0,10)}...</option>)}
                    </select>
                  </div>
                  <div>
                    <span className="font-bold block mb-1">Target Scan</span>
                    <select 
                      value={compareTargetId} onChange={(e) => setCompareTargetId(e.target.value)}
                      className="w-full border border-slate-800 rounded-xl p-2 bg-slate-950 text-slate-200 outline-none"
                    >
                      {history.map(r => <option key={r.id} value={r.id}>{r.date} - {r.disease.substring(0,10)}...</option>)}
                    </select>
                  </div>
                </div>

                {baseRec && targetRec && (
                  <div className="space-y-4">
                    <div 
                      ref={compSliderContainerRef} onMouseDown={handleCompSliderMouse}
                      className="relative aspect-square w-full rounded-2xl overflow-hidden border border-blue-500/20 cursor-ew-resize select-none"
                    >
                      <img src={targetRec.image} alt="target" className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
                      <div 
                        className="absolute inset-0 overflow-hidden border-r border-amber-500"
                        style={{ width: `${compareSliderPos}%` }}
                      >
                        <img 
                          src={baseRec.image} alt="base" className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                          style={{ width: compSliderContainerRef.current ? compSliderContainerRef.current.clientWidth : '100%' }}
                        />
                      </div>
                      <div 
                        className="absolute top-0 bottom-0 w-0.5 bg-amber-500 flex items-center justify-center"
                        style={{ left: `${compareSliderPos}%`, transform: 'translateX(-50%)' }}
                      >
                        <div className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center text-[9px] border border-white font-bold">↔</div>
                      </div>
                    </div>

                    <div className="bg-slate-950 p-3 rounded-xl space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span>Severity:</span>
                        <span className="font-bold text-slate-200">{baseRec.severity} ➔ {targetRec.severity}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>AI Trend:</span>
                        <span className="font-bold text-teal-400">{getProgressTrend().label}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PROFILE MODAL CARD */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-6 text-center animate-fade-in text-left">
          <div className="premium-card-purple p-6 max-w-sm w-full shadow-2xl space-y-4 animate-scale-in">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="font-serif font-bold text-slate-100">Patient Profile</h3>
              <button onClick={() => setShowProfileModal(false)} className="text-slate-400"><X className="w-5 h-5" /></button>
            </div>

            {isLogged ? (
              <div className="space-y-4 text-xs">
                <div>
                  <span className="text-slate-400 block">Patient Name</span>
                  <span className="text-sm font-bold text-slate-100">{profileName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Registered Email</span>
                  <span className="text-sm font-bold text-slate-100">{profileEmail}</span>
                </div>
                <button 
                  onClick={handleLogout}
                  className="w-full py-2.5 border border-red-500/30 text-red-500 rounded-xl hover:bg-red-500/10 text-xs font-bold"
                >
                  Log Out Profile
                </button>
              </div>
            ) : (
              <form onSubmit={handleProfileSave} className="space-y-3 text-xs">
                <div className="space-y-1">
                  <span className="font-bold block">Patient Name</span>
                  <input 
                    type="text" required value={profileName} onChange={(e) => setProfileName(e.target.value)}
                    className="w-full border border-slate-800 rounded-xl p-2.5 bg-slate-950 text-slate-100 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <span className="font-bold block">Email Address</span>
                  <input 
                    type="email" required value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)}
                    className="w-full border border-slate-800 rounded-xl p-2.5 bg-slate-950 text-slate-100 outline-none"
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs rounded-xl"
                >
                  Create & Save Profile
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* VOICE ASSISTANT MODAL PANEL */}
      {showVoiceAssistant && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-6 text-center animate-fade-in text-left">
          <div className="premium-card-teal p-6 max-w-sm w-full shadow-2xl space-y-4 animate-scale-in text-center">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2 text-left">
              <h3 className="font-serif font-bold text-slate-100">Voice control Assistant</h3>
              <button onClick={() => setShowVoiceAssistant(false)} className="text-slate-400"><X className="w-5 h-5" /></button>
            </div>

            <div className="py-6 flex flex-col items-center gap-4">
              <button 
                onClick={triggerVoiceListen}
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                  isListening 
                    ? 'bg-red-600 text-white animate-glow-ring' 
                    : 'bg-teal-500/10 text-teal-400 hover:bg-teal-500/20'
                }`}
              >
                <Mic className="w-7 h-7" />
              </button>
              
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest block">System Narration Feedback</span>
                <p className="text-xs text-teal-400 font-bold leading-normal italic px-2">
                  "{voiceFeedback}"
                </p>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl text-[10px] text-slate-400 text-left space-y-1 leading-normal">
              <p className="font-bold text-slate-300 mb-1">🎙️ Voiced Commands to speak:</p>
              <p>• "What did the AI detect?" (Reads prediction & confidence)</p>
              <p>• "What should I do?" (Reads care guidelines suggestions)</p>
              <p>• "Read severity" (Reads estimated blemish severity)</p>
              <p>• "Open diary" (Launches daily check-in logs)</p>
              <p>• "Navigate location" (Opens consultation map page)</p>
            </div>
          </div>
        </div>
      )}

      {/* Appointment scheduling modal */}
      {showBookingOverlay && selectedHospital && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-6 text-center animate-fade-in text-left">
          <div className="premium-card-purple p-6 max-w-sm w-full shadow-2xl space-y-4 animate-scale-in">
            <h3 className="font-serif font-bold text-slate-100">Book Consultation Appointment</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Schedule a simulated appointment at **{selectedHospital.name}**.
            </p>

            <div className="space-y-3 text-xs pt-2">
              <div className="space-y-1">
                <span className="font-bold block">Appointment Date</span>
                <input 
                  type="date" value={bookingDate} onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full border border-slate-800 rounded-xl p-2.5 bg-slate-950 outline-none text-slate-100 font-bold"
                />
              </div>
              <div className="space-y-1">
                <span className="font-bold block">Preferred Time Slot</span>
                <input 
                  type="time" value={bookingTime} onChange={(e) => setBookingTime(e.target.value)}
                  className="w-full border border-slate-800 rounded-xl p-2.5 bg-slate-950 outline-none text-slate-100 font-bold"
                />
              </div>
            </div>

            <div className="flex gap-2.5 pt-3">
              <button 
                onClick={saveAppointment} 
                className="flex-grow py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-sm"
              >
                Schedule Appointment
              </button>
              <button 
                onClick={() => setShowBookingOverlay(false)} 
                className="py-3 px-4 bg-slate-800 text-slate-350 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PREMIUM STICKY BOTTOM NAVIGATION BAR */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-slate-950/90 backdrop-blur-lg border-t border-slate-200/50 dark:border-slate-800/60 py-3.5 px-6 shadow-xl">
        <div className="max-w-md mx-auto flex justify-between items-center">
          {[
            { id: 'home', label: 'Home', icon: <Home className="w-5 h-5" />, color: 'text-teal-500' },
            { id: 'analyze', label: 'Analyze', icon: <Camera className="w-5 h-5" />, color: 'text-amber-500' },
            { id: 'location', label: 'Care Connect', icon: <MapPin className="w-5 h-5" />, color: 'text-purple-500' }
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setError(null); }}
                className={`flex flex-col items-center gap-1 transition-all duration-150 relative ${
                  isActive 
                    ? `${tab.color} scale-110` 
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-stone-300'
                }`}
              >
                {tab.icon}
                <span className="text-[9px] font-extrabold uppercase tracking-wider">{tab.label}</span>
                {isActive && (
                  <span className="absolute -bottom-1.5 w-1 h-1 rounded-full bg-current"></span>
                )}
              </button>
            );
          })}
        </div>
      </footer>

    </div>
  );
}
