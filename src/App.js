import React, { useState, useRef, useEffect, useCallback } from 'react';
import { User, KeyRound, UploadCloud, GripVertical, Clock, PlayCircle, X, LogIn, Activity, ListVideo, ImageIcon, ChevronRight } from 'lucide-react';

// --- Main App Component ---
export default function App() {
  // --- State Management ---
  const [appStep, setAppStep] = useState('login'); // login, portalSetup, dashboard
  const [dashboardUser, setDashboardUser] = useState('');
  const [inputUser, setInputUser] = useState('');
  
  const [portalUser, setPortalUser] = useState('');
  const [portalPass, setPortalPass] = useState('');

  const [displayOptions, setDisplayOptions] = useState([]);
  const [selectedDisplay, setSelectedDisplay] = useState('');
  const [currentImageUrl, setCurrentImageUrl] = useState(null);

  const [images, setImages] = useState([]);
  const [interval, setInterval] = useState(30);
  const [cycle, setCycle] = useState(false);
  
  const [jobStatus, setJobStatus] = useState(null);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);

  const handleSelectDisplay = useCallback(async (displayValue, user, pass) => {
    setSelectedDisplay(displayValue);
    setCurrentImageUrl(null);
    if (!displayValue) return;
    try {
        const response = await fetch('https://my-uploader-backend.onrender.com/fetch-display-details', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user, password: pass, displayValue }),
        });
        const data = await response.json();
        if (data.imageUrl) setCurrentImageUrl(data.imageUrl);
    } catch (error) { console.error("Could not fetch display image", error); }
  }, []);

  const handleFetchDisplays = useCallback(async (user, pass, saveCredentials = false) => {
    setStatus('processing');
    setMessage('Logging in and fetching your displays...');
    try {
      const response = await fetch('https://my-uploader-backend.onrender.com/fetch-displays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, password: pass }),
      });
      const options = await response.json();
      if (!response.ok) throw new Error(options.message || 'Failed to fetch.');
      if (options.length === 0) { setStatus('error'); setMessage('No displays found for this user.'); return; }
      
      setDisplayOptions(options);
      await handleSelectDisplay(options[0].value, user, pass);
      
      if (saveCredentials) {
        const currentUser = localStorage.getItem('dashboardUser');
        localStorage.setItem(`${currentUser}_portalUser`, user);
        localStorage.setItem(`${currentUser}_portalPass`, pass);
        setAppStep('dashboard');
      }
      setStatus('idle');
      setMessage('');
    } catch (error) {
      setStatus('error');
      setMessage(error.message);
    }
  }, [handleSelectDisplay]);

  // Check for logged-in user on initial load
  useEffect(() => {
    const storedUser = localStorage.getItem('dashboardUser');
    if (storedUser) {
      setDashboardUser(storedUser);
      const storedPortalUser = localStorage.getItem(`${storedUser}_portalUser`);
      const storedPortalPass = localStorage.getItem(`${storedUser}_portalPass`);
      if (storedPortalUser && storedPortalPass) {
        setPortalUser(storedPortalUser);
        setPortalPass(storedPortalPass);
        // Directly fetch displays now that we have credentials
        handleFetchDisplays(storedPortalUser, storedPortalPass);
        setAppStep('dashboard');
      } else {
        setAppStep('portalSetup');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // This effect should only run once on mount

  // Effect to poll for job status
  useEffect(() => {
    if (appStep !== 'dashboard') return;
    const fetchStatus = async () => {
      try {
        const response = await fetch(`https://my-uploader-backend.onrender.com/job-status/${dashboardUser}`);
        if(response.ok) setJobStatus(await response.json());
        else setJobStatus(null);
      } catch (error) { console.error("Failed to fetch job status", error); }
    };
    fetchStatus();
    const intervalId = setInterval(fetchStatus, 10000);
    return () => clearInterval(intervalId);
  }, [appStep, dashboardUser]);

  // Effect to clean up image preview URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      images.forEach(image => URL.revokeObjectURL(image.preview));
    };
  }, [images]);

  const handleDashboardLogin = () => {
    if (inputUser) {
      localStorage.setItem('dashboardUser', inputUser);
      setDashboardUser(inputUser);
      setAppStep('portalSetup');
    }
  };

  const handleSavePortalCredentials = async () => {
    if (!portalUser || !portalPass) {
      setStatus('error');
      setMessage('Please enter portal credentials.');
      return;
    }
    await handleFetchDisplays(portalUser, portalPass, true);
  };

  const handleStartAutomation = async () => {
    if (!selectedDisplay || images.length === 0) {
      setStatus('error');
      setMessage('Please select a display and upload at least one image.');
      return;
    }
    setStatus('processing');
    setMessage('Submitting job to the server...');
    
    const formData = new FormData();
    formData.append('userId', dashboardUser);
    formData.append('portalUser', portalUser);
    formData.append('portalPass', portalPass);
    formData.append('interval', interval * 60);
    formData.append('cycle', cycle);
    formData.append('displayValue', selectedDisplay);
    images.forEach(img => formData.append('images', img.file));

    try {
        const response = await fetch('https://my-uploader-backend.onrender.com/create-job', {
            method: 'POST',
            body: formData,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        setStatus('success');
        setMessage(result.message);
    } catch (error) {
      setStatus('error');
      setMessage(`Job submission failed: ${error.message}`);
    }
  };

  const handleFileChange = (e) => {
    try {
      const files = Array.from(e.target.files);
      if (files.length === 0) return;

      const newImages = files.map(file => ({
        file,
        id: `${file.name}-${file.lastModified}-${file.size}`, // More stable ID
        preview: URL.createObjectURL(file)
      }));
      setImages(prev => [...prev, ...newImages]);
    } catch (error) {
      console.error("Error handling file change:", error);
      setStatus('error');
      setMessage('There was an error processing the selected files.');
    }
  };

  const removeImage = (id) => setImages(prev => prev.filter(image => image.id !== id));

  const handleDragSort = () => {
    let _images = [...images];
    const draggedItemContent = _images.splice(dragItem.current, 1)[0];
    if (!draggedItemContent) return;
    _images.splice(dragOverItem.current, 0, draggedItemContent);
    dragItem.current = null;
    dragOverItem.current = null;
    setImages(_images);
  };
  
  const renderContent = () => {
    if (appStep === 'login') {
      return (
        <div className="w-full max-w-sm mx-auto bg-white rounded-2xl shadow-xl p-8 space-y-6">
          <h1 className="text-2xl font-bold text-center text-slate-800">Dashboard Login</h1>
          <p className="text-center text-sm text-slate-500">Enter a username to create or access your automation dashboard.</p>
          <div>
            <label className="font-medium text-slate-700 block mb-1">Your Username</label>
            <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"/><input type="text" value={inputUser} onChange={e => setInputUser(e.target.value)} className="w-full pl-10 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"/></div>
          </div>
          <button onClick={handleDashboardLogin} className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center hover:bg-indigo-700">
            Login <LogIn className="ml-2 w-5 h-5"/>
          </button>
        </div>
      );
    }

    if (appStep === 'portalSetup') {
      return (
        <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-xl p-8 space-y-6">
          <h1 className="text-2xl font-bold text-center text-slate-800">Portal Setup</h1>
          <p className="text-center text-sm text-slate-500">Enter your C3DSS portal credentials. This is a one-time setup.</p>
          <div>
            <label className="font-medium text-slate-700 block mb-1">Portal Username</label>
            <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"/><input type="text" value={portalUser} onChange={e => setPortalUser(e.target.value)} className="w-full pl-10 p-3 border border-slate-300 rounded-lg"/></div>
          </div>
          <div>
            <label className="font-medium text-slate-700 block mb-1">Portal Password</label>
            <div className="relative"><KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"/><input type="password" value={portalPass} onChange={e => setPortalPass(e.target.value)} className="w-full pl-10 p-3 border border-slate-300 rounded-lg"/></div>
          </div>
          <button onClick={handleSavePortalCredentials} disabled={status === 'processing'} className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center hover:bg-indigo-700 disabled:bg-slate-400">
            {status === 'processing' ? 'Verifying...' : 'Save & Continue'} <ChevronRight className="ml-2 w-5 h-5"/>
          </button>
          {message && <p className="text-center text-sm font-medium text-red-600">{message}</p>}
        </div>
      );
    }

    if (appStep === 'dashboard') {
      return (
        <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-xl p-8 space-y-8">
          <header className="text-center">
            <h1 className="text-4xl font-bold text-slate-800">Automation Dashboard</h1>
            <p className="text-slate-500 mt-2">Welcome, {dashboardUser}</p>
          </header>

          <div className="p-4 border rounded-lg bg-slate-50">
            <h2 className="font-semibold text-slate-700 flex items-center"><Activity className="w-5 h-5 mr-2 text-slate-500"/>Current Job Status</h2>
            <div className="mt-2 text-center">
              {jobStatus ? (<><p className="text-lg font-bold text-indigo-600">{jobStatus.status.toUpperCase()}</p><p className="text-sm text-slate-600">{jobStatus.progress}</p></>) : (<p className="text-slate-500">No active job found.</p>)}
            </div>
          </div>

          {(!jobStatus || jobStatus.status === 'completed' || jobStatus.status === 'failed') ? (
          <>
            <div>
              <label className="font-medium text-slate-700 block mb-1">Select a Display</label>
              <div className="relative"><ListVideo className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"/><select value={selectedDisplay} onChange={(e) => handleSelectDisplay(e.target.value, portalUser, portalPass)} className="w-full pl-10 p-3 border border-slate-300 rounded-lg appearance-none bg-white">{displayOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.text}</option>)}</select></div>
            </div>

            <div className="p-4 border rounded-lg bg-slate-50">
              <h3 className="font-semibold text-slate-700 flex items-center"><ImageIcon className="w-5 h-5 mr-2 text-slate-500"/>Currently Displaying</h3>
              <div className="mt-2 h-40 flex items-center justify-center bg-slate-200 rounded">
                  {currentImageUrl ? <img src={currentImageUrl} alt="Current display" className="max-h-full max-w-full object-contain"/> : <p className="text-slate-500 text-sm">No image found.</p>}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-slate-700 flex items-center mb-4">Upload New Images</h2>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center bg-slate-50"><UploadCloud className="mx-auto h-12 w-12 text-slate-400" /><input type="file" multiple onChange={handleFileChange} id="file-upload" className="hidden" accept="image/*" /><label htmlFor="file-upload" className="mt-2 block text-sm font-medium text-indigo-600 cursor-pointer">Click to browse</label></div>
              <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
                {images && images.map((item, index) => {
                  if (!item || !item.file) return null; // Guard clause to prevent rendering errors
                  return (
                    <div key={item.id || index} draggable onDragStart={() => (dragItem.current = index)} onDragEnter={() => (dragOverItem.current = index)} onDragEnd={handleDragSort} onDragOver={(e) => e.preventDefault()} className="flex items-center p-2 bg-white border rounded-lg shadow-sm cursor-grab">
                      <GripVertical className="w-5 h-5 text-slate-400 mr-2" />
                      <img src={item.preview} alt="preview" className="w-12 h-12 rounded-md object-cover mr-4" />
                      <span className="flex-grow text-sm font-medium text-slate-700 truncate">{item.file.name}</span>
                      <button onClick={() => removeImage(item.id)} className="p-1 text-slate-400 hover:text-red-500 rounded-full"><X className="w-5 h-5" /></button>
                    </div>
                  )
                })}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-slate-700 flex items-center mb-4">Set Upload Interval</h2>
              <div className="flex items-center space-x-4"><Clock className="w-6 h-6 text-slate-500" /><input type="range" min="0" max="60" step="5" value={interval} onChange={(e) => setInterval(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg cursor-pointer" /><span className="font-bold text-indigo-600 text-lg w-28 text-center">{interval} minutes</span></div>
            </div>

            <div className="flex items-center justify-center">
              <input type="checkbox" id="cycle" checked={cycle} onChange={(e) => setCycle(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-indigo-600"/>
              <label htmlFor="cycle" className="ml-2 block text-sm text-gray-900">Cycle images (loop indefinitely)</label>
            </div>

            <button onClick={handleStartAutomation} disabled={status === 'processing'} className="w-full bg-green-600 text-white font-bold py-4 px-4 rounded-lg flex items-center justify-center hover:bg-green-700 disabled:bg-slate-400">
              {status === 'processing' ? 'Submitting...' : 'Create & Start New Job'} <PlayCircle className="ml-2"/>
            </button>
          </>
          ) : null}

          {message && (<p className={`text-center mt-4 text-sm font-medium ${status === 'error' ? 'text-red-600' : 'text-green-600'}`}>{message}</p>)}
        </div>
      );
    }
  }

  return (
    <div className="bg-slate-100 min-h-screen font-sans flex items-center justify-center p-4">
      {renderContent()}
    </div>
  );
}
