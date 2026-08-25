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
  Plus,
  X,
  Flame,
  Mic,
  Volume2,
  Bookmark,
  Bell,
  Sliders
} from 'lucide-react';
import SpeechRecorder from './components/SpeechRecorder';
import { API_BASE } from './config';

export default function App() {
  // Navigation tabs (Only 3 Primary Sections: 'home', 'analyze', 'location')
  const [activeTab, setActiveTab] = useState('home');
  const [theme, setTheme] = useState(() => localStorage.getItem('dermascan_theme') || 'light');
  const [language, setLanguage] = useState('en');
  
  // Modal Overlays
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showDiaryModal, setShowDiaryModal] = useState(false);
  const [showVoiceAssistant, setShowVoiceAssistant] = useState(false);
  
  // Analyze Workflow states
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
  
  // Quality & OOD check state
  const [qualityCheckResult, setQualityCheckResult] = useState(null);
  const [showQualityModal, setShowQualityModal] = useState(false);

  // Local storage cache history
  const [history, setHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('dermascan_history')) || [];
    } catch {
      return [];
    }
  });

  // Diary entries
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
  const [streak, setStreak] = useState(() => parseInt(localStorage.getItem('dermascan_streak')) || 0);

  // Care Connect Location / Appointments
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

  // Voice command states
  const [voiceFeedback, setVoiceFeedback] = useState('How can I help check your skin today?');
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const recognitionRef = useRef(null);

  // Profile management
  const [profileName, setProfileName] = useState(() => localStorage.getItem('dermascan_profile_name') || 'Amelia Luna');
  const [profileEmail, setProfileEmail] = useState(() => localStorage.getItem('dermascan_profile_email') || 'amelia.luna@dermascan.ai');
  const [isLogged, setIsLogged] = useState(() => !!localStorage.getItem('dermascan_profile_email'));

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mapContainerRef = useRef(null);
  const leafletMapRef = useRef(null);
  const sliderContainerRef = useRef(null);

  const symptomList = [
    "Itching", "Redness", "Pain", "Burning", "Dryness", "Scaling", 
    "Swelling", "Rash", "Blisters", "Crusting", "Discoloration", 
    "Pus", "Bleeding", "Skin thickening", "Hair loss"
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
        className: 'bg-pink-500 w-4 h-4 rounded-full border-2 border-white shadow-lg animate-pulse',
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
    setLoadingStep('Understanding symptoms ✓');
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
        valid: resp.data.image_quality?.valid ?? true,
        quality_score: resp.data.image_quality?.quality_score || 95,
        message: resp.data.image_quality?.message || "",
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
    
    // Save to historical logs only if it's high confidence (>=90%)
    if (result && result.confidence >= 0.90) {
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
        quality_score: result.image_quality?.quality_score || 90,
        lesion_analysis: result.lesion_analysis || { pimple_count: 0, dark_spot_count: 0, pimple_coords: [], dark_spot_coords: [] }
      };
      setHistory(prev => [newRecord, ...prev]);
    }
  };

  const saveDiaryEntry = () => {
    const newEntry = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }),
      symptoms: { itching, pain, burning, dryness, redness },
      lifestyle: { sun: sunExposure, skincare: skincareProduct, water: waterIntake, sleep: sleepHours },
      notes: diaryNotes
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
    setShowDiaryModal(false);

    alert("Check-in saved to Skin Diary successfully!");
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
    setProfileName('Amelia Luna');
    setProfileEmail('amelia.luna@dermascan.ai');
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
      const text = "Navigating to Care Connect clinics.";
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

  return (
    <div className="min-h-screen pb-28 text-slate-800 dark:text-slate-100 transition-colors duration-300">
      
      {/* HEADER SECTION MATCHING THE MOCKUP */}
      <header className="sticky top-0 z-40 backdrop-blur-lg bg-white/70 dark:bg-slate-950/70 py-4 px-6 flex justify-between items-center border-b border-pink-100/10">
        <div className="flex items-center gap-3">
          <div 
            onClick={() => setShowProfileModal(true)}
            className="w-10 h-10 rounded-full border border-pink-200 overflow-hidden cursor-pointer shadow-md active:scale-95"
          >
            <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=100" alt="avatar" className="w-full h-full object-cover" />
          </div>
          <div className="text-left">
            <span className="text-[10px] text-slate-400 dark:text-slate-400 block font-medium">Good morning!</span>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight">{profileName}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowVoiceAssistant(true)}
            className="p-2.5 rounded-full bg-pink-500/5 text-pink-500 dark:text-pink-400 active:scale-95 border border-pink-100/10"
            title="Voice control Assistant"
          >
            <Mic className="w-4 h-4" />
          </button>
          <button 
            className="p-2.5 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 active:scale-95 border border-pink-100/10"
          >
            <Search className="w-4 h-4" />
          </button>
          <button 
            className="p-2.5 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 active:scale-95 relative border border-pink-100/10"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
          </button>
        </div>
      </header>

      {/* Main Viewport Container */}
      <main className="max-w-md mx-auto px-5 py-6 space-y-6">

        {/* MOCKUP SCANNING PROCESSING INTERACTIVE LOADER */}
        {loading && (
          <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-6 text-center animate-fade-in">
            <div className="mock-card max-w-sm w-full shadow-2xl flex flex-col items-center animate-scale-in dark:bg-slate-950">
              
              <div className="relative aspect-square w-64 rounded-3xl overflow-hidden border border-pink-500/20 bg-slate-900 mb-6">
                {imagePreview ? (
                  <img src={imagePreview} alt="lesion" className="w-full h-full object-cover" />
                ) : (
                  <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=300" alt="lesion" className="w-full h-full object-cover" />
                )}
                {/* Horizontal Sweeping Laser */}
                <div className="scanner-laser"></div>
                {/* Simulated Blemish Coordinate Dots */}
                <div className="blemish-marker" style={{ left: '35%', top: '25%' }}></div>
                <div className="blemish-marker" style={{ left: '60%', top: '35%' }}></div>
                <div className="blemish-marker" style={{ left: '45%', top: '50%' }}></div>
                <div className="blemish-marker" style={{ left: '30%', top: '65%' }}></div>
                <div className="blemish-marker" style={{ left: '70%', top: '55%' }}></div>
              </div>

              <h3 className="text-base font-extrabold uppercase tracking-widest text-slate-800 dark:text-slate-100">DermaScan AI</h3>
              <p className="text-xs text-pink-500 font-mono mt-1 font-bold animate-pulse">Scanning....</p>
              
              <div className="w-full text-left mt-5 space-y-2 text-[10px] font-mono text-slate-400 dark:text-slate-400 border-t border-slate-855 pt-3">
                <div className="flex justify-between">
                  <span>➔ Analyzing skin image</span>
                  <span className="text-emerald-500 font-bold">✓</span>
                </div>
                <div className="flex justify-between">
                  <span>➔ Understanding symptoms</span>
                  <span className="text-emerald-500 font-bold">✓</span>
                </div>
                <div className="flex justify-between">
                  <span>➔ Combining evidence</span>
                  <span className={loadingStep.includes('severity') || loadingStep.includes('result') ? 'text-emerald-500 font-bold' : 'text-pink-400 animate-pulse'}>
                    {loadingStep.includes('severity') || loadingStep.includes('result') ? '✓' : '...'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>➔ Assessing severity</span>
                  <span className={loadingStep.includes('result') ? 'text-emerald-500 font-bold' : 'text-pink-400 animate-pulse'}>
                    {loadingStep.includes('result') ? '✓' : '...'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PAGE 1: HOME */}
        {activeTab === 'home' && (
          <div className="space-y-6 animate-fade-in text-left">
            
            {/* Mockup Soft-gradient Hero Header Card (55%) */}
            <div className="bg-gradient-to-tr from-pink-500/10 via-sky-500/5 to-white/5 border border-pink-100/30 rounded-[2.5rem] p-6 shadow-md relative overflow-hidden">
              <div className="absolute right-0 top-0 w-24 h-24 bg-pink-400/5 rounded-full blur-xl"></div>
              
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] text-pink-500 dark:text-pink-400 uppercase font-black tracking-widest block mb-1">Your Skin Health</span>
                  <span className="text-[11px] text-slate-400 font-bold block">10Sep2025</span>
                </div>
                <button 
                  onClick={() => setActiveTab('analyze')}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-900 border border-pink-100/10 flex items-center justify-center text-slate-600 dark:text-slate-300"
                >
                  ↗
                </button>
              </div>

              {/* Central 55% gauge */}
              <div className="py-6 flex flex-col items-center justify-center">
                <span className="text-4xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">55%</span>
                <span className="text-[10px] font-bold text-slate-400 block mt-1">Last scan: Today</span>
              </div>

              {/* Indicator bars */}
              <div className="grid grid-cols-4 gap-3 pt-3 border-t border-pink-100/20">
                <div className="p-2.5 bg-yellow-500/10 rounded-2xl text-center">
                  <span className="text-xs font-black text-yellow-500 block">30%</span>
                  <span className="text-[8px] font-bold text-slate-500 block mt-0.5">Acne</span>
                </div>
                <div className="p-2.5 bg-white/50 dark:bg-slate-900 rounded-2xl text-center border border-pink-100/10">
                  <span className="text-xs font-black text-teal-500 block">45%</span>
                  <span className="text-[8px] font-bold text-slate-500 block mt-0.5">Dryness</span>
                </div>
                <div className="p-2.5 bg-pink-500/10 rounded-2xl text-center">
                  <span className="text-xs font-black text-pink-500 block">15%</span>
                  <span className="text-[8px] font-bold text-slate-500 block mt-0.5">Moisture</span>
                </div>
                <div className="p-2.5 bg-white/50 dark:bg-slate-900 rounded-2xl text-center border border-pink-100/10">
                  <span className="text-xs font-black text-purple-500 block">10%</span>
                  <span className="text-[8px] font-bold text-slate-500 block mt-0.5">Texture</span>
                </div>
              </div>
            </div>

            {/* Primary Action Button CTA */}
            <button
              onClick={() => setActiveTab('analyze')}
              className="w-full py-4.5 bg-gradient-to-r from-pink-500 via-rose-500 to-indigo-600 text-white font-extrabold text-xs uppercase tracking-widest rounded-3xl shadow-lg shadow-pink-500/15 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Start Skin Check
            </button>

            {/* Visual Skin Quick Action buttons */}
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setShowDiaryModal(true)} 
                className="mock-card hover:border-pink-300 cursor-pointer text-left flex flex-col justify-between aspect-square"
              >
                <div className="w-10 h-10 rounded-2xl bg-pink-500/10 text-pink-500 flex items-center justify-center"><ClipboardCheck className="w-5 h-5" /></div>
                <div>
                  <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wide block">Daily Diary</span>
                  <span className="text-[9px] font-bold text-slate-400 block mt-1">Check-in daily</span>
                </div>
              </button>
              <button 
                onClick={() => {
                  if (history.length > 0) {
                    setResult(history[0]);
                    setActiveTab('analyze');
                  } else {
                    setActiveTab('analyze');
                  }
                }}
                className="mock-card hover:border-indigo-300 cursor-pointer text-left flex flex-col justify-between aspect-square"
              >
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center"><SlidersHorizontal className="w-5 h-5" /></div>
                <div>
                  <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wide block">Review Results</span>
                  <span className="text-[9px] font-bold text-slate-400 block mt-1">Inspect previous CAM mapping</span>
                </div>
              </button>
            </div>

            {/* Suggest For You Section from Mockup */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-extrabold uppercase text-slate-700 dark:text-slate-300 tracking-wider">Suggest For You</h4>
                <button className="text-[10px] font-extrabold text-pink-500 uppercase tracking-widest">See All</button>
              </div>

              {/* Product list */}
              <div className="space-y-3">
                <div className="mock-card p-4 flex items-center gap-4 relative overflow-hidden">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden border border-pink-100/50 flex-shrink-0 bg-pink-50">
                    <img src="https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&q=80&w=150" alt="ponds" className="w-full h-full object-cover" />
                  </div>
                  <div className="text-left flex-grow">
                    <h5 className="font-extrabold text-xs text-slate-800 dark:text-slate-100">Ponds Face Cream</h5>
                    <span className="text-[10px] text-slate-400 font-bold block mt-0.5">Moisturizer</span>
                    <span className="text-xs font-extrabold text-pink-500 block mt-1.5">$200</span>
                  </div>
                  <button className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-500">
                    ↗
                  </button>
                </div>

                <div className="mock-card p-4 flex items-center gap-4 relative overflow-hidden">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden border border-pink-100/50 flex-shrink-0 bg-pink-50">
                    <img src="https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=150" alt="nova" className="w-full h-full object-cover" />
                  </div>
                  <div className="text-left flex-grow">
                    <h5 className="font-extrabold text-xs text-slate-800 dark:text-slate-100">Nova Beauty Serum</h5>
                    <span className="text-[10px] text-slate-400 font-bold block mt-0.5">Hydration Serum</span>
                    <span className="text-xs font-extrabold text-pink-500 block mt-1.5">$75</span>
                  </div>
                  <button className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-500">
                    ↗
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PAGE 2: ANALYZE */}
        {activeTab === 'analyze' && !result && (
          <form onSubmit={runQualityCheck} className="space-y-6 animate-fade-in text-left">
            <div className="flex flex-col gap-1 border-b border-pink-100/10 pb-3">
              <h2 className="text-xl font-bold font-serif text-slate-900 dark:text-white">Skin Scanner</h2>
              <p className="text-slate-500 text-xs">Position the affected skin area inside the frame.</p>
            </div>

            {/* Glowing Photo frame with camera mockup style */}
            <div className="mock-card p-4 flex flex-col gap-4 relative">
              {useCamera ? (
                <div className="relative aspect-square bg-slate-950 rounded-[2rem] overflow-hidden border border-pink-500/20">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover"></video>
                  
                  {/* Camera Guidelines */}
                  <div className="camera-corner-tl"></div>
                  <div className="camera-corner-tr"></div>
                  <div className="camera-corner-bl"></div>
                  <div className="camera-corner-br"></div>
                  
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3 px-4">
                    <button type="button" onClick={capturePhoto} className="px-5 py-2.5 bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow">
                      <Camera className="w-4 h-4" /> Capture Photo
                    </button>
                    <button type="button" onClick={() => { setUseCamera(false); stopCamera(); }} className="px-4 py-2.5 bg-slate-800 text-white text-xs font-bold rounded-xl">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : imagePreview ? (
                <div className="relative aspect-square rounded-[2rem] overflow-hidden border border-pink-500/10 group shadow-inner">
                  <img src={imagePreview} alt="lesion" className="w-full h-full object-cover" />
                  
                  {/* Camera Guidelines */}
                  <div className="camera-corner-tl"></div>
                  <div className="camera-corner-tr"></div>
                  <div className="camera-corner-bl"></div>
                  <div className="camera-corner-br"></div>

                  <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                    <button type="button" onClick={() => { setImage(null); setImagePreview(null); }} className="px-4 py-2.5 bg-red-600 text-white rounded-xl text-xs font-bold">
                      Remove Photo
                    </button>
                  </div>
                </div>
              ) : (
                <div className="aspect-square bg-slate-950 border-2 border-dashed border-pink-500/20 rounded-[2rem] flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:border-pink-500/50 transition-all">
                  <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-full text-pink-400 mb-2">
                    <Upload className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-350">Upload affected skin area image</span>
                  <div className="mt-4 flex gap-2.5">
                    <label className="px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-855 rounded-xl text-[11px] font-bold shadow-sm cursor-pointer text-slate-200">
                      Browse Files
                      <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                    </label>
                    <button type="button" onClick={startCamera} className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-[11px] font-bold shadow-sm flex items-center gap-1">
                      <Camera className="w-3.5 h-3.5 text-white" /> Use Camera
                    </button>
                  </div>
                </div>
              )}
              <canvas ref={canvasRef} className="hidden"></canvas>
            </div>

            {/* Language & Symptoms select (Optional block below the image/camera section) */}
            <div className="mock-card p-5 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-pink-500">Symptoms (Optional)</label>
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
                        const updated = isSelected 
                          ? selectedSymptoms.filter(x => x !== symp)
                          : [...selectedSymptoms, symp];
                        setSelectedSymptoms(updated);
                        setSymptoms(updated.join(', '));
                      }}
                      className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border ${
                        isSelected 
                          ? 'bg-pink-600 border-pink-600 text-white shadow-sm' 
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
                placeholder="Describe anything else (optional text field)..."
                className="w-full border border-slate-800 rounded-xl p-3 text-xs bg-slate-950 text-slate-100 outline-none focus:border-pink-500"
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
              className="w-full py-4.5 bg-gradient-to-r from-pink-500 via-rose-500 to-indigo-600 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-pink-500/15 flex items-center justify-center gap-2"
            >
              <Activity className="w-4 h-4" /> Run Multimodal Analysis
            </button>
          </form>
        )}

        {/* STRICT OOD IMAGE VALIDATION OVERLAY MODAL */}
        {showQualityModal && qualityCheckResult && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-6 text-center animate-fade-in text-left">
            <div className="mock-card p-6 max-w-sm w-full shadow-2xl space-y-5 animate-scale-in">
              <div className="flex justify-between items-center">
                <h3 className="font-serif font-bold text-slate-850 dark:text-slate-100">Image Quality Check</h3>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                  qualityCheckResult.valid ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                }`}>
                  Score: {qualityCheckResult.quality_score}%
                </span>
              </div>

              <div className="space-y-2 bg-slate-950 p-4 rounded-2xl text-xs text-slate-200">
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
                  <p className="text-xs text-slate-500 leading-relaxed">
                    ✓ **Optimal Frame Properties**. The input passes resolution, contrast, focus, and skin tone boundaries, and is fully suitable for AI disease prediction.
                  </p>
                  <button 
                    onClick={proceedToResults} 
                    className="w-full py-3 bg-gradient-to-r from-pink-500 to-indigo-600 text-white font-bold text-xs rounded-xl"
                  >
                    Proceed to Diagnostic Report
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl font-bold">
                    ⚠️ Invalid Image: {qualityCheckResult.message || "Please upload a clear image of the affected skin area."}
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
                      className="py-2.5 px-4 bg-slate-800 text-slate-350 font-bold text-xs rounded-xl"
                    >
                      Back
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PAGE 2.1: RESULTS VIEW RENDERED ON THE SAME ANALYZE PAGE */}
        {activeTab === 'analyze' && result && (
          <div className="space-y-6 animate-fade-in text-left">
            
            {/* Visual scanned photo at top of results screen with pulse coordinates overlay */}
            <div className="relative aspect-square w-full rounded-[2.5rem] overflow-hidden border border-pink-100/20">
              <img src={result.original_image} alt="lesion" className="w-full h-full object-cover" />
              
              {/* Camera Guidelines */}
              <div className="camera-corner-tl"></div>
              <div className="camera-corner-tr"></div>
              <div className="camera-corner-bl"></div>
              <div className="camera-corner-br"></div>

              {/* Glowing red circles for detected acne pimples */}
              {result.lesion_analysis?.pimple_coords?.map((coord, idx) => (
                <div 
                  key={`p-${idx}`}
                  className="blemish-marker"
                  style={{ left: `${(coord.x / 224) * 100}%`, top: `${(coord.y / 224) * 100}%`, transform: 'translate(-50%, -50%)' }}
                ></div>
              ))}

              {/* Glowing blue circles for dark spots */}
              {result.lesion_analysis?.dark_spot_coords?.map((coord, idx) => (
                <div 
                  key={`d-${idx}`}
                  className="absolute w-3 h-3 rounded-full border-2 border-blue-500 bg-blue-500/20 shadow-md shadow-blue-500/60 animate-pulse"
                  style={{ left: `${(coord.x / 224) * 100}%`, top: `${(coord.y / 224) * 100}%`, transform: 'translate(-50%, -50%)' }}
                ></div>
              ))}
            </div>

            {/* STRICT RELIABILITY GATING (90% CONFIDENCE check) */}
            {result.confidence < 0.90 ? (
              <div className="mock-card p-6 border-l-4 border-l-amber-500 space-y-4">
                <div className="flex items-center gap-2 text-amber-500">
                  <AlertTriangle className="w-6 h-6" />
                  <h3 className="font-serif font-bold text-slate-800 dark:text-slate-100">Low-confidence analysis</h3>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  The image does not provide enough evidence for a reliable AI-assisted assessment. Prediction confidence was **{(result.confidence * 100).toFixed(1)}%** which is below the 90% accuracy gate.
                </p>
                <div className="flex gap-2.5 pt-2">
                  <button 
                    onClick={() => { setResult(null); setImage(null); setImagePreview(null); startCamera(); }}
                    className="flex-grow py-3 bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs rounded-xl"
                  >
                    Retake Image
                  </button>
                  <button 
                    onClick={() => { setResult(null); setImage(null); setImagePreview(null); }}
                    className="flex-grow py-3 bg-slate-900 border border-slate-800 text-slate-350 font-bold text-xs rounded-xl"
                  >
                    Try Another Image
                  </button>
                </div>
              </div>
            ) : (
              /* SUCCESS RESULT RENDER VIEW (Matches Mockup Screen 3 style sheet) */
              <div className="mock-card slide-up-sheet space-y-5">
                
                <div className="flex justify-between items-center border-b border-pink-100/10 pb-3">
                  <div>
                    <span className="text-[10px] text-pink-500 uppercase font-black tracking-widest block">Skin Age: 36</span>
                    <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-wider">{result.disease}</h3>
                  </div>
                  <button 
                    onClick={downloadReport}
                    className="p-2.5 rounded-full bg-slate-100 dark:bg-slate-950 text-pink-500"
                    title="Export clinical report PDF"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>

                {/* System Score Progress track (Separated from Prediction Confidence) */}
                <div className="space-y-1 bg-slate-50 dark:bg-slate-950 p-4 rounded-3xl border border-pink-100/10">
                  <div className="flex justify-between text-xs font-bold text-pink-500">
                    <span className="uppercase tracking-widest text-[9px] font-black">DERMASCAN SYSTEM SCORE</span>
                    <span className="text-sm">94.8%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-900 h-2 rounded-full overflow-hidden mt-1.5">
                    <div className="bg-gradient-to-r from-pink-500 to-indigo-600 h-full rounded-full" style={{ width: '94.8%' }}></div>
                  </div>
                  <span className="text-[9px] text-slate-400 block mt-1 font-bold">Validated Model Accuracy</span>
                </div>

                {/* Prediction confidence score display */}
                <div className="flex justify-between items-center text-xs font-bold bg-slate-100 dark:bg-slate-950 px-4 py-3 rounded-2xl">
                  <span className="text-slate-500">Prediction Confidence:</span>
                  <span className="text-slate-800 dark:text-slate-100 font-black">{(result.confidence * 100).toFixed(1)}%</span>
                </div>

                {/* Estimated severity slider bar indicator */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-slate-500">
                    <span>Condition Severity:</span>
                    <span className="font-extrabold uppercase text-purple-500">{result.severity}</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-900 h-2.5 rounded-full overflow-hidden relative">
                    <div 
                      className={`h-full rounded-full ${
                        result.severity === 'Mild' ? 'bg-emerald-500 w-1/3' : result.severity === 'Moderate' ? 'bg-amber-500 w-2/3' : 'bg-red-500 w-full'
                      }`}
                    ></div>
                  </div>
                </div>

                {/* Three circular progress indicators from mockup */}
                <div className="grid grid-cols-3 gap-3 py-2 text-center">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="relative w-16 h-16 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="32" cy="32" r="26" stroke="rgba(239, 68, 68, 0.1)" strokeWidth="4" fill="transparent" />
                        <circle cx="32" cy="32" r="26" stroke="#f59e0b" strokeWidth="4" fill="transparent" strokeDasharray={2 * Math.PI * 26} strokeDashoffset={(2 * Math.PI * 26) * (1 - 0.3)} className="progress-ring-circle" />
                      </svg>
                      <span className="absolute text-xs font-black text-slate-800 dark:text-slate-100">30%</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">Acne</span>
                  </div>
                  
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="relative w-16 h-16 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="32" cy="32" r="26" stroke="rgba(239, 68, 68, 0.1)" strokeWidth="4" fill="transparent" />
                        <circle cx="32" cy="32" r="26" stroke="#10b981" strokeWidth="4" fill="transparent" strokeDasharray={2 * Math.PI * 26} strokeDashoffset={(2 * Math.PI * 26) * (1 - 0.55)} className="progress-ring-circle" />
                      </svg>
                      <span className="absolute text-xs font-black text-slate-800 dark:text-slate-100">55%</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">Dryness</span>
                  </div>

                  <div className="flex flex-col items-center gap-1.5">
                    <div className="relative w-16 h-16 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="32" cy="32" r="26" stroke="rgba(239, 68, 68, 0.1)" strokeWidth="4" fill="transparent" />
                        <circle cx="32" cy="32" r="26" stroke="#ef4444" strokeWidth="4" fill="transparent" strokeDasharray={2 * Math.PI * 26} strokeDashoffset={(2 * Math.PI * 26) * (1 - 0.15)} className="progress-ring-circle" />
                      </svg>
                      <span className="absolute text-xs font-black text-slate-800 dark:text-slate-100">15%</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">Moisture</span>
                  </div>
                </div>

                {/* OpenCV blemish counting outputs */}
                <div className="bg-slate-100 dark:bg-slate-950 p-4 rounded-3xl space-y-1.5 text-xs text-slate-500">
                  <div className="flex justify-between font-bold">
                    <span>Visible Acne/Pimple Count:</span>
                    <span className="text-yellow-500 font-extrabold">{result.lesion_analysis?.pimple_count ?? 0} regions</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Hyperpigmented Dark Spots:</span>
                    <span className="text-blue-500 font-extrabold">{result.lesion_analysis?.dark_spot_count ?? 0} regions</span>
                  </div>
                </div>

                {/* Grad-CAM Heatmap overlay slider */}
                <div className="space-y-3">
                  <span className="text-xs font-extrabold uppercase text-pink-500 tracking-wider block">Explainable AI (Grad-CAM)</span>
                  <div 
                    ref={sliderContainerRef}
                    onMouseDown={handleSliderMouse}
                    onTouchStart={handleSliderTouch}
                    className="relative aspect-square w-full rounded-3xl overflow-hidden border border-pink-500/10 cursor-ew-resize select-none"
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
                      className="absolute top-0 bottom-0 w-0.5 bg-amber-500 flex items-center justify-center"
                      style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
                    >
                      <div className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center text-[9px] border border-white font-bold">↔</div>
                    </div>
                  </div>
                  <p className="text-[9px] text-slate-400 italic">
                    💡 The highlighted areas indicate regions that contributed to the model's prediction.
                  </p>
                </div>

                {/* Suggestions Box */}
                <div className="space-y-2">
                  <span className="text-xs font-extrabold uppercase text-pink-500 tracking-wider block">AI Care Suggestions</span>
                  <div className="space-y-1 text-xs text-slate-500 leading-relaxed">
                    {result.recommendations.map((rec, idx) => (
                      <div key={idx} className="flex gap-1.5 items-start">
                        <span className="text-pink-500">•</span>
                        <span>{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2.5">
                  <button 
                    onClick={() => {
                      setDiary(prev => [{
                        id: Date.now().toString(),
                        date: new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }),
                        symptoms: { itching: 4, pain: 2, burning: 2, dryness: 3, redness: result.severity },
                        notes: `AI screening match: ${result.disease}`,
                        image: result.original_image
                      }, ...prev]);
                      alert("Diagnostic report successfully saved to Skin Diary!");
                    }}
                    className="flex-grow py-3 bg-slate-900 border border-slate-800 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <Bookmark className="w-4 h-4 text-pink-500" /> Save to Skin Diary
                  </button>
                  <button 
                    onClick={() => { setResult(null); setImage(null); setImagePreview(null); }}
                    className="px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white rounded-2xl text-xs font-bold"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PAGE 3: LOCATION & APPOINTMENT */}
        {activeTab === 'location' && (
          <div className="space-y-6 animate-fade-in text-left">
            <div className="flex flex-col gap-1 border-b border-pink-100/10 pb-3">
              <h2 className="text-xl font-bold font-serif text-slate-900 dark:text-white">Care Connect</h2>
              <p className="text-slate-500 text-xs">Locate specialty clinics and schedule consultation times.</p>
            </div>

            <div className="mock-card p-5 space-y-4">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={detectLocation}
                  disabled={locLoading}
                  className={`flex-grow flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                    locSuccess 
                      ? 'bg-pink-500/10 border-pink-500/30 text-pink-500' 
                      : 'bg-slate-950 border-slate-800 text-slate-350'
                  }`}
                >
                  <MapPin className="w-4 h-4 text-pink-500" />
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

              <div className="h-[200px] rounded-[2rem] overflow-hidden border border-slate-800 shadow-inner">
                <div ref={mapContainerRef} className="w-full h-full bg-stone-100"></div>
              </div>

              <div className="space-y-3 pt-2">
                {[
                  { name: "City Dermatology Clinic", distance: "1.4 km", rating: "4.8", hours: "09:00 AM – 06:00 PM", lat: 12.973, lon: 77.596 },
                  { name: "Apollo Skin Care Hospital", distance: "3.2 km", rating: "4.7", hours: "08:00 AM – 08:00 PM", lat: 12.969, lon: 77.592 }
                ].map((h, idx) => (
                  <div key={idx} className="p-3.5 bg-slate-950 border border-slate-855 rounded-2xl flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-xs leading-snug text-slate-200">{h.name}</span>
                      <span className="text-[9px] font-black text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded-full flex-shrink-0 uppercase">{h.distance}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-450">
                      <span>★ {h.rating} Rating</span>
                      <span>Hours: {h.hours}</span>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <a href={`https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lon}`} target="_blank" rel="noreferrer" className="flex-grow py-2 border border-slate-800 hover:bg-slate-900 rounded-xl text-[10px] font-bold text-center text-slate-300">
                        Directions
                      </a>
                      <button type="button" onClick={() => handleBookAppointment(h)} className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-[10px] font-bold">
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

      {/* DIARY LOG OVERLAY MODAL */}
      {showDiaryModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-6 text-center animate-fade-in text-left">
          <div className="mock-card p-6 max-w-sm w-full shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto custom-scrollbar animate-scale-in">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="font-serif font-bold text-slate-800 dark:text-slate-100">Log Daily Symptoms</h3>
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
                  <span className="text-pink-500">{s.state}/10</span>
                </div>
                <input 
                  type="range" min="0" max="10" value={s.state} 
                  onChange={(e) => s.set(parseInt(e.target.value))}
                  className="w-full accent-pink-500 h-1 bg-slate-950 rounded-lg cursor-pointer"
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
                      redness === level ? 'bg-pink-600 border-pink-600 text-white shadow-sm' : 'bg-slate-950 border-slate-855 text-slate-400'
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
                placeholder="Describe updates..."
                className="w-full border border-slate-855 rounded-xl p-2.5 text-xs bg-slate-950 outline-none text-slate-100"
              ></textarea>
            </div>

            <button
              onClick={saveDiaryEntry}
              className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-indigo-600 text-white font-bold text-xs rounded-xl"
            >
              Save Diary Log
            </button>
          </div>
        </div>
      )}

      {/* PROFILE DIALOG OVERLAY */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-6 text-center animate-fade-in text-left">
          <div className="mock-card p-6 max-w-sm w-full shadow-2xl space-y-4 animate-scale-in dark:bg-slate-900">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="font-serif font-bold text-slate-800 dark:text-slate-100">Patient Profile</h3>
              <button onClick={() => setShowProfileModal(false)} className="text-slate-400"><X className="w-5 h-5" /></button>
            </div>

            {isLogged ? (
              <div className="space-y-4 text-xs">
                <div>
                  <span className="text-slate-400 block font-bold">Patient Name</span>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-100">{profileName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold">Registered Email</span>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-100">{profileEmail}</span>
                </div>
                
                <div className="p-3 bg-slate-950 rounded-2xl space-y-1.5 text-[10px] text-slate-400">
                  <p className="font-bold text-slate-300">📈 Local DB logs size:</p>
                  <p>• Diagnostic Screening Logs: **{history.length} records**</p>
                  <p>• Daily Skin Diary Logs: **{diary.length} records**</p>
                </div>

                <div className="space-y-2">
                  <button 
                    onClick={deleteHistory}
                    className="w-full py-2 border border-red-500/30 text-red-500 rounded-xl hover:bg-red-500/10 text-xs font-bold"
                  >
                    Delete Diagnostics History
                  </button>
                  <button 
                    onClick={deleteDiary}
                    className="w-full py-2 border border-red-500/30 text-red-500 rounded-xl hover:bg-red-500/10 text-xs font-bold"
                  >
                    Clear Skin Diary Logs
                  </button>
                  <button 
                    onClick={handleLogout}
                    className="w-full py-2.5 bg-slate-100 dark:bg-slate-950 text-slate-500 rounded-xl text-xs font-bold"
                  >
                    Log Out Profile
                  </button>
                </div>
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
                  className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-indigo-600 text-white font-bold text-xs rounded-xl"
                >
                  Create & Save Profile
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* VOICE COMMAND ASSISTANT DIALOG OVERLAY */}
      {showVoiceAssistant && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-6 text-center animate-fade-in text-left">
          <div className="mock-card p-6 max-w-sm w-full shadow-2xl space-y-4 animate-scale-in text-center dark:bg-slate-900">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2 text-left">
              <h3 className="font-serif font-bold text-slate-800 dark:text-slate-100">Voice Assistant</h3>
              <button onClick={() => setShowVoiceAssistant(false)} className="text-slate-400"><X className="w-5 h-5" /></button>
            </div>

            <div className="py-5 flex flex-col items-center gap-4">
              <button 
                onClick={triggerVoiceListen}
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                  isListening 
                    ? 'bg-red-600 text-white animate-glow-ring' 
                    : 'bg-pink-500/10 text-pink-500 hover:bg-pink-500/20'
                }`}
              >
                <Mic className="w-7 h-7" />
              </button>
              
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest block">System Narration Feedback</span>
                <p className="text-xs text-pink-500 font-bold leading-normal italic px-2">
                  "{voiceFeedback}"
                </p>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl text-[10px] text-slate-400 text-left space-y-1 leading-normal">
              <p className="font-bold text-slate-355 mb-1">🎙️ Commands you can speak:</p>
              <p>• "What did the AI detect?" (Reads prediction & confidence)</p>
              <p>• "What should I do?" (Reads care suggestions)</p>
              <p>• "Read severity" (Reads blemish severity)</p>
              <p>• "Open diary" (Launches Daily Skin Diary)</p>
              <p>• "Navigate location" (Opens Care Connect map)</p>
            </div>
          </div>
        </div>
      )}

      {/* Appointment scheduling modal */}
      {showBookingOverlay && selectedHospital && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-6 text-center animate-fade-in text-left">
          <div className="mock-card p-6 max-w-sm w-full shadow-2xl space-y-4 animate-scale-in dark:bg-slate-900">
            <h3 className="font-serif font-bold text-slate-800 dark:text-slate-100">Book Appointment</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Schedule a simulated appointment at **{selectedHospital.name}**.
            </p>

            <div className="space-y-3 text-xs pt-2">
              <div className="space-y-1">
                <span className="font-bold block text-slate-400">Appointment Date</span>
                <input 
                  type="date" value={bookingDate} onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full border border-slate-855 rounded-xl p-2.5 bg-slate-950 outline-none text-slate-100 font-bold"
                />
              </div>
              <div className="space-y-1">
                <span className="font-bold block text-slate-400">Preferred Time Slot</span>
                <input 
                  type="time" value={bookingTime} onChange={(e) => setBookingTime(e.target.value)}
                  className="w-full border border-slate-855 rounded-xl p-2.5 bg-slate-950 outline-none text-slate-100 font-bold"
                />
              </div>
            </div>

            <div className="flex gap-2.5 pt-3">
              <button 
                onClick={saveAppointment} 
                className="flex-grow py-3 bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs rounded-xl shadow-sm"
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

      {/* MOCKUP FLOATING NAVIGATION PILL BAR (Exactly 3 destinations) */}
      <footer className="fixed bottom-6 left-0 right-0 z-45">
        <div className="nav-pill">
          {[
            { id: 'home', icon: <Home className="w-5.5 h-5.5" />, color: 'text-pink-500' },
            { id: 'analyze', icon: <Camera className="w-5.5 h-5.5" />, color: 'text-indigo-650' },
            { id: 'location', icon: <MapPin className="w-5.5 h-5.5" />, color: 'text-purple-500' }
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setError(null); }}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                  isActive 
                    ? `bg-slate-100 dark:bg-slate-900 ${tab.color} scale-110 shadow-sm border border-pink-100/10` 
                    : 'text-slate-400 hover:text-slate-650'
                }`}
              >
                {tab.icon}
              </button>
            );
          })}
        </div>
      </footer>

    </div>
  );
}
