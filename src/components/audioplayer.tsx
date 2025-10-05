import { useEffect, useRef } from 'react';

interface AudioPlayerProps {
  stream: MediaStream;
  userName: string;
  isMainAudio?: boolean;
  isMuted?: boolean;
}

const AudioPlayer = ({ 
  stream, 
  userName, 
  isMainAudio = false, 
  isMuted = false 
}: AudioPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className={`relative ${isMainAudio ? 'bg-gray-800 rounded-xl overflow-hidden w-full h-20' : 'bg-gray-700 rounded-lg overflow-hidden h-16'}`}>
      <div className="w-full h-full flex items-center justify-center">
        <div className={`w-12 h-12 rounded-full ${isMuted ? 'bg-red-600' : 'bg-blue-600'} flex items-center justify-center`}>
          <span className="text-white text-lg font-medium">{userName.charAt(0).toUpperCase()}</span>
        </div>
      </div>

      {/* Hidden audio element */}
      <audio 
        ref={audioRef} 
        autoPlay 
        playsInline
      />

      {/* User name label */}
      <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded-md text-xs font-medium flex items-center">
        {userName}
        {isMuted && <span className="ml-1 text-yellow-300">🔇</span>}
      </div>

      {/* Audio controls for main audio */}
      {isMainAudio && (
        <div className="absolute top-2 right-2 flex space-x-2">
          <button className="bg-white/20 hover:bg-white/30 rounded-full p-2 transition">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default AudioPlayer;