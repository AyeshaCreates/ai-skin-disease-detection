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
  ArrowLeft
} from 'lucide-react';
import SpeechRecorder from './components/SpeechRecorder';

import { API_BASE } from './config';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
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
  
  // Explainable AI visual tabs
  const [xaiTab, setXaiTab] = useState('overlay');
  
  // System Metrics State
  const [metrics, setMetrics] = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mapContainerRef = useRef(null);
  const leafletMapRef = useRef(null);

  // Load Model Metrics on mount
  useEffect(() => {
    fetchMetrics();
  }, []);

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
        // Reverse geocode to get city name
        axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`, {
          headers: { 'User-Agent': 'AISkinDiseaseDetectionSystemProject/1.0' }
        }).then(res => {
          if (res.data && res.data.address) {
            const cityVal = res.data.address.city || res.data.address.town || res.data.address.village || '';
            setCity(cityVal);
          }
        }).catch(err => console.error("Reverse geocoding failed:", err));
      },
      (err) => {
        console.error("Location error:", err);
        setError("Location permission denied. Please search by city name.");
        setLocLoading(false);
      },
      { timeout: 8000 }
    );
  };

  // Image handlers
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
      setUseCamera(false);
      stopCamera();
    }
  };

  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // Web Camera handlers
  const startCamera = async () => {
    setUseCamera(true);
    setImage(null);
    setImagePreview(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access failed:", err);
      setError("Could not access camera. Please upload an image instead.");
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
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob((blob) => {
        const file = new File([blob], "captured_photo.jpg", { type: "image/jpeg" });
        setImage(file);
        setImagePreview(URL.createObjectURL(file));
        stopCamera();
        setUseCamera(false);
      }, "image/jpeg");
    }
  };

  // Main Diagnosis trigger
  const runDiagnosticAnalysis = async (e) => {
    e.preventDefault();
    if (!image) {
      setError("Please upload or capture an image of the skin condition first.");
      return;
    }
    if (!symptoms.trim()) {
      setError("Please describe the symptoms (by typing or speaking).");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const steps = [
      "Translating input symptoms internally...",
      "Extracting convolutional features using EfficientNetB0...",
      "Encoding symptoms using Multilingual Transformer...",
      "Fusing multimodal feature vectors...",
      "Generating disease and severity predictions...",
      "Calculating Grad-CAM heatmap overlays..."
    ];

    let stepIdx = 0;
    setLoadingStep(steps[stepIdx]);
    const stepInterval = setInterval(() => {
      if (stepIdx < steps.length - 1) {
        stepIdx++;
        setLoadingStep(steps[stepIdx]);
      }
    }, 1500);

    const formData = new FormData();
    formData.append('image', image);
    formData.append('symptoms', symptoms);
    formData.append('language', language);
    if (lat !== null) formData.append('lat', lat);
    if (lon !== null) formData.append('lon', lon);
    if (city.trim() !== '') formData.append('city', city);

    try {
      const resp = await axios.post(`${API_BASE}/api/predict`, formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Bypass-Tunnel-Reminder': 'true'
        }
      });
      
      clearInterval(stepInterval);
      setResult(resp.data);
      setActiveTab('results');
      
      // Update coordinates from backend geocoding if we only entered a city
      if (resp.data.location) {
        setLat(resp.data.location.lat);
        setLon(resp.data.location.lon);
        setCity(resp.data.location.city || city);
      }
    } catch (err) {
      clearInterval(stepInterval);
      console.error(err);
      setError(err.response?.data?.detail || "An error occurred during diagnostic classification. Please retry.");
    } finally {
      setLoading(false);
    }
  };

  // Export PDF trigger
  const downloadReport = async () => {
    if (!result) return;
    try {
      const resp = await axios.post(
        `${API_BASE}/api/export-pdf`, 
        {
          disease: result.disease,
          confidence: result.confidence,
          severity: result.severity,
          symptoms: result.translated_symptoms,
          language: language,
          original_image_b64: result.original_image,
          heatmap_image_b64: result.heatmap_image,
          hospitals: result.hospitals
        },
        { 
          responseType: 'blob',
          headers: { 'Bypass-Tunnel-Reminder': 'true' }
        }
      );
      
      const file = new Blob([resp.data], { type: 'application/pdf' });
      const fileURL = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = fileURL;
      link.setAttribute('download', `Skin_Analysis_Report_${result.disease.replace(/\s+/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      alert("Failed to download PDF report. Please verify connection and try again.");
    }
  };

  // Dynamically initialize Leaflet map
  useEffect(() => {
    if (activeTab === 'hospitals' && result && result.hospitals && mapContainerRef.current) {
      // Load Leaflet dynamically via CDN scripts if not already loaded to avoid bundling issues
      const loadLeaflet = () => {
        if (window.L) {
          initMap();
        } else {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
          script.crossOrigin = '';
          script.onload = initMap;
          document.head.appendChild(script);
        }
      };

      const initMap = () => {
        const L = window.L;
        if (!L) return;

        // Destroy existing map instance
        if (leafletMapRef.current) {
          leafletMapRef.current.remove();
        }

        const mapLat = lat || 12.9716;
        const mapLon = lon || 77.5946;

        const map = L.map(mapContainerRef.current).setView([mapLat, mapLon], 13);
        leafletMapRef.current = map;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        // Marker for user's location
        L.marker([mapLat, mapLon], {
          icon: L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color: #1E3A8A; width: 14px; height: 14px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3)"></div>`,
            iconSize: [14, 14],
            iconAnchor: [7, 7]
          })
        }).addTo(map).bindPopup("Your Location").openPopup();

        // Markers for hospitals
        result.hospitals.forEach((h, idx) => {
          if (h.lat && h.lon) {
            L.marker([h.lat, h.lon]).addTo(map)
              .bindPopup(`<b>${h.name}</b><br>Distance: ${h.distance}<br>${h.phone !== 'N/A' ? 'Phone: ' + h.phone : ''}`);
          }
        });
      };

      loadLeaflet();
    }

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [activeTab, result, lat, lon]);

  // Clean up stream on unmount
  useEffect(() => {
    return () => stopCamera();
  }, [cameraStream]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header Navigation */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('home')}>
              <div className="p-2.5 bg-gradient-to-r from-amber-500 to-yellow-600 rounded-2xl text-slate-950 shadow-md shadow-amber-600/25">
                <Activity className="w-6 h-6 animate-pulse-slow text-white" />
              </div>
              <div>
                <span className="text-2xl font-serif font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-800 block leading-none">DERMASCAN</span>
                <span className="text-[9px] uppercase font-bold tracking-widest text-slate-500 font-sans mt-1 block">Premium Multi-Modal AI</span>
              </div>
            </div>
            
            <nav className="hidden md:flex items-center gap-2">
              <button 
                onClick={() => setActiveTab('home')} 
                className={`nav-link ${activeTab === 'home' ? 'nav-link-active' : 'nav-link-inactive'}`}
              >
                Home
              </button>
              <button 
                onClick={() => { setActiveTab('diagnosis'); setError(null); }} 
                className={`nav-link ${activeTab === 'diagnosis' ? 'nav-link-active' : 'nav-link-inactive'}`}
              >
                Diagnosis
              </button>
              <button 
                onClick={() => { if(result) setActiveTab('results'); }} 
                disabled={!result}
                className={`nav-link ${activeTab === 'results' ? 'nav-link-active' : 'nav-link-inactive'} disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                Results
              </button>
              <button 
                onClick={() => { if(result) setActiveTab('hospitals'); }} 
                disabled={!result}
                className={`nav-link ${activeTab === 'hospitals' ? 'nav-link-active' : 'nav-link-inactive'} disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                Nearby Hospitals
              </button>
              <button 
                onClick={() => setActiveTab('about')} 
                className={`nav-link ${activeTab === 'about' ? 'nav-link-active' : 'nav-link-inactive'}`}
              >
                About Project
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-800 animate-slide-up">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-grow">
              <h4 className="font-semibold text-sm">System Alert</h4>
              <p className="text-sm mt-0.5">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 text-xs font-semibold px-2 py-1 bg-red-100 rounded-lg">Dismiss</button>
          </div>
        )}

        {/* LOADING STATE COVER */}
        {loading && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="glass-card max-w-md w-full p-8 text-center flex flex-col items-center shadow-2xl border-white animate-scale-in">
              <div className="p-4 bg-medical-navy/10 rounded-full text-medical-navy mb-4 animate-spin-slow">
                <Activity className="w-10 h-10 animate-pulse" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Running Multi-Modal Analysis</h3>
              <p className="text-slate-500 text-sm mt-1">Please keep this browser window open. Our neural network pipelines are fusing features.</p>
              
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-6 mb-4">
                <div className="bg-medical-navy h-full w-2/3 rounded-full animate-[progress_3s_infinite_ease-in-out]"></div>
              </div>
              
              <div className="flex items-center gap-2 text-xs font-semibold text-medical-teal uppercase tracking-wider bg-medical-teal/10 px-3.5 py-1.5 rounded-full">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>{loadingStep}</span>
              </div>
            </div>
          </div>
        )}

        {/* 1. HOME TAB */}
        {activeTab === 'home' && (
          <div className="space-y-12 animate-fade-in">
            {/* Hero Section */}
            <div className="text-center py-10 max-w-3xl mx-auto space-y-4">
              <span className="text-xs font-bold uppercase tracking-widest text-medical-teal bg-medical-teal/10 px-4 py-1.5 rounded-full">Final Year Engineering Project</span>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 font-sans tracking-tight leading-tight">
                AI Skin Disease Detection using Multi-Modal Artificial Intelligence
              </h1>
              <p className="text-slate-600 text-base sm:text-lg max-w-xl mx-auto">
                A clinically-guided deep learning system that fuses dermoscopic visual features with multilingual symptom analysis (English, Hindi, Kannada) for diagnostic reporting.
              </p>
              <div className="pt-6 flex justify-center gap-4">
                <button onClick={() => { setActiveTab('diagnosis'); setError(null); }} className="btn-primary flex items-center gap-2">
                  Start Diagnostics
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button onClick={() => setActiveTab('about')} className="btn-secondary">
                  System Architecture
                </button>
              </div>
            </div>

            {/* Architecture Highlights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glass-card p-6 flex flex-col gap-4 border-slate-100 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="p-3 bg-blue-50 text-medical-navy w-fit rounded-2xl">
                  <Upload className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-950">Image Processing (CNN)</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Utilizes a fine-tuned EfficientNetB0 backbone that extracts deep visual features from lesion images. Incorporates Grad-CAM backpropagation to highlights pathological regions.
                </p>
              </div>
              <div className="glass-card p-6 flex flex-col gap-4 border-slate-100 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="p-3 bg-teal-50 text-medical-teal w-fit rounded-2xl">
                  <SpeechRecorder language="en" onTranscript={()=>{}} disabled={true} />
                </div>
                <h3 className="text-lg font-bold text-slate-950">Symptom Processing (NLP)</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Processes user symptoms in English, Hindi, and Kannada. Maps statements into a 384-dimensional dense vector space using a MiniLM multilingual transformer.
                </p>
              </div>
              <div className="glass-card p-6 flex flex-col gap-4 border-slate-100 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="p-3 bg-emerald-50 text-medical-emerald w-fit rounded-2xl">
                  <Activity className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-950">Multi-Modal Fusion</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Fuses the image convolutional vectors and dense NLP symptom embeddings. Feeds the combined representations into a joint neural classifier predicting diagnosis and severity.
                </p>
              </div>
            </div>

            {/* Project Specs */}
            <div className="glass-card p-8 border-slate-200/50">
              <h3 className="text-xl font-bold text-slate-900 mb-6">Diagnostic Range & Covered Dermatoses</h3>
              <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
                {[
                  "Melanoma (Cancerous)", 
                  "Melanocytic Nevus (Mole)", 
                  "Atopic Dermatitis (Eczema)", 
                  "Seborrheic Keratosis", 
                  "Acne Vulgaris",
                  "Basal Cell Carcinoma (Cancerous)",
                  "Psoriasis (Inflammatory)"
                ].map((disease, idx) => (
                  <div key={idx} className="bg-slate-100/50 border border-slate-200/30 p-4 rounded-xl text-center">
                    <span className="block text-xs font-bold text-medical-teal mb-1">Class 0{idx+1}</span>
                    <span className="text-sm font-semibold text-slate-800">{disease}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 2. DIAGNOSIS FORM TAB */}
        {activeTab === 'diagnosis' && (
          <form onSubmit={runDiagnosticAnalysis} className="max-w-4xl mx-auto space-y-8 animate-fade-in">
            <div className="flex flex-col gap-2">
              <h2 className="text-2xl font-bold text-slate-950">Diagnostic Analysis Console</h2>
              <p className="text-slate-500 text-sm">Please provide a high-resolution skin photograph and symptom inputs below.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column: Image Upload */}
              <div className="glass-card p-6 flex flex-col gap-5">
                <label className="text-sm font-bold text-slate-800">1. Upload Skin Lesion Image</label>
                
                {useCamera ? (
                  <div className="relative aspect-square bg-slate-900 rounded-2xl overflow-hidden border border-slate-800">
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover"></video>
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3 px-4">
                      <button type="button" onClick={capturePhoto} className="btn-primary bg-emerald-500 hover:bg-emerald-600 flex items-center gap-2 py-2">
                        <Camera className="w-4 h-4" /> Capture Photo
                      </button>
                      <button type="button" onClick={() => { setUseCamera(false); stopCamera(); }} className="btn-secondary bg-slate-800 text-white border-0 hover:bg-slate-700 py-2">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : imagePreview ? (
                  <div className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 shadow-inner group">
                    <img src={imagePreview} alt="Uploaded Skin Lesion" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-200">
                      <button 
                        type="button" 
                        onClick={() => { setImage(null); setImagePreview(null); }} 
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold"
                      >
                        Remove Photo
                      </button>
                    </div>
                  </div>
                ) : (
                  <div 
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className="aspect-square bg-slate-100 border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center p-6 text-center group cursor-pointer hover:bg-slate-50 hover:border-medical-navy transition-all duration-300"
                  >
                    <div className="p-4 bg-white rounded-full text-slate-400 group-hover:text-medical-navy shadow-sm group-hover:scale-110 transition-all duration-300 mb-3">
                      <Upload className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-bold text-slate-800">Drag & Drop Image Here</span>
                    <span className="text-xs text-slate-500 mt-1">Supports PNG, JPG, JPEG up to 10MB</span>
                    
                    <div className="mt-6 flex gap-3">
                      <label className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold shadow-sm cursor-pointer">
                        Browse Files
                        <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                      </label>
                      <button type="button" onClick={startCamera} className="px-4 py-2 bg-medical-navy text-white hover:bg-blue-900 rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5" />
                        Use Camera
                      </button>
                    </div>
                  </div>
                )}
                <canvas ref={canvasRef} className="hidden"></canvas>
              </div>

              {/* Right Column: Symptoms & Location */}
              <div className="flex flex-col gap-6">
                {/* Language Select */}
                <div className="glass-card p-6 flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-bold text-slate-800">2. Input Language & Symptoms</label>
                    <select 
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="text-xs font-bold border border-slate-200 rounded-lg p-2 bg-slate-50 text-slate-800 outline-none focus:border-medical-navy cursor-pointer"
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
                        ? "Describe your symptoms (e.g. A mole that is changing size, itchy skin, redness...)" 
                        : language === 'hi' 
                        ? "अपने लक्षणों का वर्णन करें (जैसे: आकार बदलता हुआ तिल, त्वचा पर खुजली, लाली...)"
                        : "ನಿಮ್ಮ ರೋಗಲಕ್ಷಣಗಳನ್ನು ವಿವರಿಸಿ (ಉದಾಹರಣೆಗೆ: ಗಾತ್ರ ಬದಲಾಗುತ್ತಿರುವ ಮಚ್ಚೆ, ಚರ್ಮದ ತುರಿಕೆ, ಕೆಂಪು ದದ್ದುಗಳು...)"
                    }
                    className="w-full border border-slate-200 rounded-xl p-3.5 text-sm bg-slate-50 outline-none focus:border-medical-navy focus:bg-white resize-none"
                  ></textarea>

                  <SpeechRecorder 
                    language={language} 
                    onTranscript={(text) => setSymptoms(prev => prev ? `${prev} ${text}` : text)}
                    disabled={loading}
                  />
                </div>

                {/* Location Detection */}
                <div className="glass-card p-6 flex flex-col gap-4">
                  <label className="text-sm font-bold text-slate-800">3. Hospital Geolocation Routing</label>
                  
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={detectLocation}
                      disabled={locLoading}
                      className={`flex-grow flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold border ${
                        locSuccess 
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <MapPin className={`w-4 h-4 ${locSuccess ? 'text-emerald-600' : 'text-slate-400'}`} />
                      {locLoading ? "Locating..." : locSuccess ? "GPS Location Locked" : "Detect Current Location"}
                    </button>
                    
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Or search city (e.g. Mysore, Delhi)"
                      className="w-1/2 border border-slate-200 rounded-xl px-3 py-2.5 text-xs bg-slate-50 outline-none focus:border-medical-navy focus:bg-white font-medium text-slate-800"
                    />
                  </div>
                  
                  {locSuccess && lat && lon && (
                    <div className="text-[10px] font-bold text-emerald-600 uppercase flex items-center gap-1">
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
                className="btn-primary w-full sm:w-80 flex items-center justify-center gap-2 py-4 shadow-lg shadow-blue-900/10"
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900">Diagnostic Summary Analysis</h2>
                <p className="text-slate-500 text-sm">Patient reports: "{result.translated_symptoms}"</p>
              </div>
              <div className="flex gap-2">
                <button onClick={downloadReport} className="btn-primary bg-emerald-600 hover:bg-emerald-700 flex items-center gap-2 py-2.5 text-sm">
                  <Download className="w-4 h-4" /> Download PDF Report
                </button>
                <button onClick={() => { setActiveTab('diagnosis'); setError(null); }} className="btn-secondary flex items-center gap-2 py-2.5 text-sm">
                  <ArrowLeft className="w-4 h-4" /> Back to Diagnosis
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left & Middle Column: Core Results */}
              <div className="lg:col-span-2 space-y-8">
                
                {/* Disease, Confidence, Severity Panel */}
                <div className="glass-card p-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
                  
                  {/* Disease */}
                  <div className="flex flex-col justify-between p-4 bg-slate-50 rounded-xl border border-slate-200/30">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Classification</span>
                    <h3 className="text-xl font-bold text-medical-navy mt-2 leading-tight">{result.disease}</h3>
                    <p className="text-[10px] text-slate-400 font-semibold mt-1">Multi-Modal Prediction</p>
                  </div>

                  {/* Confidence */}
                  <div className="flex flex-col justify-between p-4 bg-slate-50 rounded-xl border border-slate-200/30">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">System Confidence</span>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold text-slate-900">{Math.round(result.confidence * 100)}</span>
                      <span className="text-sm font-bold text-slate-500">%</span>
                    </div>
                    {/* Confidence Indicator Bar */}
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-3">
                      <div 
                        className={`h-full rounded-full ${
                          result.confidence >= 0.75 
                            ? 'bg-emerald-500' 
                            : result.confidence >= 0.40 
                            ? 'bg-amber-500' 
                            : 'bg-red-500'
                        }`} 
                        style={{ width: `${result.confidence * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Severity */}
                  <div className="flex flex-col justify-between p-4 bg-slate-50 rounded-xl border border-slate-200/30">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Clinical Severity</span>
                    <div className="mt-2 flex items-center gap-2">
                      <div 
                        className={`w-3.5 h-3.5 rounded-full ${
                          result.severity === 'Mild' 
                            ? 'bg-emerald-500 shadow-emerald-200' 
                            : result.severity === 'Moderate' 
                            ? 'bg-amber-500 shadow-amber-200' 
                            : 'bg-red-500 shadow-red-200'
                        } shadow-lg`}
                      ></div>
                      <span className="text-xl font-bold text-slate-900">{result.severity}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-semibold mt-1">Calculated via Joint Fusion</p>
                  </div>
                </div>

                {/* Clinical Explanations & Precautions */}
                <div className="glass-card p-8 space-y-6">
                  <div>
                    <h4 className="text-lg font-bold text-slate-950 flex items-center gap-2 border-b border-slate-100 pb-3">
                      <Info className="w-5 h-5 text-medical-teal" />
                      Clinical Definition & Details
                    </h4>
                    <p className="text-sm text-slate-600 leading-relaxed mt-3">{result.explanation}</p>
                  </div>

                  <div>
                    <h4 className="text-lg font-bold text-slate-950 flex items-center gap-2 border-b border-slate-100 pb-3">
                      <ShieldAlert className="w-5 h-5 text-medical-navy" />
                      System Guidelines & Action Plan
                    </h4>
                    <div className="mt-4 space-y-3">
                      {result.recommendations.map((rec, idx) => (
                        <div key={idx} className="flex gap-2.5 text-sm text-slate-600">
                          <span className="text-medical-teal font-extrabold flex-shrink-0 mt-0.5">•</span>
                          <span className="leading-relaxed">{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Visual Explanations (Grad-CAM Heatmap) */}
              <div className="glass-card p-6 flex flex-col gap-6">
                <div className="flex flex-col gap-1 border-b border-slate-100 pb-3">
                  <h4 className="text-lg font-bold text-slate-950 flex items-center gap-2">
                    <Map className="w-5 h-5 text-medical-navy" />
                    Explainable AI (Grad-CAM)
                  </h4>
                  <p className="text-xs text-slate-500">Visualization highlights which region of the lesion most influenced the AI's classification.</p>
                </div>

                {/* Photo Viewer */}
                <div className="aspect-square bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-inner flex items-center justify-center">
                  <img 
                    src={
                      xaiTab === 'overlay' 
                        ? result.overlay_image 
                        : xaiTab === 'heatmap' 
                        ? result.heatmap_image 
                        : result.original_image
                    } 
                    alt="Visualization" 
                    className="w-full h-full object-cover" 
                  />
                </div>

                {/* Visualizer Tabs */}
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  {['original', 'heatmap', 'overlay'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setXaiTab(tab)}
                      className={`flex-grow py-2 text-xs font-bold rounded-lg uppercase tracking-wider transition-all duration-200 ${
                        xaiTab === tab 
                          ? 'bg-white text-medical-navy shadow-sm' 
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <div className="text-xs bg-slate-50 border border-slate-200/50 p-4 rounded-xl text-slate-600 leading-relaxed">
                  <strong>How to interpret:</strong> Warm colors (red, orange) represent areas the neural network focused on to classify the skin lesion as <em>{result.disease}</em>. Green and blue regions represent background skin features ignored by the classifier head.
                </div>
              </div>
            </div>

            {/* Quick Link to Nearby Hospitals */}
            <div className="glass-card p-6 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gradient-to-r from-medical-navy/5 to-medical-teal/5 border-medical-navy/10">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-medical-navy/10 text-medical-navy rounded-xl">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">Need immediate in-person dermatological consult?</h4>
                  <p className="text-xs text-slate-500">We have resolved {result.hospitals.length} specialty centers near your detected coordinates.</p>
                </div>
              </div>
              <button 
                onClick={() => setActiveTab('hospitals')}
                className="btn-primary py-2.5 text-xs flex items-center gap-1.5"
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
            <div className="border-b border-slate-200 pb-5">
              <h2 className="text-2xl font-extrabold text-slate-900">Hospital Geolocation Routing</h2>
              <p className="text-slate-500 text-sm">Showing nearby clinics or hospitals with dermatology departments near {city || "your coordinates"}.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* List of Hospitals */}
              <div className="lg:col-span-1 flex flex-col gap-4 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
                {result.hospitals.map((h, idx) => (
                  <div key={idx} className="glass-card p-5 border-slate-200/50 flex flex-col gap-3 shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-bold text-slate-900 text-sm leading-snug">{h.name}</h4>
                      <span className="bg-medical-teal/10 text-medical-teal text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 uppercase">{h.distance}</span>
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
                      className="btn-secondary w-full text-center py-2 text-xs flex items-center justify-center gap-1.5"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      Get Directions
                    </a>
                  </div>
                ))}
              </div>

              {/* Map View */}
              <div className="lg:col-span-2 h-[500px] relative rounded-2xl overflow-hidden border border-slate-200 shadow-md">
                <div ref={mapContainerRef} className="w-full h-full bg-slate-100"></div>
              </div>
            </div>
          </div>
        )}

        {/* 5. ABOUT PROJECT TAB */}
        {activeTab === 'about' && (
          <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
            <div className="border-b border-slate-200 pb-5 text-center sm:text-left">
              <h2 className="text-2xl font-extrabold text-slate-900">Project Specifications & Evaluation Metrics</h2>
              <p className="text-slate-500 text-sm">AI Skin Disease Detection System using Multi-Modal Artificial Intelligence</p>
            </div>

            {/* AI Architecture Spec */}
            <div className="glass-card p-8 space-y-6">
              <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">Unified Multi-Modal Pipeline</h3>
              <div className="flex flex-col gap-4 text-sm text-slate-600 leading-relaxed">
                <p>
                  This project presents a multi-modal artificial intelligence approach for skin disease classification. 
                  It separately processes a **skin lesion photo** (visual channel) and **typed or spoken patient symptoms** (linguistic channel), 
                  fuses the extracted features into a shared representation space, and applies a joint classification head to output the diagnostic results.
                </p>
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 py-8">
                  <div className="text-center bg-white p-4 rounded-xl shadow-sm border border-slate-200/50 w-44">
                    <span className="block text-xs font-bold text-slate-400 mb-1">Image Model</span>
                    <span className="font-semibold text-slate-800">EfficientNet-B0 (CNN)</span>
                    <span className="block text-[10px] text-slate-500 mt-1">1280-dim feature vector</span>
                  </div>
                  
                  <span className="text-slate-400 font-extrabold text-lg">+</span>
                  
                  <div className="text-center bg-white p-4 rounded-xl shadow-sm border border-slate-200/50 w-44">
                    <span className="block text-xs font-bold text-slate-400 mb-1">NLP Text Model</span>
                    <span className="font-semibold text-slate-800">MiniLM Transformer</span>
                    <span className="block text-[10px] text-slate-500 mt-1">384-dim embedding vector</span>
                  </div>
                  
                  <span className="text-slate-400 font-extrabold text-lg">→</span>
                  
                  <div className="text-center bg-medical-navy p-4 rounded-xl shadow-md text-white w-44">
                    <span className="block text-xs text-blue-200 mb-1 font-bold">Fusion Layer</span>
                    <span className="font-bold">Concat & FC Classification</span>
                    <span className="block text-[10px] text-blue-300 mt-1">1664-dim merged tensor</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Model Evaluation Metrics */}
            <div className="glass-card p-8 space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="text-lg font-bold text-slate-900">Neural Network Validation Metrics</h3>
                <button onClick={fetchMetrics} disabled={metricsLoading} className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100">
                  <RefreshCw className={`w-4 h-4 ${metricsLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {metricsLoading ? (
                <div className="py-12 flex justify-center items-center text-slate-400">
                  <RefreshCw className="w-8 h-8 animate-spin" />
                  <span className="ml-2 font-semibold">Loading model metrics...</span>
                </div>
              ) : metrics ? (
                <div className="space-y-6">
                  {/* Cards metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/30 text-center">
                      <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Accuracy</span>
                      <span className="text-2xl font-extrabold text-medical-navy mt-1 block">{Math.round(metrics.accuracy * 1000) / 10}%</span>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/30 text-center">
                      <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Precision</span>
                      <span className="text-2xl font-extrabold text-medical-teal mt-1 block">{Math.round(metrics.precision * 1000) / 10}%</span>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/30 text-center">
                      <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Recall</span>
                      <span className="text-2xl font-extrabold text-amber-600 mt-1 block">{Math.round(metrics.recall * 1000) / 10}%</span>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/30 text-center">
                      <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">F1 Score</span>
                      <span className="text-2xl font-extrabold text-emerald-600 mt-1 block">{Math.round(metrics.f1_score * 1000) / 10}%</span>
                    </div>
                  </div>

                  {/* Confusion Matrix */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-slate-800 text-sm">Validation Confusion Matrix</h4>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/50 overflow-x-auto">
                      <table className="w-full text-center border-collapse">
                        <thead>
                          <tr>
                            <th className="p-2 border-b border-slate-200 text-xs font-bold text-slate-400 uppercase text-left">Actual \\ Predicted</th>
                            {metrics.classes.map((cls, idx) => (
                              <th key={idx} className="p-2 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase max-w-[80px] overflow-hidden text-ellipsis whitespace-nowrap" title={cls}>
                                {cls.split(" ")[0]}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {metrics.confusion_matrix.map((row, rIdx) => (
                            <tr key={rIdx}>
                              <td className="p-2 border-r border-slate-200 text-xs font-bold text-slate-700 text-left max-w-[120px] overflow-hidden text-ellipsis whitespace-nowrap" title={metrics.classes[rIdx]}>
                                {metrics.classes[rIdx].split(" ")[0]}
                              </td>
                              {row.map((val, cIdx) => (
                                <td 
                                  key={cIdx} 
                                  className="p-2 text-sm font-semibold border-b border-r border-slate-200"
                                  style={{
                                    backgroundColor: val > 0 
                                      ? `rgba(15, 118, 110, ${Math.min(0.1 + val * 0.15, 0.85)})`
                                      : 'transparent',
                                    color: val > 2 ? 'white' : '#1e293b'
                                  }}
                                >
                                  {val}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-slate-50 border border-slate-200/50 rounded-xl text-center text-slate-500 text-sm">
                  Metrics not compiled. Start diagnostic training to evaluate performance.
                </div>
              )}
            </div>
            
            {/* Academic Info */}
            <div className="text-center text-xs text-slate-400 font-semibold space-y-1">
              <p>Submitted as a Final Year Engineering Project for Bachelor of Engineering (B.E.) in Computer Science & Engineering.</p>
              <p>© 2026 Dermascan AI Project Team. Open Source Academic License.</p>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200/60 py-6 text-center text-xs text-slate-500 font-medium">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-medical-navy" />
            <span>AI Skin Disease Detection System Project Platform</span>
          </div>
          <div className="flex gap-4">
            <span className="hover:text-slate-800 cursor-pointer" onClick={() => setActiveTab('home')}>Home</span>
            <span className="hover:text-slate-800 cursor-pointer" onClick={() => { setActiveTab('diagnosis'); setError(null); }}>Diagnostics</span>
            <span className="hover:text-slate-800 cursor-pointer" onClick={() => setActiveTab('about')}>System Specs</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
