import React, { useState, useRef, useCallback } from 'react';
import { User, KeyRound, UploadCloud, GripVertical, Clock, PlayCircle, X } from 'lucide-react';

// --- Main App Component ---
export default function App() {
  // --- State Management ---
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [images, setImages] = useState([]);
  const [interval, setInterval] = useState(30); // Default interval in seconds
  const [status, setStatus] = useState('idle'); // idle, processing, success, error
  const [message, setMessage] = useState('');
  
  // Ref for drag-and-drop functionality
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);

  // --- Handlers ---

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const newImages = files.map(file => ({
      file,
      id: Math.random().toString(36).substring(2, 9),
      preview: URL.createObjectURL(file)
    }));
    setImages(prev => [...prev, ...newImages]);
  };

  const removeImage = (id) => {
    setImages(prev => prev.filter(image => image.id !== id));
  };

  // --- Drag and Drop Handlers ---
  const handleDragSort = () => {
    let _images = [...images];
    const draggedItemContent = _images.splice(dragItem.current, 1)[0];
    _images.splice(dragOverItem.current, 0, draggedItemContent);
    dragItem.current = null;
    dragOverItem.current = null;
    setImages(_images);
  };

  const handleStartAutomation = async () => {
    if (!username || !password || images.length === 0) {
      setStatus('error');
      setMessage('Please fill in all fields and upload at least one image.');
      return;
    }

    setStatus('processing');
    setMessage('Preparing to start automation...');

    // This is where you would make the API call to your backend.
    // We'll simulate it for now.
    console.log('--- Starting Automation ---');
    console.log('Username:', username);
    console.log('Password:', password);
    console.log('Interval:', interval, 'seconds');
    console.log('Images to upload:', images.map(img => img.file.name));
    
    // In a real app, you would use FormData to send the files.
    // const formData = new FormData();
    // formData.append('username', username);
    // formData.append('password', password);
    // formData.append('interval', interval);
    // images.forEach(img => {
    //   formData.append('images', img.file);
    // });
    
    try {
    const response = await fetch('https://my-uploader-backend.onrender.com', {
     method: 'POST',
      body: formData,
      });
     const result = await response.json();
     setStatus('success');
      setMessage(result.message);
     } catch (error) {
    //   setStatus('error');
    //   setMessage('Failed to connect to the automation server.');
    // }

    // --- Simulation ---
    setTimeout(() => {
      setStatus('success');
      setMessage(`Automation started successfully for ${images.length} images! Check your server console.`);
    }, 2000);
  };

  return (
    <div className="bg-slate-100 min-h-screen font-sans flex items-center justify-center p-4">
      <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-xl p-8 space-y-8">
        
        <header className="text-center">
          <h1 className="text-4xl font-bold text-slate-800">Image Upload Automation</h1>
          <p className="text-slate-500 mt-2">Configure your credentials and upload images to start.</p>
        </header>

        {/* --- Step 1: Credentials --- */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-700 flex items-center"><span className="text-indigo-600 bg-indigo-100 rounded-full w-8 h-8 flex items-center justify-center mr-3">1</span>Login Credentials</h2>
          <div>
            <label className="font-medium text-slate-700 block mb-1">Username</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"/>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full pl-10 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"/>
            </div>
          </div>
          <div>
            <label className="font-medium text-slate-700 block mb-1">Password</label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"/>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-10 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"/>
            </div>
          </div>
        </div>

        {/* --- Step 2: Image Upload & Reorder --- */}
        <div>
          <h2 className="text-xl font-semibold text-slate-700 flex items-center mb-4"><span className="text-indigo-600 bg-indigo-100 rounded-full w-8 h-8 flex items-center justify-center mr-3">2</span>Upload & Order Images</h2>
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center bg-slate-50 hover:bg-slate-100 transition">
            <UploadCloud className="mx-auto h-12 w-12 text-slate-400" />
            <input type="file" multiple onChange={handleFileChange} id="file-upload" className="hidden" accept="image/*" />
            <label htmlFor="file-upload" className="mt-2 block text-sm font-medium text-indigo-600 hover:text-indigo-500 cursor-pointer">
              Click to browse or drag & drop
            </label>
          </div>
          <div className="mt-4 space-y-2">
            {images.length === 0 && <p className="text-center text-slate-500 p-4">No images uploaded.</p>}
            {images.map((item, index) => (
              <div 
                key={item.id}
                draggable
                onDragStart={() => dragItem.current = index}
                onDragEnter={() => dragOverItem.current = index}
                onDragEnd={handleDragSort}
                onDragOver={(e) => e.preventDefault()}
                className="flex items-center p-2 bg-white border rounded-lg shadow-sm cursor-grab active:cursor-grabbing"
              >
                <GripVertical className="w-5 h-5 text-slate-400 mr-2" />
                <img src={item.preview} alt="preview" className="w-12 h-12 rounded-md object-cover mr-4" />
                <span className="flex-grow text-sm font-medium text-slate-700 truncate">{item.file.name}</span>
                <button onClick={() => removeImage(item.id)} className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-100 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* --- Step 3: Set Interval --- */}
        <div>
           <h2 className="text-xl font-semibold text-slate-700 flex items-center mb-4"><span className="text-indigo-600 bg-indigo-100 rounded-full w-8 h-8 flex items-center justify-center mr-3">3</span>Set Upload Interval</h2>
           <div className="flex items-center space-x-4">
             <Clock className="w-6 h-6 text-slate-500" />
             <input 
               type="range" 
               min="5" 
               max="1800" 
               step="5"
               value={interval}
               onChange={(e) => setInterval(e.target.value)}
               className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
             />
             <span className="font-bold text-indigo-600 text-lg w-28 text-center">{Math.floor(interval / 60)}m {interval % 60}s</span>
           </div>
        </div>
        
        {/* --- Step 4: Start --- */}
        <div>
          <button 
            onClick={handleStartAutomation}
            disabled={status === 'processing'}
            className="w-full bg-indigo-600 text-white font-bold py-4 px-4 rounded-lg flex items-center justify-center hover:bg-indigo-700 transition-all duration-300 disabled:bg-slate-400 disabled:cursor-not-allowed transform hover:scale-105 active:scale-100 text-lg"
          >
            {status === 'processing' ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              <>
                <PlayCircle className="mr-2"/>
                Start Automation
              </>
            )}
          </button>
          {message && (
            <p className={`text-center mt-4 text-sm font-medium ${status === 'error' ? 'text-red-600' : 'text-green-600'}`}>
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
