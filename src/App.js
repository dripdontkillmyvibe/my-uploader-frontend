import React, { useState, useRef, useEffect } from 'react';
import { User, KeyRound, UploadCloud, GripVertical, Clock, PlayCircle, X, LogIn, Server, Activity, Hourglass } from 'lucide-react';

// --- Main App Component ---
export default function App() {
  // --- State Management ---
  const [dashboardUser, setDashboardUser] = useState(localStorage.getItem('dashboardUser') || '');
  const [inputUser, setInputUser] = useState('');
  
  const [portalUser, setPortalUser] = useState('');
  const [portalPass, setPortalPass] = useState('');

  const [images, setImages] = useState([]);
  const [interval, setInterval] = useState(30);
  const [cycle, setCycle] = useState(false);
  
  const [jobStatus, setJobStatus] = useState(null);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);

  // Effect to poll for job status if user is logged in
  useEffect(() => {
    if (!dashboardUser) return;

    const fetchStatus = async () => {
      try {
        const response = await fetch(`https://my-uploader-backend.onrender.com/job-status/${dashboardUser}`);
        if(response.ok) {
          const data = await response.json();
          setJobStatus(data);
        } else {
          setJobStatus(null); // No job found
        }
      } catch (error) {
        console.error("Failed to fetch job status", error);
      }
    };

    fetchStatus(); // Fetch immediately on login
    const intervalId = setInterval(fetchStatus, 10000); // Poll every 10 seconds

    return () => clearInterval(intervalId);
  }, [dashboardUser]);

  const handleDashboardLogin = () => {
    if (inputUser) {
      localStorage.setItem('dashboardUser', inputUser);
      setDashboardUser(inputUser);
    }
  };

  const handleStartAutomation = async () => {
    if (!portalUser || !portalPass || images.length === 0) {
      setStatus('error');
      setMessage('Please fill in portal credentials and upload at least one image.');
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
    formData.append('displayValue', 'some-display-value'); // This needs to be dynamic again
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
        // The useEffect will now pick up the new job status on its next poll
    } catch (error) {
      setStatus('error');
      setMessage(`Job submission failed: ${error.message}`);
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const newImages = files.map(file => ({
      file, id: Math.random().toString(36).substring(2, 9), preview: URL.createObjectURL(file)
    }));
    setImages(prev => [...prev, ...newImages]);
  };

  const removeImage = (id) => setImages(prev => prev.filter(image => image.id !== id));

  const handleDragSort = () => {
    let _images = [...images];
    const draggedItemContent = _images.splice(dragItem.current, 1)[0];
    _images.splice(dragOverItem.current, 0, draggedItemContent);
    dragItem.current = null;
    dragOverItem.current = null;
    setImages(_images);
  };
  
  if (!dashboardUser) {
    return (
      <div className="bg-slate-100 min-h-screen font-sans flex items-center justify-center p-4">
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
      </div>
    );
  }

  return (
    <div className="bg-slate-100 min-h-screen font-sans flex items-center justify-center p-4">
      <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-xl p-8 space-y-8">
        <header className="text-center">
          <h1 className="text-4xl font-bold text-slate-800">Automation Dashboard</h1>
          <p className="text-slate-500 mt-2">Welcome, {dashboardUser}</p>
        </header>

        {/* --- Job Status Section --- */}
        <div className="p-4 border rounded-lg bg-slate-50">
          <h2 className="font-semibold text-slate-700 flex items-center"><Activity className="w-5 h-5 mr-2 text-slate-500"/>Current Job Status</h2>
          <div className="mt-2 text-center">
            {jobStatus ? (
              <>
                <p className="text-lg font-bold text-indigo-600">{jobStatus.status.toUpperCase()}</p>
                <p className="text-sm text-slate-600">{jobStatus.progress}</p>
              </>
            ) : (
              <p className="text-slate-500">No active job found.</p>
            )}
          </div>
        </div>

        {/* --- Automation Controls --- */}
        {(!jobStatus || jobStatus.status === 'completed' || jobStatus.status === 'failed') && (
        <>
          <div>
            <h2 className="text-xl font-semibold text-slate-700">New Automation Job</h2>
            <div className="space-y-4 mt-2">
              <div>
                <label className="font-medium text-slate-700 block mb-1">Portal Username</label>
                <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"/><input type="text" value={portalUser} onChange={e => setPortalUser(e.target.value)} className="w-full pl-10 p-3 border border-slate-300 rounded-lg"/></div>
              </div>
              <div>
                <label className="font-medium text-slate-700 block mb-1">Portal Password</label>
                <div className="relative"><KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"/><input type="password" value={portalPass} onChange={e => setPortalPass(e.target.value)} className="w-full pl-10 p-3 border border-slate-300 rounded-lg"/></div>
              </div>
            </div>
          </div>
          
          <div>
            <h2 className="text-xl font-semibold text-slate-700 flex items-center mb-4">Upload & Order Images</h2>
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center bg-slate-50"><UploadCloud className="mx-auto h-12 w-12 text-slate-400" /><input type="file" multiple onChange={handleFileChange} id="file-upload" className="hidden" accept="image/*" /><label htmlFor="file-upload" className="mt-2 block text-sm font-medium text-indigo-600 cursor-pointer">Click to browse</label></div>
            <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">{images.map((item, index) => (<div key={item.id} draggable onDragStart={() => (dragItem.current = index)} onDragEnter={() => (dragOverItem.current = index)} onDragEnd={handleDragSort} onDragOver={(e) => e.preventDefault()} className="flex items-center p-2 bg-white border rounded-lg shadow-sm cursor-grab"><GripVertical className="w-5 h-5 text-slate-400 mr-2" /><img src={item.preview} alt="preview" className="w-12 h-12 rounded-md object-cover mr-4" /><span className="flex-grow text-sm font-medium text-slate-700 truncate">{item.file.name}</span><button onClick={() => removeImage(item.id)} className="p-1 text-slate-400 hover:text-red-500 rounded-full"><X className="w-5 h-5" /></button></div>))}</div>
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
        )}

        {message && (<p className={`text-center mt-4 text-sm font-medium ${status === 'error' ? 'text-red-600' : 'text-green-600'}`}>{message}</p>)}
      </div>
    </div>
  );
}
