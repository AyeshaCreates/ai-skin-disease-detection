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
  Phone, 
  Star, 
  ChevronRight, 
  ShieldAlert, 
  Download, 
  Camera, 
  ArrowLeft, 
  Sun, 
  Moon, 
  User, 
  Settings, 
  Lock, 
  Eye, 
  Trash2, 
  Calendar, 
  ClipboardCheck, 
  Home, 
  Plus, 
  X, 
  Flame, 
  Mic, 
  Volume2, 
  Bookmark, 
  Bell, 
  Sliders, 
  MessageSquare, 
  Globe,
  Clock,
  UserCheck,
  Check,
  LogIn
} from 'lucide-react';
import { API_BASE } from './config';

const UI_TRANSLATIONS = {
  en: {
    welcome: "Welcome to CareVoice",
    talk_ai: "Talk to AI",
    today_meds: "Today's Medicines",
    emergency: "Emergency Support",
    recent_reports: "Recent Reports",
    optional_scanner: "Optional Skin Image Analysis",
    scanner_desc: "Symptoms are optional — AI can analyze the image with or without them.",
    voice_placeholder: "Type or speak symptoms (Optional)...",
    run_analysis: "Run Multimodal Skin Analysis",
    save_medicine: "Save Medicine",
    registered_meds: "Registered Medicines",
    reports_portal: "Medical Reports Portal",
    gps: "Use Current GPS",
    gps_locked: "GPS Locked",
    gps_locking: "Locking GPS...",
    clinic_availability: "Doctor Availability",
    skin_diary: "Skin Diary & Progress",
    baseline_compare: "Baseline vs Latest Scan",
    trend_graph: "Blemish Count Trend",
    history_logs: "Previous Scans Log",
    book_appointment: "Book Appointment",
    hospital_schedules: "Clinic Timings & Schedules",
    select_slot: "Select Time Slot",
    select_date: "Appointment Date",
    my_appointments: "My Booked Appointments",
    listening_voice: "Listening... Speak symptoms in English",
    optional_badge: "Optional",
    sign_in: "Sign In",
    guest_user: "Guest User"
  },
  hi: {
    welcome: "CareVoice में आपका स्वागत है",
    talk_ai: "एआई से बात करें",
    today_meds: "आज की दवाएं",
    emergency: "आपातकालीन सहायता",
    recent_reports: "हालिया रिपोर्ट",
    optional_scanner: "वैकल्पिक त्वचा छवि विश्लेषण",
    scanner_desc: "लक्षण वैकल्पिक हैं — एआई उनके बिना भी विश्लेषण कर सकता है।",
    voice_placeholder: "लक्षण लिखें या बोलें (वैकल्पिक)...",
    run_analysis: "मल्टीमॉडल त्वचा विश्लेषण चलाएं",
    save_medicine: "दवा सहेजें",
    registered_meds: "पंजीकृत दवाएं",
    reports_portal: "मेडिकल रिपोर्ट पोर्टल",
    gps: "वर्तमान जीपीएस उपयोग करें",
    gps_locked: "जीपीएस लॉक है",
    gps_locking: "जीपीएस लॉक हो रहा है...",
    clinic_availability: "डॉक्टर की उपलब्धता",
    skin_diary: "त्वचा डायरी और प्रगति",
    baseline_compare: "आधार रेखा बनाम नवीनतम स्कैन",
    trend_graph: "धब्बा गणना की प्रवृत्ति",
    history_logs: "पिछला स्कैन लॉग",
    book_appointment: "अपॉइंटमेंट बुक करें",
    hospital_schedules: "क्लिनिक समय और कार्यक्रम",
    select_slot: "समय स्लॉट चुनें",
    select_date: "अपॉइंटमेंट तिथि",
    my_appointments: "मेरे बुक किए गए अपॉइंटमेंट",
    listening_voice: "सुन रहा हूँ... हिंदी में लक्षण बोलें",
    optional_badge: "वैकल्पिक",
    sign_in: "साइन इन करें",
    guest_user: "अतिथि उपयोगकर्ता"
  },
  kn: {
    welcome: "CareVoice ಗೆ ಸುಸ್ವಾಗತ",
    talk_ai: "AI ಜೊತೆ ಮಾತನಾಡಿ",
    today_meds: "ಇಂದಿನ ಔಷಧಿಗಳು",
    emergency: "ತುರ್ತು ನೆರವು",
    recent_reports: "ಇತ್ತೀಚಿನ ವರದಿಗಳು",
    optional_scanner: "ಐಚ್ಛಿಕ ಚರ್ಮದ ಚಿತ್ರ ವಿಶ್ಲೇಷಣೆ",
    scanner_desc: "ರೋಗಲಕ್ಷಣಗಳು ಐಚ್ಛಿಕವಾಗಿವೆ — ಇವುಗಳಿಲ್ಲದೆಯೂ AI ವಿಶ್ಲೇಷಿಸಬಲ್ಲದು.",
    voice_placeholder: "ರೋಗಲಕ್ಷಣಗಳನ್ನು ಟೈಪ್ ಮಾಡಿ ಅಥವಾ ಮಾತನಾಡಿ (ಐಚ್ಛಿಕ)...",
    run_analysis: "ಮಲ್ಟಿಮೋಡಲ್ ಚರ್ಮದ ವಿಶ್ಲೇಷಣೆ ಚಲಾಯಿಸಿ",
    save_medicine: "ಔಷಧಿ ಉಳಿಸಿ",
    registered_meds: "ನೋಂದಾಯಿತ ಔಷಧಿಗಳು",
    reports_portal: "ವೈದ್ಯಕೀಯ ವರದಿಗಳ ಪೋರ್ಟಲ್",
    gps: "ಪ್ರಸ್ತುತ ಜಿಪಿಎಸ್ ಬಳಸಿ",
    gps_locked: "ಜಿಪಿಎಸ್ ಲಾಕ್ ಆಗಿದೆ",
    gps_locking: "ಜಿಪಿಎಸ್ ಲಾಕ್ ಆಗುತ್ತಿದೆ...",
    clinic_availability: "ವೈದ್ಯರ ಲಭ್ಯತೆ",
    skin_diary: "ಚರ್ಮದ ದಿನಚರಿ ಮತ್ತು ಪ್ರಗತಿ",
    baseline_compare: "ಮೂಲ ರೇಖೆ vs ಇತ್ತೀಚಿನ ಸ್ಕ್ಯಾನ್",
    trend_graph: "ಕಲೆಗಳ ಎಣಿಕೆಯ ಪ್ರವೃತ್ತಿ",
    history_logs: "ಹಿಂದಿನ ಸ್ಕ್ಯಾನ್ ಲಾಗ್",
    book_appointment: "ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಬುಕ್ ಮಾಡಿ",
    hospital_schedules: "ಕ್ಲಿನಿಕ್ ಸಮಯ ಮತ್ತು ವೇಳಾಪಟ್ಟಿ",
    select_slot: "ಸಮಯ ಸ್ಲಾಟ್ ಆಯ್ಕೆಮಾಡಿ",
    select_date: "ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ದಿನಾಂಕ",
    my_appointments: "ನನ್ನ ಕಾಯ್ದಿರಿಸಿದ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್‌ಗಳು",
    listening_voice: "ಕೇಳಿಸಿಕೊಳ್ಳುತ್ತಿದೆ... ಕನ್ನಡದಲ್ಲಿ ಮಾತನಾಡಿ",
    optional_badge: "ಐಚ್ಛಿಕ",
    sign_in: "ಸೈನ್ ಇನ್",
    guest_user: "ಅತಿಥಿ ಬಳಕೆದಾರ"
  },
  ta: {
    welcome: "CareVoice க்கு வரவேற்கிறோம்",
    talk_ai: "AI உடன் பேசுங்கள்",
    today_meds: "இன்றைய மருந்துகள்",
    emergency: "அவசர உதவி",
    recent_reports: "சமீபத்திய அறிக்கைகள்",
    optional_scanner: "விருப்பமான தோல் பட பகுப்பாய்வு",
    scanner_desc: "அறிகுறிகள் விருப்பமானவை — அவை இல்லாமலும் AI பகுப்பாய்வு செய்ய முடியும்.",
    voice_placeholder: "அறிகுறிகளை தட்டச்சு செய்யவும் அல்லது பேசவும் (விருப்பமானது)...",
    run_analysis: "பல்வகை தோல் பகுப்பாய்வு இயக்கவும்",
    save_medicine: "மருந்தை சேமிக்கவும்",
    registered_meds: "பதிவுசெய்யப்பட்ட மருந்துகள்",
    reports_portal: "மருத்துவ அறிக்கைகள் போர்ட்டல்",
    gps: "தற்போதைய ஜிபிஎஸ் பயன்படுத்தவும்",
    gps_locked: "ஜிபிஎஸ் பூட்டப்பட்டது",
    gps_locking: "ஜிபிஎஸ் பூட்டப்படுகிறது...",
    clinic_availability: "மருத்துவர் இருப்பு",
    skin_diary: "தோல் நாட்குறிப்பு மற்றும் முன்னேற்றம்",
    baseline_compare: "அடிப்படை vs சமீபத்திய ஸ்கேன்",
    trend_graph: "வடு எண்ணிக்கையின் போக்கு",
    history_logs: "முந்தைய ஸ்கேன் பதிவுகள்",
    book_appointment: "முன்பதிவு செய்யுங்கள்",
    hospital_schedules: "மருத்துவமனை நேரம் மற்றும் அட்டவணை",
    select_slot: "நேரத்தை தேர்ந்தெடுக்கவும்",
    select_date: "முன்பதிவு தேதி",
    my_appointments: "எனது முன்பதிவு செய்யப்பட்ட சந்திப்புகள்",
    listening_voice: "கேட்கிறது... தமிழில் அறிகுறிகளைப் பேசுங்கள்",
    optional_badge: "விருப்பமானது",
    sign_in: "உள்நுழைக",
    guest_user: "விருந்தினர்"
  }
};

const DEFAULT_HOSPITALS = [
  {
    name: "Bangalore Medical College & Research Institute (Dermatology)",
    address: "Fort Road, near City Market, Bengaluru 560002",
    distance: "2.4 km",
    rating: "4.6",
    phone: "+91 80 2670 1150",
    hours: "Mon-Sat: 08:30 AM – 05:30 PM (Emergency 24/7)",
    status: "Open Now",
    specialist: "Dr. Ananya Rao, MD, DNB (Dermatology)",
    available_slots: ["09:30 AM", "11:00 AM", "02:00 PM", "04:45 PM"],
    lat: 12.9592,
    lon: 77.5744
  },
  {
    name: "Victoria Hospital Dermatology Department",
    address: "K.R. Road, Kalasipalya, Bengaluru 560002",
    distance: "2.5 km",
    rating: "4.4",
    phone: "+91 80 2670 1150",
    hours: "Mon-Sat: 09:00 AM – 06:00 PM",
    status: "Open Now",
    specialist: "Dr. Ramesh Patil, MBBS, DVD",
    available_slots: ["10:00 AM", "11:30 AM", "02:30 PM", "04:00 PM"],
    lat: 12.9632,
    lon: 77.5739
  },
  {
    name: "St. John's Medical College Hospital (Skin Unit)",
    address: "Sarjapur Main Road, John Nagar, Koramangala, Bengaluru 560034",
    distance: "5.1 km",
    rating: "4.7",
    phone: "+91 80 2206 5000",
    hours: "Mon-Sat: 08:00 AM – 08:00 PM (Emergency 24/7)",
    status: "Open Now",
    specialist: "Dr. Sneha Varma, MD (Dermatology & Cosmetology)",
    available_slots: ["09:00 AM", "10:30 AM", "01:30 PM", "03:00 PM", "05:30 PM"],
    lat: 12.9333,
    lon: 77.6244
  },
  {
    name: "Fortis Hospital Bannerghatta Road (Skin & Laser Centre)",
    address: "154/9, Bannerghatta Main Rd, Opposite IIMB, Bengaluru 560076",
    distance: "7.8 km",
    rating: "4.5",
    phone: "+91 96633 00000",
    hours: "Mon-Sun: 08:00 AM – 08:00 PM",
    status: "Open Now",
    specialist: "Dr. Rajeshwar K., MD (Aesthetic Dermatology)",
    available_slots: ["10:15 AM", "12:00 PM", "02:45 PM", "04:30 PM", "06:00 PM"],
    lat: 12.8943,
    lon: 77.5976
  },
  {
    name: "Manipal Hospital Old Airport Road (Skin Clinic)",
    address: "98, HAL Old Airport Rd, Kodihalli, Bengaluru 560017",
    distance: "6.2 km",
    rating: "4.8",
    phone: "+91 80 2502 4444",
    hours: "Mon-Sat: 09:00 AM – 07:00 PM",
    status: "Open Now",
    specialist: "Dr. Kavitha Sundaram, MD, FRCP",
    available_slots: ["09:45 AM", "11:15 AM", "03:15 PM", "05:00 PM"],
    lat: 12.9593,
    lon: 77.6444
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [theme, setTheme] = useState(() => localStorage.getItem('carevoice_theme') || 'light');
  const [language, setLanguage] = useState('en');
  
  // Authentication State & Modal
  const [token, setToken] = useState(() => localStorage.getItem('carevoice_token') || '');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authUsername, setAuthUsername] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [authError, setAuthError] = useState('');

  // Profile data
  const [profile, setProfile] = useState(null);

  // Reminders, Medicines, Reports, and Appointments List States
  const [medicines, setMedicines] = useState([
    { id: 1, name: "Gentle Cleanser & Barrier Cream", dosage: "Apply 2x daily", schedule_time: "08:00 AM" }
  ]);
  const [reminders, setReminders] = useState([
    { id: 1, name: "Barrier Cream", dosage: "Apply thin layer", reminder_time: "08:00 AM", status: "Pending" }
  ]);
  const [reports, setReports] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [nearbyHospitals, setNearbyHospitals] = useState(DEFAULT_HOSPITALS);
  
  // Local storage cache history
  const [history, setHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('carevoice_history')) || [];
    } catch {
      return [];
    }
  });

  // Input Forms States
  const [newMedName, setNewMedName] = useState('');
  const [newMedDosage, setNewMedDosage] = useState('');
  const [newMedTime, setNewMedTime] = useState('08:00 AM');
  const [reportTitle, setReportTitle] = useState('');
  const [reportFile, setReportFile] = useState(null);

  // Appointment Booking Modal State
  const [selectedHospitalForBooking, setSelectedHospitalForBooking] = useState(null);
  const [bookingDate, setBookingDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [bookingSlot, setBookingSlot] = useState('10:00 AM');
  const [bookingNotes, setBookingNotes] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccessMsg, setBookingSuccessMsg] = useState('');

  // Chatbot State
  const [chatHistory, setChatHistory] = useState([
    { sender: 'bot', text: 'Hello! I am your CareVoice AI Health Assistant. I can analyze symptoms, voice queries, schedule medicine reminders, and assist with appointments & emergencies.' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Skin Analyzer Workflow (Optional Symptoms + Multimodal Gating)
  const [symptoms, setSymptoms] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [useCamera, setUseCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [sliderPosition, setSliderPosition] = useState(50);
  
  // Validation, Quality & OOD check state
  const [validationErrorType, setValidationErrorType] = useState(null);

  // Geolocation Care Connect Location
  const [city, setCity] = useState('Bengaluru');
  const [lat, setLat] = useState(12.9716);
  const [lon, setLon] = useState(77.5946);
  const [locLoading, setLocLoading] = useState(false);
  const [locSuccess, setLocSuccess] = useState(false);

  // Voice Speech Command Recognition
  const [isListening, setIsListening] = useState(false);
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);
  const recognitionRef = useRef(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mapContainerRef = useRef(null);
  const leafletMapRef = useRef(null);
  const sliderContainerRef = useRef(null);

  // Theme Sync
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('carevoice_theme', theme);
  }, [theme]);

  // Auth Session Sync
  useEffect(() => {
    if (token) {
      localStorage.setItem('carevoice_token', token);
      fetchUserProfile();
      fetchMedicines();
      fetchReminders();
      fetchReports();
      fetchAppointments();
    } else {
      localStorage.removeItem('carevoice_token');
      setProfile(null);
    }
  }, [token]);

  // Initial Data Load
  useEffect(() => {
    fetchNearbyHospitals();
    fetchAppointments();
  }, []);

  // Save new result to history array for trends
  useEffect(() => {
    if (result && result.disease !== "Normal Skin") {
      const isDuplicate = history.some(h => h.image === result.original_image);
      if (!isDuplicate) {
        const newEntry = {
          date: new Date().toLocaleDateString(),
          disease: result.disease,
          confidence: result.confidence,
          severity: result.severity,
          pimple_count: result.lesion_analysis?.pimple_count || 0,
          dark_spot_count: result.lesion_analysis?.dark_spot_count || 0,
          image: result.original_image
        };
        const updated = [newEntry, ...history];
        setHistory(updated);
        localStorage.setItem('carevoice_history', JSON.stringify(updated));
      }
    }
  }, [result]);

  // Fetch Hospitals when Location Tab or Coordinates Change
  useEffect(() => {
    fetchNearbyHospitals();
  }, [lat, lon, city]);

  const fetchNearbyHospitals = async () => {
    try {
      const resp = await axios.get(`${API_BASE}/api/location/nearby`, {
        params: { lat: lat || 12.9716, lon: lon || 77.5946, city: city || 'Bengaluru' }
      });
      if (resp.data && Array.isArray(resp.data) && resp.data.length > 0) {
        setNearbyHospitals(resp.data);
        if (leafletMapRef.current && window.L) {
          updateMapMarkers(resp.data);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Leaflet Map Initialization
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
    }).addTo(map).bindPopup("<b>Your Location</b>").openPopup();

    if (nearbyHospitals.length > 0) {
      updateMapMarkers(nearbyHospitals);
    }
  };

  const updateMapMarkers = (hospitals) => {
    if (!leafletMapRef.current || !window.L) return;
    hospitals.forEach(h => {
      if (h.lat && h.lon) {
        window.L.marker([h.lat, h.lon], {
          icon: window.L.divIcon({
            className: 'bg-indigo-600 text-white rounded-full p-1 text-[8px] font-bold text-center flex items-center justify-center border-2 border-white shadow-md',
            iconSize: [22, 22],
            html: '🏥'
          })
        }).addTo(leafletMapRef.current).bindPopup(`<b>${h.name}</b><br/>${h.hours || 'Open'}<br/>${h.distance}`);
      }
    });
  };

  // UI Strings Translation helper
  const translateUi = (key) => {
    const langDict = UI_TRANSLATIONS[language] || UI_TRANSLATIONS['en'];
    return langDict[key] || UI_TRANSLATIONS['en'][key] || key;
  };

  // --- API Authentication Handlers ---
  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    const endpoint = authMode === 'login' ? 'login' : 'register';
    const payload = authMode === 'login' 
      ? { username: authUsername, password: authPassword }
      : { username: authUsername, email: authEmail, password: authPassword };
      
    try {
      const resp = await axios.post(`${API_BASE}/api/auth/${endpoint}`, payload);
      setToken(resp.data.token);
      setShowAuthModal(false);
      setAuthUsername('');
      setAuthEmail('');
      setAuthPassword('');
    } catch (err) {
      setAuthError(err.response?.data?.detail || "Authentication request failed.");
    }
  };

  const handleLogout = () => {
    setToken('');
    setProfile(null);
    localStorage.removeItem('carevoice_token');
  };

  const fetchUserProfile = async () => {
    if (!token) return;
    try {
      const resp = await axios.get(`${API_BASE}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfile(resp.data);
    } catch (err) {
      if (err.response?.status === 401) handleLogout();
    }
  };

  // --- Appointments API Services ---
  const fetchAppointments = async () => {
    try {
      const resp = await axios.get(`${API_BASE}/api/appointments`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setAppointments(resp.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleBookAppointment = async (e) => {
    e.preventDefault();
    if (!selectedHospitalForBooking) return;
    setBookingLoading(true);
    setBookingSuccessMsg('');

    try {
      const payload = {
        hospital_name: selectedHospitalForBooking.name,
        doctor_name: selectedHospitalForBooking.specialist || "Dermatology Specialist",
        appointment_date: bookingDate,
        appointment_time: bookingSlot,
        patient_symptoms: bookingNotes || symptoms || "Skin consultation"
      };

      const resp = await axios.post(`${API_BASE}/api/appointments`, payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      setBookingSuccessMsg('Appointment confirmed successfully!');
      setAppointments(prev => [resp.data, ...prev]);
      setTimeout(() => {
        setSelectedHospitalForBooking(null);
        setBookingSuccessMsg('');
      }, 1800);
    } catch (err) {
      alert("Failed to book appointment: " + (err.response?.data?.detail || err.message));
    } finally {
      setBookingLoading(false);
    }
  };

  const handleCancelAppointment = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this appointment?")) return;
    try {
      await axios.delete(`${API_BASE}/api/appointments/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setAppointments(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      alert("Failed to cancel appointment.");
    }
  };

  // --- Medicines & Reminders CRUD API Services ---
  const fetchMedicines = async () => {
    if (!token) return;
    try {
      const resp = await axios.get(`${API_BASE}/api/medicines`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (resp.data && resp.data.length > 0) setMedicines(resp.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchReminders = async () => {
    if (!token) return;
    try {
      const resp = await axios.get(`${API_BASE}/api/reminders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (resp.data && resp.data.length > 0) setReminders(resp.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddMedicine = async (e) => {
    e.preventDefault();
    if (!newMedName || !newMedDosage) return;
    const newMed = { id: Date.now(), name: newMedName, dosage: newMedDosage, schedule_time: newMedTime };
    setMedicines(prev => [...prev, newMed]);
    setReminders(prev => [...prev, { id: Date.now(), name: newMedName, dosage: newMedDosage, reminder_time: newMedTime, status: 'Pending' }]);
    
    if (token) {
      try {
        const resp = await axios.post(
          `${API_BASE}/api/medicines`, 
          { name: newMedName, dosage: newMedDosage, schedule_time: newMedTime },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        await axios.post(
          `${API_BASE}/api/reminders`,
          { medicine_id: resp.data.id, reminder_time: newMedTime, status: 'Pending' },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (err) {
        console.error(err);
      }
    }
    setNewMedName('');
    setNewMedDosage('');
  };

  const handleDeleteMedicine = async (id) => {
    setMedicines(prev => prev.filter(m => m.id !== id));
    setReminders(prev => prev.filter(r => r.id !== id));
    if (token) {
      try {
        await axios.delete(`${API_BASE}/api/medicines/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (err) {
        console.error(err);
      }
    }
  };

  // --- Medical Reports API Services ---
  const fetchReports = async () => {
    if (!token) return;
    try {
      const resp = await axios.get(`${API_BASE}/api/reports`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReports(resp.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUploadReport = async (e) => {
    e.preventDefault();
    if (!reportTitle || !reportFile) return;
    
    const newRep = { id: Date.now(), title: reportTitle, file_name: reportFile.name, uploaded_at: new Date().toISOString() };
    setReports(prev => [newRep, ...prev]);

    if (token) {
      const formData = new FormData();
      formData.append('title', reportTitle);
      formData.append('file', reportFile);
      try {
        await axios.post(`${API_BASE}/api/reports/upload`, formData, {
          headers: { 
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`
          }
        });
        fetchReports();
      } catch (err) {
        console.error(err);
      }
    }
    setReportTitle('');
    setReportFile(null);
  };

  // --- Robust Multilingual Voice Microphone Pipeline ---
  const triggerVoiceListen = () => {
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.error(e);
        }
      }
      setIsListening(false);
      return;
    }

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      alert("Voice speech recognition is not supported in this browser. Please type symptoms instead.");
      return;
    }

    try {
      const rec = new SpeechRec();
      recognitionRef.current = rec;
      rec.continuous = false;
      rec.interimResults = false;

      const langMap = {
        'hi': 'hi-IN',
        'kn': 'kn-IN',
        'ta': 'ta-IN',
        'en': 'en-US'
      };
      rec.lang = langMap[language] || 'en-US';

      rec.onstart = () => {
        setIsListening(true);
        setMicPermissionDenied(false);
      };

      rec.onresult = (evt) => {
        const transcript = evt.results[0][0].transcript;
        setSymptoms(prev => prev ? `${prev} ${transcript}` : transcript);
        setChatInput(transcript);
        setIsListening(false);
      };

      rec.onerror = (err) => {
        console.error("Speech recognition error:", err);
        if (err.error === 'not-allowed') setMicPermissionDenied(true);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.start();
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      setIsListening(false);
    }
  };

  const sendChatMessage = async (e) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;

    const userText = chatInput;
    setChatHistory(prev => [...prev, { sender: 'user', text: userText }]);
    setChatInput('');
    setIsAiProcessing(true);

    try {
      const resp = await axios.post(
        `${API_BASE}/api/assistant/chat`,
        { text: userText },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      const botReply = resp.data.response;
      setChatHistory(prev => [...prev, { sender: 'bot', text: botReply }]);
      
      setIsSpeaking(true);
      const speakResp = await axios.post(`${API_BASE}/api/assistant/speak`, { text: botReply });
      if (speakResp.data.audio_base64) {
        const audio = new Audio("data:audio/wav;base64," + speakResp.data.audio_base64);
        audio.play();
      }
      setIsSpeaking(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAiProcessing(false);
    }
  };

  // --- Location & Emergency API Services ---
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
            setCity(resp.data.address.city || resp.data.address.town || resp.data.address.suburb || 'Bengaluru');
          }
        } catch {
          // ignore
        }
        setLocLoading(false);
        fetchNearbyHospitals();
      },
      () => {
        setError("Unable to retrieve GPS coordinates.");
        setLocLoading(false);
      }
    );
  };

  const triggerEmergency = async () => {
    const currentLat = lat || 12.9716;
    const currentLon = lon || 77.5946;
    
    try {
      const resp = await axios.post(
        `${API_BASE}/api/emergency`,
        { lat: currentLat, lon: currentLon },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      alert(`⚠️ Emergency Alert Dispatched!\n${resp.data.message}`);
    } catch (err) {
      alert("⚠️ Emergency dispatch simulated. Coordinates: " + currentLat + ", " + currentLon);
    }
  };

  // --- Multimodal Image Analysis Pipeline (ONNX) ---
  const startCamera = async () => {
    setUseCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setCameraStream(stream);
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      console.error(err);
      setError("Unable to access camera device.");
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

  const runImageAnalysis = async (e) => {
    if (e) e.preventDefault();
    if (!image) return;

    setLoading(true);
    setLoadingStep('Validating skin presence & lighting...');
    setError(null);
    setValidationErrorType(null);
    setResult(null);

    const formData = new FormData();
    formData.append('image', image);
    formData.append('symptoms', symptoms || '');
    formData.append('language', language);
    if (lat) formData.append('lat', lat);
    if (lon) formData.append('lon', lon);
    if (city) formData.append('city', city);

    try {
      const resp = await axios.post(`${API_BASE}/api/predict`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(resp.data);
      if (resp.data.hospitals && resp.data.hospitals.length > 0) {
        setNearbyHospitals(resp.data.hospitals);
      }
    } catch (err) {
      const valData = err.response?.data?.detail;
      if (valData && typeof valData === 'object') {
        setValidationErrorType(valData.reason || 'unrelated');
      } else {
        setError(err.response?.data?.detail || "An unexpected error occurred during analysis.");
      }
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  const downloadPDFReport = async () => {
    if (!result) return;
    try {
      const pdfPayload = {
        disease: result.disease,
        confidence: result.confidence,
        severity: result.severity,
        symptoms: result.translated_symptoms || symptoms || 'No symptoms reported',
        language: language,
        original_image_b64: result.original_image,
        heatmap_image_b64: result.heatmap_image,
        hospitals: result.hospitals || nearbyHospitals || [],
        username: profile?.username || 'Guest User'
      };
      
      const resp = await axios.post(`${API_BASE}/api/export-pdf`, pdfPayload, {
        responseType: 'blob'
      });
      
      const fileUrl = window.URL.createObjectURL(new Blob([resp.data]));
      const fileLink = document.createElement('a');
      fileLink.href = fileUrl;
      fileLink.setAttribute('download', `CareVoice_Clinical_Report_${new Date().toISOString().slice(0,10)}.pdf`);
      document.body.appendChild(fileLink);
      fileLink.click();
      document.body.removeChild(fileLink);
    } catch (err) {
      alert("Failed to compile or download PDF Report.");
    }
  };

  const resetScannerState = () => {
    setImage(null);
    setImagePreview(null);
    setResult(null);
    setError(null);
    setValidationErrorType(null);
  };

  // Slider Mouse/Touch events for Heatmap compare
  const handleSliderMouse = (e) => {
    if (!sliderContainerRef.current) return;
    const rect = sliderContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    setSliderPosition((x / rect.width) * 100);
  };

  const handleSliderTouch = (e) => {
    if (!sliderContainerRef.current) return;
    const rect = sliderContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.touches[0].clientX - rect.left, rect.width));
    setSliderPosition((x / rect.width) * 100);
  };

  return (
    <div className="min-h-screen pb-28 text-slate-800 dark:text-slate-100 transition-colors duration-300">
      
      {/* Hidden Canvas for Photo Capture */}
      <canvas ref={canvasRef} className="hidden"></canvas>

      {/* PREMIUM HEADER */}
      <header className="sticky top-0 z-40 backdrop-blur-lg bg-white/70 dark:bg-slate-950/70 py-4 px-6 flex justify-between items-center border-b border-pink-100/10">
        <div className="text-left cursor-pointer" onClick={() => setActiveTab('home')}>
          <h1 className="text-lg font-black uppercase tracking-wider text-slate-900 dark:text-white leading-none">CareVoice</h1>
          <span className="text-[10px] text-pink-500 font-bold uppercase tracking-widest block mt-1">Your Voice, Your Care</span>
        </div>
        <div className="flex items-center gap-3">
          
          {/* Multilingual Selector dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 border border-pink-100/10 px-2.5 py-1.5 rounded-full text-xs">
            <Globe className="w-3.5 h-3.5 text-pink-500" />
            <select 
              value={language} 
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-transparent text-slate-650 dark:text-slate-200 outline-none font-bold text-[10px] cursor-pointer"
            >
              <option value="en">EN</option>
              <option value="hi">हिंदी (HI)</option>
              <option value="kn">ಕನ್ನಡ (KN)</option>
              <option value="ta">தமிழ் (TA)</option>
            </select>
          </div>

          <button 
            onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
            className="p-2.5 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 active:scale-95 border border-pink-100/10"
            title="Toggle Theme"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
          
          {token ? (
            <button 
              onClick={handleLogout}
              className="p-2.5 rounded-full bg-slate-100 dark:bg-slate-900 text-red-500 active:scale-95 border border-pink-100/10"
              title="Logout Profile"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          ) : (
            <button 
              onClick={() => setShowAuthModal(true)}
              className="px-3 py-1.5 bg-pink-600 hover:bg-pink-700 text-white rounded-full text-[10px] font-bold flex items-center gap-1 shadow"
            >
              <LogIn className="w-3.5 h-3.5" /> {translateUi('sign_in')}
            </button>
          )}
        </div>
      </header>

      {/* Main Viewport Container */}
      <main className="max-w-md mx-auto px-5 py-6 space-y-6">

        {/* MOCKUP LOADER */}
        {loading && (
          <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-6 text-center animate-fade-in">
            <div className="mock-card max-w-sm w-full shadow-2xl flex flex-col items-center animate-scale-in dark:bg-slate-950">
              <div className="relative aspect-square w-64 rounded-3xl overflow-hidden border border-pink-500/20 bg-slate-900 mb-6">
                {imagePreview && <img src={imagePreview} alt="Target" className="w-full h-full object-cover" />}
                <div className="scanner-laser"></div>
              </div>
              <h3 className="text-base font-extrabold uppercase tracking-widest text-slate-800 dark:text-slate-100">CareVoice AI</h3>
              <p className="text-xs text-pink-500 font-mono mt-1 font-bold animate-pulse">{loadingStep || 'Analyzing Image...'}</p>
            </div>
          </div>
        )}

        {/* AUTHENTICATION POPUP MODAL */}
        {showAuthModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-5 animate-fade-in">
            <div className="mock-card max-w-sm w-full p-6 space-y-4 shadow-2xl dark:bg-slate-950 border border-pink-500/30 text-left animate-scale-in">
              <div className="flex justify-between items-center border-b border-pink-100/10 pb-3">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-pink-500">
                  {authMode === 'login' ? 'Sign In to CareVoice' : 'Create CareVoice Account'}
                </h3>
                <button onClick={() => setShowAuthModal(false)} className="p-1 rounded-full text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAuth} className="space-y-3.5 text-xs">
                {authMode === 'register' && (
                  <div className="space-y-1">
                    <label className="font-bold text-slate-400">Email Address</label>
                    <input 
                      type="email" required value={authEmail} onChange={(e) => setAuthEmail(e.target.value)}
                      className="w-full border border-slate-800 rounded-xl p-2.5 bg-slate-900 text-slate-100 outline-none"
                    />
                  </div>
                )}
                
                <div className="space-y-1">
                  <label className="font-bold text-slate-400">Username</label>
                  <input 
                    type="text" required value={authUsername} onChange={(e) => setAuthUsername(e.target.value)}
                    className="w-full border border-slate-800 rounded-xl p-2.5 bg-slate-900 text-slate-100 outline-none"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="font-bold text-slate-400">Password</label>
                  <input 
                    type="password" required value={authPassword} onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full border border-slate-800 rounded-xl p-2.5 bg-slate-900 text-slate-100 outline-none"
                  />
                </div>
                
                {authError && <div className="text-red-500 font-bold">{authError}</div>}
                
                <button 
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-pink-500 to-indigo-600 text-white font-extrabold rounded-xl shadow-md uppercase tracking-wider"
                >
                  {authMode === 'login' ? 'Sign In' : 'Register Account'}
                </button>
              </form>
              
              <div className="text-center text-[10px] text-slate-400 pt-1">
                {authMode === 'login' ? (
                  <span>Don't have an account? <button type="button" onClick={() => setAuthMode('register')} className="text-pink-500 font-bold underline">Register here</button></span>
                ) : (
                  <span>Already registered? <button type="button" onClick={() => setAuthMode('login')} className="text-pink-500 font-bold underline">Login here</button></span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* APPOINTMENT BOOKING MODAL */}
        {selectedHospitalForBooking && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-5 animate-fade-in">
            <div className="mock-card max-w-sm w-full p-6 space-y-4 shadow-2xl dark:bg-slate-950 border border-pink-500/30 text-left animate-scale-in">
              <div className="flex justify-between items-start border-b border-pink-100/10 pb-3">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-pink-500 block">Schedule Consultation</span>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white leading-snug">{selectedHospitalForBooking.name}</h3>
                </div>
                <button onClick={() => setSelectedHospitalForBooking(null)} className="p-1 rounded-full text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {bookingSuccessMsg ? (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center space-y-2">
                  <Check className="w-8 h-8 text-emerald-500 mx-auto" />
                  <p className="text-xs font-bold text-emerald-500">{bookingSuccessMsg}</p>
                </div>
              ) : (
                <form onSubmit={handleBookAppointment} className="space-y-4 text-xs">
                  <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold block">Assigned Doctor:</span>
                    <span className="font-extrabold text-pink-400 text-xs block">{selectedHospitalForBooking.specialist || "Dermatology Specialist"}</span>
                    <span className="text-[10px] text-slate-500 block">Timing: {selectedHospitalForBooking.hours}</span>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-400 block">{translateUi('select_date')}</label>
                    <input 
                      type="date" 
                      required 
                      value={bookingDate} 
                      onChange={(e) => setBookingDate(e.target.value)}
                      className="w-full border border-slate-800 rounded-xl p-2.5 bg-slate-900 text-slate-100 outline-none font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-400 block">{translateUi('select_slot')}</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(selectedHospitalForBooking.available_slots || ["09:30 AM", "11:00 AM", "02:30 PM", "04:00 PM"]).map(slot => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setBookingSlot(slot)}
                          className={`py-2 px-2.5 rounded-xl text-[11px] font-bold border transition-all ${
                            bookingSlot === slot 
                              ? 'bg-pink-600 border-pink-500 text-white shadow-md' 
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <Clock className="w-3 h-3 inline mr-1" /> {slot}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-400 block">Optional Symptoms Note</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Skin rash, itchy spot consultation"
                      value={bookingNotes}
                      onChange={(e) => setBookingNotes(e.target.value)}
                      className="w-full border border-slate-800 rounded-xl p-2.5 bg-slate-900 text-slate-100 outline-none text-xs"
                    />
                  </div>

                  <button 
                    type="submit" 
                    disabled={bookingLoading}
                    className="w-full py-3 bg-gradient-to-r from-pink-500 to-indigo-600 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider shadow-md hover:opacity-90"
                  >
                    {bookingLoading ? 'Confirming...' : 'Confirm Appointment'}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* PAGE 1: HOME/DASHBOARD */}
        {activeTab === 'home' && (
          <div className="space-y-6 animate-fade-in text-left">
            
            {/* HERO ASSISTANT PROFILE CARD */}
            <div className="bg-gradient-to-r from-pink-500/10 to-indigo-500/10 border border-pink-500/20 dark:border-purple-950/40 rounded-[2rem] p-5 shadow-lg relative overflow-hidden animate-pulse-glow">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white flex items-center justify-center text-xl shadow-md">
                    🔥
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest block">{translateUi('welcome')}</h3>
                    <span className="text-[11px] text-slate-400 font-bold block mt-0.5">{profile?.username || translateUi('guest_user')}</span>
                  </div>
                </div>
                <button 
                  onClick={() => setActiveTab('chat')}
                  className="px-4 py-2 bg-gradient-to-r from-pink-500 to-indigo-600 text-white rounded-xl text-[10px] font-bold shadow-md"
                >
                  {translateUi('talk_ai')}
                </button>
              </div>
            </div>

            {/* QUICK ACTIONS ROW: HOSPITAL CLINICS & SKIN SCANNER */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setActiveTab('location')}
                className="p-4 bg-slate-900 border border-slate-800 hover:border-pink-500/40 rounded-2xl text-left space-y-1 shadow transition-all"
              >
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-2">
                  <MapPin className="w-4 h-4" />
                </div>
                <span className="font-extrabold text-xs text-slate-200 block">Care Connect</span>
                <span className="text-[10px] text-slate-400 block">Clinics & Timings</span>
              </button>

              <button
                onClick={() => setActiveTab('chat')}
                className="p-4 bg-slate-900 border border-slate-800 hover:border-pink-500/40 rounded-2xl text-left space-y-1 shadow transition-all"
              >
                <div className="w-8 h-8 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center mb-2">
                  <Camera className="w-4 h-4" />
                </div>
                <span className="font-extrabold text-xs text-slate-200 block">Skin Scanner</span>
                <span className="text-[10px] text-slate-400 block">AI Photo Analysis</span>
              </button>
            </div>

            {/* 1. SKIN DIARY TRENDS & SIDE-BY-SIDE COMPARE */}
            <div className="mock-card p-5 space-y-4">
              <h3 className="text-xs font-extrabold uppercase text-pink-500 tracking-wider block border-b border-pink-100/10 pb-2">
                📊 {translateUi('skin_diary')}
              </h3>

              {history.length > 0 ? (
                <div className="space-y-5">
                  
                  {/* Side-by-side compare: Baseline vs Latest */}
                  {history.length >= 2 && (
                    <div className="space-y-2">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">{translateUi('baseline_compare')}</span>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <div className="aspect-square rounded-2xl overflow-hidden border border-slate-800 bg-slate-900">
                            <img src={history[history.length - 1].image} alt="baseline" className="w-full h-full object-cover" />
                          </div>
                          <span className="text-[9px] font-bold text-slate-400 block text-center">Baseline ({history[history.length - 1].date})</span>
                        </div>
                        <div className="space-y-1">
                          <div className="aspect-square rounded-2xl overflow-hidden border border-pink-500/20 bg-slate-900">
                            <img src={history[0].image} alt="latest" className="w-full h-full object-cover" />
                          </div>
                          <span className="text-[9px] font-bold text-pink-500 block text-center">Latest ({history[0].date})</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SVG Trend Graph */}
                  <div className="space-y-2">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">{translateUi('trend_graph')}</span>
                    <div className="w-full h-24 bg-slate-950 rounded-2xl p-2 border border-slate-900 flex flex-col justify-end">
                      <svg className="w-full h-16" viewBox="0 0 100 20">
                        <polyline
                          fill="none"
                          stroke="#ec4899"
                          strokeWidth="2.5"
                          points={history.slice(0, 5).reverse().map((h, idx) => {
                            const total = h.pimple_count + h.dark_spot_count;
                            const x = (idx / Math.max(1, history.slice(0, 5).length - 1)) * 90 + 5;
                            const y = 18 - Math.min(16, (total / 15) * 16);
                            return `${x},${y}`;
                          }).join(' ')}
                        />
                        {history.slice(0, 5).reverse().map((h, idx) => {
                          const total = h.pimple_count + h.dark_spot_count;
                          const x = (idx / Math.max(1, history.slice(0, 5).length - 1)) * 90 + 5;
                          const y = 18 - Math.min(16, (total / 15) * 16);
                          return (
                            <circle key={idx} cx={x} cy={y} r="2.5" fill="#f43f5e" className="animate-pulse" />
                          );
                        })}
                      </svg>
                      <div className="flex justify-between text-[8px] text-slate-500 font-bold mt-1.5 px-1.5">
                        <span>{history[Math.min(4, history.length - 1)].date}</span>
                        <span>{history[0].date}</span>
                      </div>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="text-[10px] text-slate-500 italic text-center py-2">
                  No skin scans logged yet. Start scanning your skin to map progress trends.
                </div>
              )}
            </div>

            {/* NEARBY CLINIC SCHEDULES SUMMARY */}
            <div className="mock-card p-5 space-y-3">
              <div className="flex justify-between items-center border-b border-pink-100/10 pb-2">
                <span className="text-xs font-extrabold uppercase text-pink-500 tracking-wider block">🏥 {translateUi('hospital_schedules')}</span>
                <button onClick={() => setActiveTab('location')} className="text-[10px] text-indigo-400 font-bold underline">View All on Map</button>
              </div>
              <div className="space-y-2">
                {nearbyHospitals.slice(0, 2).map((h, idx) => (
                  <div key={idx} className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex justify-between items-center text-xs">
                    <div>
                      <span className="font-extrabold text-slate-200 block">{h.name}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{h.hours} • {h.distance}</span>
                    </div>
                    <button
                      onClick={() => { setSelectedHospitalForBooking(h); }}
                      className="px-2.5 py-1 bg-pink-600 text-white rounded-lg text-[10px] font-bold shadow"
                    >
                      Book
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* MY BOOKED APPOINTMENTS SUMMARY */}
            {appointments.length > 0 && (
              <div className="mock-card p-5 space-y-3">
                <div className="flex justify-between items-center border-b border-pink-100/10 pb-2">
                  <span className="text-xs font-extrabold uppercase text-pink-500 tracking-wider block">📅 {translateUi('my_appointments')}</span>
                  <button onClick={() => setActiveTab('location')} className="text-[10px] text-indigo-400 font-bold underline">Manage</button>
                </div>
                <div className="space-y-2">
                  {appointments.slice(0, 2).map(appt => (
                    <div key={appt.id} className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex justify-between items-center text-xs">
                      <div>
                        <span className="font-extrabold text-slate-200 block">{appt.hospital_name}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">{appt.doctor_name} • {appt.appointment_date} at {appt.appointment_time}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {appt.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TODAY'S MEDICINE REMINDERS */}
            <div className="mock-card p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-pink-100/10 pb-2">
                <span className="text-xs font-extrabold uppercase text-pink-500 tracking-wider block">💊 {translateUi('today_meds')}</span>
                <button onClick={() => setActiveTab('reminders')} className="text-[10px] text-indigo-400 font-bold underline">Manage</button>
              </div>
              {reminders.length > 0 ? (
                <div className="space-y-2.5">
                  {reminders.map((r) => (
                    <div key={r.id} className="p-3 bg-slate-100 dark:bg-slate-950 border border-pink-100/10 rounded-xl flex justify-between items-center">
                      <div>
                        <span className="font-extrabold text-xs text-slate-800 dark:text-slate-250 block">{r.name}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">{r.dosage} • Time: {r.reminder_time}</span>
                      </div>
                      <span className="text-[10px] font-black uppercase text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">{r.status}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[10px] text-slate-500 italic text-center py-2">No active reminders registered for today.</div>
              )}
            </div>

            {/* EMERGENCY CALLING PROTOCOL */}
            <div className="mock-card p-5 border-l-4 border-l-red-500 space-y-3">
              <h4 className="text-xs font-extrabold uppercase text-red-500 tracking-wider flex items-center gap-1">
                <ShieldAlert className="w-4 h-4 text-red-500" /> {translateUi('emergency')}
              </h4>
              <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                Experiencing severe acute symptoms? Immediately click the button below to dispatch coordinates to healthcare assistance systems.
              </p>
              <div className="flex gap-2">
                <button 
                  onClick={triggerEmergency} 
                  className="flex-grow py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[10px] font-bold text-center uppercase tracking-widest shadow-md"
                >
                  🚨 Send Emergency SOS
                </button>
                <a 
                  href="tel:911"
                  className="px-4 py-2.5 bg-slate-950 border border-slate-800 text-red-500 rounded-xl text-[10px] font-bold flex items-center justify-center"
                >
                  📞 Call 911
                </a>
              </div>
            </div>

          </div>
        )}

        {/* PAGE 2: CHATBOT / AI SYMPTOM ANALYZER */}
        {activeTab === 'chat' && (
          <div className="space-y-6 animate-fade-in text-left">
            
            {/* OPTIONAL MULTIMODAL SKIN SCANNER GATE */}
            {!imagePreview && !result && !validationErrorType && (
              <div className="mock-card p-4 flex flex-col gap-3 relative">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-pink-500 tracking-wider">🔬 {translateUi('optional_scanner')}</span>
                  <span className="text-[9px] bg-pink-500/10 text-pink-500 font-bold px-2 py-0.5 rounded-full uppercase">{translateUi('optional_badge')}</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-normal">
                  {translateUi('scanner_desc')}
                </p>
                <div className="flex gap-2">
                  <label className="flex-grow py-2.5 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-300 rounded-xl text-[10px] font-bold text-center cursor-pointer flex items-center justify-center">
                    <Upload className="w-3.5 h-3.5 mr-1 text-pink-500" /> Upload Skin Photo
                    <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                  </label>
                  <button type="button" onClick={startCamera} className="py-2.5 px-4 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-[10px] font-bold flex items-center gap-1">
                    <Camera className="w-3.5 h-3.5" /> Use Camera
                  </button>
                </div>
              </div>
            )}

            {/* Image Camera Viewport */}
            {useCamera && (
              <div className="relative aspect-square bg-slate-950 rounded-[2rem] overflow-hidden border border-pink-500/20">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover"></video>
                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3 px-4">
                  <button type="button" onClick={capturePhoto} className="px-5 py-2.5 bg-pink-600 text-white text-xs font-bold rounded-xl shadow-md">
                    Capture Photo
                  </button>
                  <button type="button" onClick={() => { setUseCamera(false); stopCamera(); }} className="px-4 py-2.5 bg-slate-800 text-white text-xs font-bold rounded-xl">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Image Preview & Optional Symptoms Box (Text + Mic) */}
            {imagePreview && !result && !validationErrorType && (
              <div className="mock-card p-4 space-y-4">
                <div className="aspect-square rounded-2xl overflow-hidden bg-slate-900 relative">
                  <img src={imagePreview} alt="target" className="w-full h-full object-cover" />
                  <button onClick={resetScannerState} className="absolute top-3 right-3 p-1.5 bg-slate-950/80 rounded-full text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                {/* OPTIONAL SYMPTOMS INPUT WITH TEXT & MULTILINGUAL MIC */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <label className="font-extrabold uppercase text-pink-500 text-[10px]">
                      Optional Symptoms Note ({translateUi('optional_badge')})
                    </label>
                    {symptoms && (
                      <button type="button" onClick={() => setSymptoms('')} className="text-[9px] text-slate-400 hover:text-red-400">
                        Clear
                      </button>
                    )}
                  </div>

                  <div className="relative">
                    <textarea
                      rows={2}
                      value={symptoms}
                      onChange={(e) => { setSymptoms(e.target.value); setChatInput(e.target.value); }}
                      placeholder={translateUi('voice_placeholder')}
                      className="w-full border border-slate-800 rounded-xl p-3 pr-10 bg-slate-950 text-slate-100 outline-none text-xs focus:border-pink-500"
                    ></textarea>
                    
                    <button
                      type="button"
                      onClick={triggerVoiceListen}
                      title="Click to speak symptoms"
                      className={`absolute right-2.5 bottom-3.5 p-2 rounded-lg border transition-all ${
                        isListening 
                          ? 'bg-red-500 border-red-500 text-white animate-pulse' 
                          : 'bg-slate-900 border-slate-800 text-pink-500 hover:bg-slate-850'
                      }`}
                    >
                      <Mic className="w-4 h-4" />
                    </button>
                  </div>

                  {isListening && (
                    <div className="p-2 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center justify-between text-[10px] text-red-400 font-bold animate-pulse">
                      <span>🎙️ {translateUi('listening_voice')}</span>
                      <span className="text-[9px] uppercase px-1.5 py-0.5 bg-red-500/20 rounded">Active</span>
                    </div>
                  )}
                </div>

                <button 
                  onClick={runImageAnalysis}
                  className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-indigo-600 text-white font-extrabold rounded-xl text-xs uppercase tracking-widest shadow-md"
                >
                  {translateUi('run_analysis')}
                </button>
              </div>
            )}

            {/* Skin Analysis Results */}
            {result && (
              <div className="mock-card p-6 border-l-4 border-l-pink-500 space-y-5">
                
                <div className="flex justify-between items-center border-b border-pink-100/10 pb-3">
                  <div>
                    <span className="text-[9px] text-pink-500 uppercase font-black tracking-widest block">AI Target Match</span>
                    <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-wider">{result.disease}</h3>
                  </div>
                  <button onClick={resetScannerState} className="p-1 bg-slate-100 dark:bg-slate-950 rounded-full text-slate-400">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex justify-between items-center text-xs font-bold bg-slate-100 dark:bg-slate-950 px-4 py-3 rounded-2xl">
                  <span className="text-slate-500">System Confidence:</span>
                  <span className="text-slate-800 dark:text-slate-100">{(result.confidence * 100).toFixed(1)}%</span>
                </div>

                {/* Severity Analysis with progress color gauge & explanation */}
                <div className="space-y-2 border-b border-pink-100/10 pb-3">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-500">Severity:</span>
                    <span className={`uppercase px-2 py-0.5 rounded-full text-[10px] font-black ${
                      result.severity === 'Mild' ? 'text-emerald-500 bg-emerald-500/10' :
                      result.severity === 'Moderate' ? 'text-amber-500 bg-amber-500/10' :
                      'text-rose-500 bg-rose-500/10'
                    }`}>{result.severity}</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${
                      result.severity === 'Mild' ? 'bg-emerald-500' :
                      result.severity === 'Moderate' ? 'bg-amber-500' :
                      'bg-rose-500'
                    }`} style={{ width: `${(result.severity_confidence || 0.8) * 100}%` }}></div>
                  </div>
                  {result.severity_explanation && (
                    <p className="text-[10px] text-slate-400 italic leading-relaxed">
                      ℹ️ {result.severity_explanation}
                    </p>
                  )}
                </div>

                {/* Skin Observation Counts */}
                {result.lesion_analysis && (
                  <div className="space-y-2 border-b border-pink-100/10 pb-3">
                    <span className="text-xs font-extrabold uppercase text-pink-500 tracking-wider block">🔬 Skin Observations</span>
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-semibold text-slate-400">
                      <div className="p-2 bg-slate-950 border border-slate-900 rounded-xl">
                        🔴 Acne Pimples: <span className="text-rose-500 font-bold">{result.lesion_analysis.pimple_count}</span>
                      </div>
                      <div className="p-2 bg-slate-950 border border-slate-900 rounded-xl">
                        🔵 Dark Spots: <span className="text-blue-500 font-bold">{result.lesion_analysis.dark_spot_count}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Original image with coordinates overlay */}
                <div className="space-y-3">
                  <span className="text-xs font-extrabold uppercase text-pink-500 tracking-wider block">Observed Lesion Markers</span>
                  <div className="relative aspect-square w-full rounded-3xl overflow-hidden border border-pink-500/10 bg-slate-900">
                    <img src={result.original_image} alt="original" className="w-full h-full object-cover" />
                    
                    {result.lesion_analysis?.pimple_coords?.map((c, idx) => (
                      <div 
                        key={`p-${idx}`}
                        className="absolute w-5 h-5 rounded-full border-2 border-red-500 bg-red-500/20 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center text-[7px] text-white font-extrabold"
                        style={{ left: `${(c.x / 224) * 100}%`, top: `${(c.y / 224) * 100}%` }}
                      >
                        P
                      </div>
                    ))}

                    {result.lesion_analysis?.dark_spot_coords?.map((c, idx) => (
                      <div 
                        key={`d-${idx}`}
                        className="absolute w-5 h-5 rounded-full border-2 border-blue-500 bg-blue-500/20 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center text-[7px] text-white font-extrabold"
                        style={{ left: `${(c.x / 224) * 100}%`, top: `${(c.y / 224) * 100}%` }}
                      >
                        S
                      </div>
                    ))}
                  </div>
                </div>

                {/* Grad-CAM Comparer slider */}
                <div className="space-y-3">
                  <span className="text-xs font-extrabold uppercase text-pink-500 tracking-wider block">Grad-CAM Explanation Heatmap</span>
                  <div ref={sliderContainerRef} onMouseDown={handleSliderMouse} onTouchStart={handleSliderTouch} className="relative aspect-square w-full rounded-3xl overflow-hidden cursor-ew-resize">
                    <img src={result.overlay_image} alt="cam" className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
                    <div className="absolute inset-0 overflow-hidden border-r border-amber-500" style={{ width: `${sliderPosition}%` }}>
                      <img src={result.original_image} alt="orig" className="absolute inset-0 w-full h-full object-cover pointer-events-none" style={{ width: sliderContainerRef.current ? sliderContainerRef.current.clientWidth : '100%' }} />
                    </div>
                  </div>
                </div>

                {/* Clinical Recommendations */}
                <div className="space-y-2 text-xs text-slate-500 leading-relaxed pt-2">
                  <p className="font-bold text-slate-350">Care Guidelines & Recommendations:</p>
                  {result.recommendations?.map((rec, idx) => (
                    <div key={idx} className="flex gap-1.5">
                      <span className="text-pink-500 font-extrabold">•</span>
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>

                {/* Nearby Hospital Quick Action */}
                {result.hospitals && result.hospitals.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-900 text-left">
                    <span className="text-xs font-extrabold uppercase text-pink-500 tracking-wider block">Nearby Specialists for this condition</span>
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex justify-between items-center">
                      <div>
                        <span className="font-extrabold text-xs text-slate-200 block">{result.hospitals[0].name}</span>
                        <span className="text-[10px] text-slate-400 block">{result.hospitals[0].hours} • {result.hospitals[0].distance}</span>
                      </div>
                      <button
                        onClick={() => setSelectedHospitalForBooking(result.hospitals[0])}
                        className="px-3 py-1.5 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-[10px] font-bold shadow"
                      >
                        {translateUi('book_appointment')}
                      </button>
                    </div>
                  </div>
                )}

                {/* Download Report button */}
                <div className="pt-2 border-t border-slate-900">
                  <button 
                    onClick={downloadPDFReport}
                    className="w-full py-3 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-slate-200 flex items-center justify-center gap-1.5 shadow"
                  >
                    <Download className="w-4 h-4 text-pink-500" /> Download PDF Clinical Report
                  </button>
                </div>

              </div>
            )}

            {/* Validation errors */}
            {validationErrorType && (
              <div className="mock-card p-6 border-l-4 border-l-red-500 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-base font-bold text-red-500 uppercase">{validationErrorType === 'quality' ? 'RETAKE IMAGE' : 'INVALID IMAGE'}</h3>
                  <button onClick={resetScannerState} className="text-slate-400"><X className="w-5 h-5" /></button>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                  {validationErrorType === 'quality' 
                    ? 'Image Quality Too Low — Please retake/upload a clearer image.' 
                    : 'Invalid Image — Please upload a skin image.'}
                </p>
              </div>
            )}

            {/* CHATBOT DIALOG CONVERSATION BOX WITH VOICE SUPPORT */}
            <div className="mock-card p-4 space-y-4 flex flex-col h-[320px] justify-between">
              <div className="flex-grow overflow-y-auto space-y-3 custom-scrollbar pr-1 text-xs">
                {chatHistory.map((chat, idx) => (
                  <div key={idx} className={`flex ${chat.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`p-3 max-w-[80%] rounded-2xl font-semibold leading-relaxed ${
                      chat.sender === 'user' 
                        ? 'bg-pink-600 text-white rounded-br-none' 
                        : 'bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-200 rounded-bl-none'
                    }`}>
                      {chat.text}
                    </div>
                  </div>
                ))}
              </div>

              {/* Input form panel */}
              <form onSubmit={sendChatMessage} className="border-t border-slate-900 pt-3 flex gap-2">
                <input 
                  type="text" value={chatInput} onChange={(e) => { setChatInput(e.target.value); setSymptoms(e.target.value); }}
                  placeholder={translateUi('voice_placeholder')}
                  className="flex-grow border border-slate-800 rounded-xl px-3 py-2 bg-slate-950 text-slate-100 text-xs outline-none focus:border-pink-500"
                />
                <button 
                  type="button" 
                  onClick={triggerVoiceListen} 
                  title="Speak symptoms in selected language"
                  className={`p-2.5 rounded-xl border transition-all ${
                    isListening ? 'bg-red-500 border-red-500 text-white animate-pulse' : 'bg-slate-950 border-slate-800 text-pink-500 hover:bg-slate-900'
                  }`}
                >
                  <Mic className="w-4 h-4" />
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-pink-600 text-white rounded-xl text-xs font-bold"
                >
                  Send
                </button>
              </form>
            </div>

          </div>
        )}

        {/* PAGE 3: MEDICINES & REMINDERS */}
        {activeTab === 'reminders' && (
          <div className="space-y-6 animate-fade-in text-left">
            
            {/* Register New Medicine Reminder */}
            <div className="mock-card p-5 space-y-4">
              <h3 className="text-xs font-extrabold uppercase text-pink-500 tracking-wider block border-b border-pink-100/10 pb-2">
                {translateUi('save_medicine')}
              </h3>
              
              <form onSubmit={handleAddMedicine} className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Medicine Name</label>
                  <input 
                    type="text" required value={newMedName} onChange={(e) => setNewMedName(e.target.value)}
                    placeholder="e.g. Paracetamol"
                    className="w-full border border-slate-800 rounded-xl p-2.5 bg-slate-950 text-slate-100 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Dosage details</label>
                  <input 
                    type="text" required value={newMedDosage} onChange={(e) => setNewMedDosage(e.target.value)}
                    placeholder="e.g. 1 tablet (500mg)"
                    className="w-full border border-slate-800 rounded-xl p-2.5 bg-slate-950 text-slate-100 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Schedule Time</label>
                  <input 
                    type="text" required value={newMedTime} onChange={(e) => setNewMedTime(e.target.value)}
                    placeholder="e.g. 08:00 AM"
                    className="w-full border border-slate-800 rounded-xl p-2.5 bg-slate-950 text-slate-100 outline-none"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-indigo-600 text-white font-extrabold rounded-xl"
                >
                  Save Medicine
                </button>
              </form>
            </div>

            {/* Medicines List */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold uppercase text-slate-700 dark:text-slate-350 tracking-wider">{translateUi('registered_meds')}</h4>
              {medicines.length > 0 ? (
                <div className="space-y-2.5">
                  {medicines.map((med) => (
                    <div key={med.id} className="p-3.5 bg-white/50 dark:bg-slate-950 border border-pink-100/10 rounded-2xl flex justify-between items-center">
                      <div>
                        <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200 block">{med.name}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">Dosage: {med.dosage} • Every day at {med.schedule_time}</span>
                      </div>
                      <button 
                        onClick={() => handleDeleteMedicine(med.id)}
                        className="p-2 bg-red-500/10 text-red-500 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 bg-slate-950 border border-slate-900 rounded-3xl text-center text-[10px] text-slate-500">
                  No medicines registered. Register a medicine to track schedule.
                </div>
              )}
            </div>

          </div>
        )}

        {/* PAGE 4: MEDICAL REPORTS */}
        {activeTab === 'reports' && (
          <div className="space-y-6 animate-fade-in text-left">
            
            {/* Upload Report form */}
            <div className="mock-card p-5 space-y-4">
              <h3 className="text-xs font-extrabold uppercase text-pink-500 tracking-wider block border-b border-pink-100/10 pb-2">
                Upload Health Report
              </h3>
              
              <form onSubmit={handleUploadReport} className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Report Title</label>
                  <input 
                    type="text" required value={reportTitle} onChange={(e) => setReportTitle(e.target.value)}
                    placeholder="e.g. Lab Blood Test August"
                    className="w-full border border-slate-800 rounded-xl p-2.5 bg-slate-950 text-slate-100 outline-none"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Choose File</label>
                  <input 
                    type="file" required onChange={(e) => setReportFile(e.target.files[0])}
                    className="w-full text-xs text-slate-350 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-pink-500/15 file:text-pink-500 file:font-bold file:cursor-pointer"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-indigo-600 text-white font-extrabold rounded-xl"
                >
                  Upload File
                </button>
              </form>
            </div>

            {/* Reports History */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold uppercase text-slate-700 dark:text-slate-350 tracking-wider">{translateUi('reports_portal')}</h4>
              {reports.length > 0 ? (
                <div className="space-y-2.5">
                  {reports.map((rep) => (
                    <div key={rep.id} className="p-3.5 bg-white/50 dark:bg-slate-950 border border-pink-100/10 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-3 text-left">
                        <div className="w-10 h-10 rounded-xl bg-pink-500/10 text-pink-500 flex items-center justify-center">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200 block">{rep.title}</span>
                          <span className="text-[9px] text-slate-450 block mt-0.5">{rep.file_name} • uploaded {rep.uploaded_at?.split('T')[0]}</span>
                        </div>
                      </div>
                      <a 
                        href={API_BASE + rep.file_url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="p-2 bg-slate-100 dark:bg-slate-900 border border-slate-800 rounded-lg text-pink-500"
                        title="Download Report"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 bg-slate-950 border border-slate-900 rounded-3xl text-center text-[10px] text-slate-500">
                  No medical reports uploaded yet.
                </div>
              )}
            </div>

          </div>
        )}

        {/* PAGE 5: LOCATION MAPPING, HOSPITAL TIMINGS & APPOINTMENT BOOKING */}
        {activeTab === 'location' && (
          <div className="space-y-6 animate-fade-in text-left">
            <div className="flex flex-col gap-1 border-b border-pink-100/10 pb-3">
              <h2 className="text-xl font-bold font-serif text-slate-900 dark:text-white">Care Connect</h2>
              <p className="text-slate-500 text-xs">Locate specialty clinics, verify opening timings, and book dermatologist appointment slots.</p>
            </div>

            {/* MY BOOKED APPOINTMENTS LIST */}
            {appointments.length > 0 && (
              <div className="mock-card p-5 space-y-3">
                <h3 className="text-xs font-extrabold uppercase text-pink-500 tracking-wider block border-b border-pink-100/10 pb-2">
                  📅 {translateUi('my_appointments')} ({appointments.length})
                </h3>
                <div className="space-y-2.5">
                  {appointments.map(appt => (
                    <div key={appt.id} className="p-3.5 bg-slate-950 border border-slate-850 rounded-2xl flex justify-between items-center">
                      <div className="space-y-0.5">
                        <span className="font-bold text-xs text-slate-200 block">{appt.hospital_name}</span>
                        <span className="text-[10px] text-pink-400 font-semibold block">{appt.doctor_name}</span>
                        <span className="text-[10px] text-slate-400 block">
                          <Clock className="w-3 h-3 inline mr-1 text-slate-500" /> {appt.appointment_date} at {appt.appointment_time}
                        </span>
                        {appt.patient_symptoms && (
                          <span className="text-[9px] text-slate-500 italic block">Note: {appt.patient_symptoms}</span>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {appt.status}
                        </span>
                        <button
                          onClick={() => handleCancelAppointment(appt.id)}
                          className="text-[9px] text-red-400 hover:text-red-300 font-bold underline"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SEARCH & GPS CONTROLS */}
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
                  {locLoading ? translateUi('gps_locking') : locSuccess ? translateUi('gps_locked') : translateUi('gps')}
                </button>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Or enter city"
                  className="w-1/2 border border-slate-800 rounded-xl px-3 py-2.5 text-xs bg-slate-950 text-slate-100 outline-none"
                />
              </div>

              {/* Leaflet Live Map Viewport */}
              <div className="h-[200px] rounded-[2rem] overflow-hidden border border-slate-800 shadow-inner">
                <div ref={mapContainerRef} className="w-full h-full bg-stone-100"></div>
              </div>

              {/* NEARBY HOSPITALS LIST WITH TIMINGS & BOOKING BUTTONS */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-extrabold uppercase text-pink-500 tracking-wider">
                  🏥 {translateUi('hospital_schedules')} ({nearbyHospitals.length})
                </h3>

                {nearbyHospitals.map((h, idx) => (
                  <div key={idx} className="p-4 bg-slate-950 border border-slate-850 rounded-2xl space-y-2.5 shadow-sm">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className="font-extrabold text-xs text-slate-200 block leading-snug">{h.name}</span>
                        {h.address && <span className="text-[9px] text-slate-400 block mt-0.5">{h.address}</span>}
                      </div>
                      <span className="text-[9px] font-black text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded-full flex-shrink-0 uppercase">{h.distance}</span>
                    </div>

                    {/* Specialist and Ratings row */}
                    <div className="flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-900 pt-2">
                      <span className="font-semibold text-pink-400">🩺 {h.specialist || "Specialist on Duty"}</span>
                      <span>★ {h.rating} Rating</span>
                    </div>

                    {/* Timing Schedule details */}
                    <div className="p-2 bg-slate-900/60 border border-slate-850 rounded-xl space-y-1 text-[10px]">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400"><Clock className="w-3 h-3 inline mr-1 text-slate-500" /> Timing Schedule:</span>
                        <span className="text-emerald-400 font-bold">{h.status || "Open Now"}</span>
                      </div>
                      <span className="text-slate-300 font-semibold block">{h.hours || "Mon-Sat: 09:00 AM – 06:30 PM"}</span>
                    </div>

                    {/* Available Slots Preview */}
                    {h.available_slots && (
                      <div className="space-y-1">
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Available Booking Slots:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {h.available_slots.slice(0, 4).map((slot, sIdx) => (
                            <span key={sIdx} className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded-md text-[9px] font-semibold text-slate-300">
                              {slot}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons: Book, Call, Directions */}
                    <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-900">
                      <button
                        type="button"
                        onClick={() => setSelectedHospitalForBooking(h)}
                        className="py-2 bg-gradient-to-r from-pink-500 to-indigo-600 text-white rounded-xl text-[10px] font-bold text-center uppercase tracking-wider shadow"
                      >
                        📅 Book
                      </button>
                      <a
                        href={`tel:${h.phone || '+918026701150'}`}
                        className="py-2 border border-slate-800 hover:bg-slate-900 rounded-xl text-[10px] font-bold text-center text-slate-300 flex items-center justify-center gap-1"
                      >
                        <Phone className="w-3 h-3 text-pink-500" /> Call
                      </a>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lon}`}
                        target="_blank"
                        rel="noreferrer"
                        className="py-2 border border-slate-800 hover:bg-slate-900 rounded-xl text-[10px] font-bold text-center text-slate-300 flex items-center justify-center gap-1"
                      >
                        <Navigation className="w-3 h-3 text-pink-500" /> Map
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MOCKUP FLOATING NAVIGATION PILL BAR */}
        <footer className="fixed bottom-6 left-0 right-0 z-45">
          <div className="nav-pill">
            {[
              { id: 'home', icon: <Home className="w-5.5 h-5.5" />, color: 'text-pink-500' },
              { id: 'chat', icon: <MessageSquare className="w-5.5 h-5.5" />, color: 'text-pink-500' },
              { id: 'reminders', icon: <Activity className="w-5.5 h-5.5" />, color: 'text-pink-500' },
              { id: 'reports', icon: <FileText className="w-5.5 h-5.5" />, color: 'text-pink-500' },
              { id: 'location', icon: <MapPin className="w-5.5 h-5.5" />, color: 'text-pink-500' }
            ].map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); resetScannerState(); }}
                  className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
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

      </main>

    </div>
  );
}
