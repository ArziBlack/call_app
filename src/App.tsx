import { useState, useEffect } from 'react';
import JoinForm from './components/joinform';
// import VideoRoom from './components/VideoRoom';
import { io, Socket } from 'socket.io-client';
import AudioRoom from './components/audioroom';

// Types for our application
export interface User {
  id: string;
  name: string;
}

export interface RTCPeerData {
  peerConnection: RTCPeerConnection;
  stream?: MediaStream;
}

function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [joined, setJoined] = useState(false);
  const [username, setUsername] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<Record<string, RTCPeerData>>({});

  // Initialize Socket.io connection
  useEffect(() => {
    const newSocket = io('https://video-call-server-iqe4.onrender.com');
    setSocket(newSocket);

    // Clean up on unmount
    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Handle user joining the room
  const handleJoin = async (name: string) => {
    if (!socket) return;

    try {
      // Get local media stream
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: false, 
        audio: true 
      });
      
      setLocalStream(stream);
      setUsername(name);
      
      // Send join event to server
      socket.emit('join', { name });
      setJoined(true);
    } catch (error) {
      console.error('Error accessing media devices:', error);
      alert('Could not access camera or microphone. Please check permissions.');
    }
  };

  const handleLeave = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    
    // Close all peer connections
    Object.values(peers).forEach(({ peerConnection }) => {
      peerConnection.close();
    });
    
    if (socket) {
      socket.disconnect();
    }
    
    setLocalStream(null);
    setJoined(false);
    setUsername('');
    setUsers([]);
    setPeers({});
  };

  return (
    <div className="min-h-screen w-screen bg-gradient-to-b from-blue-500 to-stone-900 py-10 px-4 relative">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-center text-white mb-8">Video Call App</h1>
        
        {!joined ? (
          <JoinForm onJoin={handleJoin} />
        ) : (
          <AudioRoom
            socket={socket}
            username={username}
            users={users}
            setUsers={setUsers}
            localStream={localStream}
            peers={peers}
            setPeers={setPeers}
            onLeave={handleLeave}
          />
        )}
      </div>
    </div>
  );
}

export default App;
