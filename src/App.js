import React, { useState, useRef, useEffect } from 'react';
import { User, KeyRound, UploadCloud, GripVertical, Clock, PlayCircle, X, ChevronRight, ListVideo, Terminal, Image as ImageIcon } from 'lucide-react';

// --- Main App Component ---
export default function App() {
  // --- State Management ---
  const [appStep, setAppStep] = useState('credentials'); // credentials, selectDisplay, upload
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayOptions, setDisplayOptions] = useState([]);
  const [selectedDisplay, setSelectedDisplay] = useState('');
  const [currentImageUrl, setCurrentImageUrl] = useState(null);
  const [images, setImages] = useState([]);
  const [interval, setInterval] = useState(30);
  const [cycle, setCycle] = useState(false);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [portalLogs, setPortalLogs] = useState([]);
  
  // --- Refs ---
  const ws = useRef(null);
  const logContainerRef = useRef(null);
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);

  useEffect(() => {
    if (logContainerRef.current) {
        logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [portalLogs]);

  const handleSelectDisplay = async (displayValue) => {
    setSelectedDisplay(displayValue);
    setCurrentImageUrl(null); // Reset on change
    if (!displayValue) return;

    try {
        const response = await fetch('https://my-uploader-backend.onrender.com/fetch-display-details', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, displayValue }),
        });
        const data = await response.json();
        if (data.imageUrl) {
            setCurrentImageUrl(data.imageUrl);
        }
    } catch (error) {
        console.error("Could not fetch display image", error);
    }
  };

  const handleFetchDisplays = async () => {
    if (!username || !password) { setStatus('error'); setMessage('Please enter a username and password.'); return; }
    setStatus('processing');
    setMessage('Logging in and fetching your displays...');
    try {
      const response = await fetch('https://my-uploader-backend.onrender.com/fetch-displays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const options = await response.json();
      if (!response.ok) throw new Error(options.message || 'Failed to fetch.');
      if (options.length === 0) { setStatus('error'); setMessage('No displays found for this user.'); return; }
      setDisplayOptions(options);
      await handleSelectDisplay(options[0].value); // Fetch image for the default selection
      setAppStep('selectDisplay');
      setStatus('idle');
      setMessage('');
    } catch (error) {
      setStatus('error');
      setMessage(error.message);
    }
  };

  const handleStartAutomation = async () => {
    if (!selectedDisplay || images.length === 0) {
      setStatus('error');
      setMessage('Please select a display and upload at least one image.');
      return;
    }
    setStatus('processing');
    setMessage('Staging files for automation...');
    setPortalLogs([]);
    
    // Step 1: Upload files to the server to stage them
    const uploadFormData = new FormData();
    images.forEach(img => uploadFormData.append('images', img.file));

    try {
        const uploadResponse = await fetch('https://my-uploader-backend.onrender.com/upload-files', {
            method: 'POST',
            body: uploadFormData,
        });
        const uploadResult = await uploadResponse.json();
        if (!uploadResponse.ok) throw new Error(uploadResult.message);
        
        // Step 2: Connect to WebSocket and start the job
        const wsUrl = 'wss://my-uploader-backend.onrender.com'; // Use wss for secure connection
        ws.current = new WebSocket(wsUrl);

        ws.current.onopen = () => {
            console.log('WebSocket connected');
            setMessage('Connection established. Starting automation...');
            const payload = {
                username,
                password,
                interval: interval * 60,
                displayValue: selectedDisplay,
                cycle,
                imageFiles: uploadResult.files // Send the list of staged filenames
            };
            ws.current.send(JSON.stringify({ type: 'start-automation', payload }));
        };

        ws.current.onmessage = (event) => {
            const data = JSON.parse(event.data);
            switch (data.type) {
                case 'log':
                case 'portal-log':
                    setPortalLogs(prev => [...prev, data.message]);
                    break;
                case 'done':
                    setStatus('success');
                    setMessage(data.message);
                    ws.current.close();
                    break;
                case 'error':
                    setStatus('error');
                    setMessage(data.message);
                    ws.current.close();
                    break;
                default:
                    break;
            }
        };

        ws.current.onerror = (error) => {
            console.error('WebSocket error:', error);
            setStatus('error');
            setMessage('A connection error occurred with the automation server.');
        };

        ws.current.onclose = () => {
            console.log('WebSocket disconnected');
            if (status === 'processing') {
                setStatus('idle'); // Reset if it was still processing
            }
        };

    } catch (error) {
      setStatus('error');
      setMessage(`File staging failed: ${error.message}`);
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

  const renderStep = () => {
    switch (appStep) {
        case 'credentials':
            return (
                <>
                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Username</label>
                    <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"/><input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full pl-10 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"/></div>
                  </div>
                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Password</label>
                    <div className="relative"><KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"/><input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-10 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"/></div>
                  </div>
                  <button onClick={handleFetchDisplays} disabled={status === 'processing'} className="w-full bg-indigo-600 text-white font-bold py-4 px-4 rounded-lg flex items-center justify-center hover:bg-indigo-700 transition-all disabled:bg-slate-400">
                    {status === 'processing' ? 'Fetching...' : 'Fetch Displays'} <ChevronRight className="ml-2 w-5 h-5"/>
                  </button>
                </>
              );
        case 'selectDisplay':
            return (
                <>
                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Select a Display</label>
                    <div className="relative"><ListVideo className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"/><select value={selectedDisplay} onChange={(e) => handleSelectDisplay(e.target.value)} className="w-full pl-10 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 appearance-none bg-white"><option value="" disabled>-- Choose a Display --</option>{displayOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.text}</option>)}</select></div>
                  </div>
                  <div className="mt-4 p-4 border rounded-lg bg-slate-50">
                    <h3 className="font-semibold text-slate-700 flex items-center"><ImageIcon className="w-5 h-5 mr-2 text-slate-500"/>Currently Displaying</h3>
                    <div className="mt-2 h-40 flex items-center justify-center bg-slate-200 rounded">
                        {currentImageUrl ? <img src={currentImageUrl} alt="Current display" className="max-h-full max-w-full object-contain"/> : <p className="text-slate-500 text-sm">No image found.</p>}
                    </div>
                  </div>
                  <button onClick={() => setAppStep('upload')} className="w-full bg-indigo-600 text-white font-bold py-4 px-4 rounded-lg flex items-center justify-center hover:bg-indigo-700 transition-all">
                    Next: Upload Images <ChevronRight className="ml-2 w-5 h-5"/>
                  </button>
                  <button onClick={() => setAppStep('credentials')} className="text-sm text-slate-500 hover:text-indigo-600 text-center w-full">Back to Login</button>
                </>
            );
        case 'upload':
            return (
                <>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-700 flex items-center mb-4"><span className="text-indigo-600 bg-indigo-100 rounded-full w-8 h-8 flex items-center justify-center mr-3">2</span>Upload & Order Images</h2>
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center bg-slate-50 hover:bg-slate-100 transition"><UploadCloud className="mx-auto h-12 w-12 text-slate-400" /><input type="file" multiple onChange={handleFileChange} id="file-upload" className="hidden" accept="image/*" /><label htmlFor="file-upload" className="mt-2 block text-sm font-medium text-indigo-600 hover:text-indigo-500 cursor-pointer">Click to browse or drag & drop</label></div>
                    <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">{images.map((item, index) => (<div key={item.id} draggable onDragStart={() => (dragItem.current = index)} onDragEnter={() => (dragOverItem.current = index)} onDragEnd={handleDragSort} onDragOver={(e) => e.preventDefault()} className="flex items-center p-2 bg-white border rounded-lg shadow-sm cursor-grab active:cursor-grabbing"><GripVertical className="w-5 h-5 text-slate-400 mr-2" /><img src={item.preview} alt="preview" className="w-12 h-12 rounded-md object-cover mr-4" /><span className="flex-grow text-sm font-medium text-slate-700 truncate">{item.file.name}</span><button onClick={() => removeImage(item.id)} className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-100 rounded-full"><X className="w-5 h-5" /></button></div>))}</div>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-700 flex items-center mb-4"><span className="text-indigo-600 bg-indigo-100 rounded-full w-8 h-8 flex items-center justify-center mr-3">3</span>Set Upload Interval</h2>
                    <div className="flex items-center space-x-4"><Clock className="w-6 h-6 text-slate-500" /><input type="range" min="0" max="60" step="5" value={interval} onChange={(e) => setInterval(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" /><span className="font-bold text-indigo-600 text-lg w-28 text-center">{interval} minutes</span></div>
                  </div>
                  <div className="flex items-center justify-center">
                    <input type="checkbox" id="cycle" checked={cycle} onChange={(e) => setCycle(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"/>
                    <label htmlFor="cycle" className="ml-2 block text-sm text-gray-900">Cycle images (loop indefinitely)</label>
                  </div>
                  <button onClick={handleStartAutomation} disabled={status === 'processing'} className="w-full bg-green-600 text-white font-bold py-4 px-4 rounded-lg flex items-center justify-center hover:bg-green-700 transition-all disabled:bg-slate-400">
                    {status === 'processing' ? 'Processing...' : 'Start Automation'} <PlayCircle className="ml-2"/>
                  </button>
                  <button onClick={() => setAppStep('selectDisplay')} className="text-sm text-slate-500 hover:text-indigo-600 text-center w-full">Back to Display Selection</button>
                  
                  {status === 'processing' && (
                    <div className="mt-6">
                      <h2 className="text-xl font-semibold text-slate-700 flex items-center mb-4"><Terminal className="mr-3 text-slate-500"/>Live Portal Status</h2>
                      <div ref={logContainerRef} className="bg-gray-800 text-white font-mono text-sm rounded-lg p-4 h-60 overflow-y-auto space-y-1">
                        {portalLogs.map((log, index) => (<p key={index} className="whitespace-pre-wrap">{log}</p>))}
                      </div>
                    </div>
                  )}
                </>
            );
        default: return null;
    }
  };

  return (
    <div className="bg-slate-100 min-h-screen font-sans flex items-center justify-center p-4">
      <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-xl p-8 space-y-8">
        <header className="text-center">
          <h1 className="text-4xl font-bold text-slate-800">Image Upload Automation</h1>
          <p className="text-slate-500 mt-2">Step {appStep === 'credentials' ? 1 : appStep === 'selectDisplay' ? 2 : 3} of 3</p>
        </header>
        {renderStep()}
        {status !== 'processing' && message && (<p className={`text-center mt-4 text-sm font-medium ${status === 'error' ? 'text-red-600' : 'text-green-600'}`}>{message}</p>)}
      </div>
    </div>
  );
}
