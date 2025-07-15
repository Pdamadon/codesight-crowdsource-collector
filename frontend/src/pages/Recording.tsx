import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';

// Audio-only recording with browser extension integration

interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  recordingTime: number;
  audioBlob: Blob | null;
  extensionConnected: boolean;
  extensionStatus: 'idle' | 'tracking' | 'error';
}

const Recording: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const scenario = searchParams.get('scenario') || 'general';
  
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    recordingTime: 0,
    audioBlob: null,
    extensionConnected: false,
    extensionStatus: 'idle',
  });

  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const scenarioDetails: Record<string, any> = {
    electronics: {
      title: 'Electronics Shopping',
      task: 'Shop for a laptop or smartphone under $1000',
      suggestions: [
        'Compare at least 3 different products',
        'Read customer reviews',
        'Check technical specifications',
        'Compare prices across different sites',
        'Consider warranty and return policies'
      ]
    },
    clothing: {
      title: 'Fashion Shopping',
      task: 'Browse and select clothing for a specific occasion',
      suggestions: [
        'Think about the occasion and style needed',
        'Check size charts and measurements',
        'Look at customer photos and reviews',
        'Consider material and care instructions',
        'Compare prices and shipping options'
      ]
    },
    home: {
      title: 'Home & Garden Shopping',
      task: 'Look for home improvement or furniture items',
      suggestions: [
        'Measure your space and check dimensions',
        'Read assembly and installation requirements',
        'Compare materials and quality',
        'Check delivery options and timeframes',
        'Look for customer setup photos'
      ]
    }
  };

  const currentScenario = scenarioDetails[scenario] || scenarioDetails.electronics;
  const [sessionId, setSessionId] = useState<string>('');

  useEffect(() => {
    // Get session ID from localStorage
    const storedSessionId = localStorage.getItem('sessionId');
    if (storedSessionId) {
      setSessionId(storedSessionId);
    }
  }, []);

  useEffect(() => {
    // Check extension connection on mount
    checkExtensionConnection();
    
    return () => {
      // Cleanup on unmount
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
      stopAllStreams();
    };
  }, []);

  const stopAllStreams = () => {
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const checkExtensionConnection = () => {
    // Check if extension is available and connected
    if (window.chrome && window.chrome.runtime) {
      setRecordingState(prev => ({ ...prev, extensionConnected: true }));
    } else {
      setRecordingState(prev => ({ ...prev, extensionConnected: false }));
    }
  };

  const startRecording = async () => {
    try {
      // Get microphone audio only
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      audioStreamRef.current = audioStream;

      // Set up audio recording with fallbacks
      let audioRecorderOptions;
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        audioRecorderOptions = {
          mimeType: 'audio/webm;codecs=opus',
          audioBitsPerSecond: 64000         // 64 kbps - sufficient for voice narration
        };
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        audioRecorderOptions = {
          mimeType: 'audio/webm',
          audioBitsPerSecond: 64000
        };
      } else {
        audioRecorderOptions = { audioBitsPerSecond: 64000 };
      }
      
      const audioRecorder = new MediaRecorder(audioStream, audioRecorderOptions);
      console.log('Audio compression settings:', audioRecorderOptions);

      audioChunksRef.current = [];

      audioRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      audioRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setRecordingState(prev => ({ ...prev, audioBlob }));
      };

      audioRecorderRef.current = audioRecorder;

      // Start audio recording
      audioRecorder.start(1000);

      // Notify extension to start tracking
      if (window.chrome && window.chrome.runtime) {
        try {
          await window.chrome.runtime.sendMessage({
            type: 'START_TRACKING',
            sessionId: sessionId
          });
          setRecordingState(prev => ({ ...prev, extensionStatus: 'tracking' }));
        } catch (error) {
          console.error('Failed to start extension tracking:', error);
          setRecordingState(prev => ({ ...prev, extensionStatus: 'error' }));
        }
      }

      setRecordingState(prev => ({ 
        ...prev, 
        isRecording: true, 
        isPaused: false,
        recordingTime: 0
      }));

      // Start timer
      timerRef.current = window.setInterval(() => {
        setRecordingState(prev => ({ 
          ...prev, 
          recordingTime: prev.recordingTime + 1 
        }));
      }, 1000);

    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('Failed to start recording. Please make sure you grant microphone permissions.');
    }
  };

  const pauseRecording = () => {
    if (audioRecorderRef.current) {
      if (recordingState.isPaused) {
        audioRecorderRef.current.resume();
        timerRef.current = window.setInterval(() => {
          setRecordingState(prev => ({ 
            ...prev, 
            recordingTime: prev.recordingTime + 1 
          }));
        }, 1000);
      } else {
        audioRecorderRef.current.pause();
        if (timerRef.current) {
          window.clearInterval(timerRef.current);
        }
      }
      
      setRecordingState(prev => ({ ...prev, isPaused: !prev.isPaused }));
    }
  };

  const stopRecording = () => {
    if (audioRecorderRef.current) {
      audioRecorderRef.current.stop();
    }
    
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
    }

    // Stop extension tracking
    if (window.chrome && window.chrome.runtime) {
      try {
        window.chrome.runtime.sendMessage({
          type: 'STOP_TRACKING',
          sessionId: sessionId
        });
        setRecordingState(prev => ({ ...prev, extensionStatus: 'idle' }));
      } catch (error) {
        console.error('Failed to stop extension tracking:', error);
      }
    }

    setRecordingState(prev => ({ 
      ...prev, 
      isRecording: false, 
      isPaused: false
    }));

    stopAllStreams();
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFinishSession = async () => {
    try {
      console.log('🎬 Starting session finish process...');
      console.log('Recording state:', recordingState);
      
      if (recordingState.isRecording) {
        console.log('⏹️ Stopping recording...');
        stopRecording();
      }
      
      console.log('📊 Preparing navigation data...');
      
      // Get extension data
      let extensionData = null;
      if (window.chrome && window.chrome.runtime) {
        try {
          extensionData = await window.chrome.runtime.sendMessage({
            type: 'GET_SESSION_DATA',
            sessionId: sessionId
          });
        } catch (error) {
          console.error('Failed to get extension data:', error);
        }
      }
      
      const navigationData = {
        scenario,
        audioBlob: recordingState.audioBlob,
        duration: recordingState.recordingTime,
        extensionData: extensionData
      };
      
      console.log('Navigation data:', navigationData);
      console.log('🚀 Navigating to session review...');
      
      // Navigate to review page with recorded data
      navigate('/session-review', { 
        state: navigationData
      });
      
      console.log('✅ Navigation completed');
    } catch (error) {
      console.error('❌ Error in handleFinishSession:', error);
      alert('Error finishing session: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  return (
    <Layout title="Recording Session - CodeSight">
      <div className="max-w-4xl mx-auto">
        {/* Session Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {currentScenario.title}
              </h2>
              <p className="text-gray-600 mb-4">
                <strong>Your Task:</strong> {currentScenario.task}
              </p>
              {sessionId && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                  <p className="text-sm text-blue-900">
                    <strong>Session ID for Extension:</strong> 
                    <code className="ml-2 bg-white px-2 py-1 rounded font-mono text-xs select-all">
                      {sessionId}
                    </code>
                    <button
                      onClick={() => navigator.clipboard.writeText(sessionId)}
                      className="ml-2 text-blue-600 hover:text-blue-800 text-xs underline"
                    >
                      Copy
                    </button>
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    Enter this ID in the browser extension to link the data
                  </p>
                </div>
              )}
            </div>
            
            {/* Recording Status */}
            <div className="text-right">
              <div className="space-y-2">
                {/* Audio Status */}
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  recordingState.isRecording
                    ? recordingState.isPaused
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {recordingState.isRecording ? (
                    <>
                      <div className={`w-2 h-2 rounded-full mr-2 ${
                        recordingState.isPaused ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'
                      }`} />
                      {recordingState.isPaused ? 'AUDIO PAUSED' : 'AUDIO RECORDING'}
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 rounded-full bg-gray-400 mr-2" />
                      READY
                    </>
                  )}
                </div>
                
                {/* Extension Status */}
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  recordingState.extensionConnected
                    ? recordingState.extensionStatus === 'tracking'
                      ? 'bg-green-100 text-green-800'
                      : recordingState.extensionStatus === 'error'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  <div className={`w-2 h-2 rounded-full mr-2 ${
                    recordingState.extensionConnected
                      ? recordingState.extensionStatus === 'tracking'
                        ? 'bg-green-500 animate-pulse'
                        : recordingState.extensionStatus === 'error'
                        ? 'bg-red-500'
                        : 'bg-blue-500'
                      : 'bg-gray-400'
                  }`} />
                  {recordingState.extensionConnected
                    ? recordingState.extensionStatus === 'tracking'
                      ? 'EXTENSION TRACKING'
                      : recordingState.extensionStatus === 'error'
                      ? 'EXTENSION ERROR'
                      : 'EXTENSION READY'
                    : 'EXTENSION DISCONNECTED'
                  }
                </div>
              </div>
              <div className="text-2xl font-mono font-bold text-gray-900 mt-2">
                {formatTime(recordingState.recordingTime)}
              </div>
            </div>
          </div>
        </div>

        {/* Instructions Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">
                🎯 Shopping Guidelines
              </h3>
              <ul className="space-y-2 text-blue-800">
                {currentScenario.suggestions.map((suggestion: string, index: number) => (
                  <li key={index} className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-green-900 mb-3">
                🎤 Recording Steps
              </h3>
              <ol className="space-y-2 text-green-800 text-sm">
                <li><strong>1.</strong> Start audio recording</li>
                <li><strong>2.</strong> Ensure extension is tracking</li>
                <li><strong>3.</strong> Navigate to shopping sites</li>
                <li><strong>4.</strong> Speak your thoughts out loud</li>
                <li><strong>5.</strong> Describe your decision process</li>
              </ol>
            </div>
            
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-purple-900 mb-2">
                🧩 Extension Status
              </h4>
              <div className="text-xs text-purple-700">
                {recordingState.extensionConnected ? (
                  <div className="flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    Extension connected and ready
                  </div>
                ) : (
                  <div className="flex items-center">
                    <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                    Extension not detected - install and enable
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Recording Controls */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-center gap-4">
            {!recordingState.isRecording ? (
              <button
                onClick={startRecording}
                className="bg-red-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <div className="w-4 h-4 bg-white rounded-full"></div>
                Start Recording
              </button>
            ) : (
              <>
                <button
                  onClick={pauseRecording}
                  className="bg-yellow-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-yellow-700 transition-colors"
                >
                  {recordingState.isPaused ? '▶️ Resume' : '⏸️ Pause'}
                </button>
                
                <button
                  onClick={stopRecording}
                  className="bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
                >
                  ⏹️ Stop
                </button>
              </>
            )}
            
            <button
              onClick={handleFinishSession}
              disabled={recordingState.isRecording && !recordingState.isPaused}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Finish Session
            </button>
          </div>

          {/* Instructions */}
          <div className="mt-6 text-center text-gray-600">
            {!recordingState.isRecording ? (
              <p>Click "Start Recording" to begin audio recording. Make sure the browser extension is installed and ready for tracking.</p>
            ) : (
              <p>Your microphone is recording and the extension is tracking your clicks. Navigate to shopping websites and narrate your thoughts as you browse.</p>
            )}
          </div>
        </div>

        {/* Progress Indicator */}
        {recordingState.recordingTime > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow-md p-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Session Progress</span>
              <span>{formatTime(recordingState.recordingTime)} / ~20-30 minutes</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min((recordingState.recordingTime / 1800) * 100, 100)}%` }}
              />
            </div>
            
            {/* Extension Status */}
            {recordingState.isRecording && (
              <div className="text-center">
                <div className="text-sm text-gray-600 mb-2">
                  Extension Status: 
                  <span className={`ml-2 font-medium ${
                    recordingState.extensionStatus === 'tracking' ? 'text-green-600' :
                    recordingState.extensionStatus === 'error' ? 'text-red-600' :
                    'text-blue-600'
                  }`}>
                    {recordingState.extensionStatus === 'tracking' ? 'Actively Tracking' :
                     recordingState.extensionStatus === 'error' ? 'Connection Error' :
                     'Ready'}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  The browser extension is capturing screenshots and click data automatically
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

// Add Chrome extension types to window object
declare global {
  interface Window {
    chrome?: {
      runtime?: {
        sendMessage: (message: any) => Promise<any>;
      };
    };
  }
}

export default Recording;