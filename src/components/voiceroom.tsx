// components/VoiceRoom.tsx
import { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { Mic, MicOff, PhoneOff } from 'lucide-react';
import type { User, RTCPeerData } from '../App';
import ParticipantsList from './participantlist';

interface VoiceRoomProps {
  socket: Socket | null;
  username: string;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  localStream: MediaStream | null;
  peers: Record<string, RTCPeerData>;
  setPeers: React.Dispatch<React.SetStateAction<Record<string, RTCPeerData>>>;
  onLeave: () => void;
}

const VoiceRoom = ({
  socket,
  username,
  users,
  setUsers,
  localStream,
  peers,
  setPeers,
  onLeave,
}: VoiceRoomProps) => {
  const [isMuted, setIsMuted] = useState(false);
  // const [speakingUsers, setSpeakingUsers] = useState<Set<string>>(new Set());
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const speechStartTimeRef = useRef<number | null>(null);
  const allUsers = [{ id: 'local', name: username }, ...users];

  // Handle socket events
  useEffect(() => {
    if (!socket || !localStream) return;

    // Get the list of users already in the room
    socket.on('get-users', (userList: User[]) => {
      setUsers(userList);
    });

    // Handle new user connections
    socket.on('user-connected', (user: User) => {
      console.log('New user connected:', user.name);
      setUsers((prev) => [...prev, user]);

      // Create a peer connection for the new user
      createPeerConnection(user.id);
    });

    // Handle user disconnections
    socket.on('user-disconnected', (userId: string) => {
      console.log('User disconnected:', userId);
      setUsers((prev) => prev.filter((user) => user.id !== userId));

      // Remove peer connection
      setPeers((prev) => {
        const updated = { ...prev };
        if (updated[userId]) {
          updated[userId].peerConnection.close();
          delete updated[userId];
        }
        return updated;
      });
    });

    // Handle incoming WebRTC offers
    socket.on(
      'offer',
      async (data: {
        offer: RTCSessionDescriptionInit;
        caller: string;
        name: string;
      }) => {
        console.log('Received offer from', data.name);

        // Create a peer connection if it doesn't exist
        if (!peers[data.caller]) {
          createPeerConnection(data.caller);
        }

        const pc = peers[data.caller].peerConnection;

        // Set remote description
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));

        // Create answer
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        // Send the answer back
        socket.emit('answer', {
          answer,
          target: data.caller,
        });
      }
    );

    // Handle incoming WebRTC answers
    socket.on(
      'answer',
      async (data: { answer: RTCSessionDescriptionInit; caller: string }) => {
        console.log('Received answer from', data.caller);

        if (peers[data.caller]) {
          const pc = peers[data.caller].peerConnection;
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        }
      }
    );

    // Handle ICE candidates
    socket.on(
      'ice-candidate',
      async (data: { candidate: RTCIceCandidateInit; caller: string }) => {
        console.log('Received ICE candidate from', data.caller);

        if (peers[data.caller]) {
          const pc = peers[data.caller].peerConnection;
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      }
    );

    // Clean up listeners on unmount
    return () => {
      socket.off('get-users');
      socket.off('user-connected');
      socket.off('user-disconnected');
      socket.off('offer');
      socket.off('answer');
      socket.off('ice-candidate');
    };
  }, [socket, localStream, peers, setUsers, setPeers]);

  // Setup speech detection
  useEffect(() => {
    if (!localStream) return;

    const setupAudioAnalysis = async () => {
      try {
        // Create audio context
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioContext;

        // Create analyser node
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        analyserRef.current = analyser;

        // Connect audio stream to analyser
        const source = audioContext.createMediaStreamSource(localStream);
        source.connect(analyser);

        // Start monitoring audio levels
        monitorAudioLevel();
      } catch (error) {
        console.error('Error setting up audio analysis:', error);
      }
    };

    setupAudioAnalysis();

    // Cleanup function
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [localStream]);

  // Monitor audio level for speech detection
  const monitorAudioLevel = () => {
    if (!analyserRef.current) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const checkAudioLevel = () => {
      analyser.getByteFrequencyData(dataArray);

      // Calculate average volume
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;

      // Speech detection threshold (adjust as needed)
      const speechThreshold = 20;
      const currentTime = Date.now();

      if (average > speechThreshold && !isMuted) {
        if (!isSpeaking) {
          // Speech started
          setIsSpeaking(true);
          speechStartTimeRef.current = currentTime;
          console.log(`🎤 [${new Date().toLocaleTimeString()}] ${username} started speaking (volume: ${average.toFixed(1)})`);
        }
      } else {
        if (isSpeaking) {
          // Speech ended
          setIsSpeaking(false);
          const speechDuration = speechStartTimeRef.current 
            ? ((currentTime - speechStartTimeRef.current) / 1000).toFixed(1)
            : '0.0';
          console.log(`🔇 [${new Date().toLocaleTimeString()}] ${username} stopped speaking (duration: ${speechDuration}s)`);
          speechStartTimeRef.current = null;
        }
      }

      // Continue monitoring
      animationFrameRef.current = requestAnimationFrame(checkAudioLevel);
    };

    checkAudioLevel();
  };

  // Create a new WebRTC peer connection
  const createPeerConnection = async (userId: string) => {
    if (!socket || !localStream) return;

    // Configure ICE servers
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    };

    try {
      // Create new peer connection
      const pc = new RTCPeerConnection(configuration);

      // Add local tracks (audio only)
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });

      // Handle ICE candidate events
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('ice-candidate', {
            candidate: event.candidate,
            target: userId,
          });
        }
      };

      // Handle remote tracks
      pc.ontrack = (event) => {
        console.log('Got remote track from', userId, event.streams[0]);
        if (event.streams && event.streams[0]) {
          setPeers((prev) => ({
            ...prev,
            [userId]: {
              ...prev[userId],
              stream: event.streams[0],
            },
          }));
        }
      };

      // Add peer to state
      setPeers((prev) => ({
        ...prev,
        [userId]: { peerConnection: pc },
      }));

      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit('offer', {
        offer,
        target: userId,
      });
    } catch (error) {
      console.error('Error creating peer connection:', error);
    }
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  return (
    <div className="bg-white rounded-none sm:rounded-2xl shadow-2xl overflow-hidden max-w-6xl mx-auto h-screen sm:h-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg sm:text-2xl font-bold mb-1">Voice Call Room</h1>
            <p className="text-xs sm:text-sm text-blue-100">
              {allUsers.length} Participant{allUsers.length !== 1 ? 's' : ''} Connected
            </p>
          </div>
          <div className="flex items-center gap-2 bg-red-500 rounded-full px-3 py-1.5 sm:px-4 sm:py-2">
            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-white animate-pulse"></div>
            <span className="text-xs sm:text-sm font-medium">Live</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col sm:flex-row h-[calc(100vh-80px)] sm:h-[600px]">
        {/* Center Area - Audio Visualization */}
        <div className="flex-1 p-4 sm:p-8 flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
          <div className="mb-6 sm:mb-8 relative">
            <div className={`w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl sm:text-4xl font-bold shadow-2xl transition-all duration-200 ${
              isSpeaking ? 'ring-4 ring-green-400 ring-opacity-75 scale-105' : ''
            }`}>
              {username.charAt(0).toUpperCase()}
            </div>
            <div className="absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 bg-green-500 border-2 sm:border-4 border-white rounded-full p-1.5 sm:p-2">
              {isMuted ? (
                <MicOff className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              ) : (
                <Mic className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              )}
            </div>
            {isSpeaking && !isMuted && (
              <div className="absolute -inset-2 rounded-full border-2 border-green-400 animate-ping"></div>
            )}
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1 sm:mb-2">{username}</h2>
          <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8">
            {isMuted 
              ? 'Microphone is muted' 
              : isSpeaking 
                ? '🎤 Speaking...' 
                : 'Microphone is active'
            }
          </p>

          {/* Audio Controls */}
          <div className="flex gap-3 sm:gap-4">
            <button
              onClick={toggleMute}
              className={`p-3 sm:p-4 rounded-full shadow-lg transition-all ${
                isMuted
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-white hover:bg-gray-100 text-gray-700 border-2 border-gray-200'
              }`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? (
                <MicOff className="w-5 h-5 sm:w-6 sm:h-6" />
              ) : (
                <Mic className="w-5 h-5 sm:w-6 sm:h-6" />
              )}
            </button>

            <button
              onClick={onLeave}
              className="p-3 sm:p-4 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg transition-all"
              title="Leave Call"
            >
              <PhoneOff className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        {/* Right Sidebar - Participants List */}
        <div className="w-full sm:w-96 border-t sm:border-t-0 sm:border-l border-gray-200 flex flex-col max-h-[40vh] sm:max-h-none">
          <div className="border-b border-gray-200 py-3 px-4 sm:py-4 sm:px-6">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800">Participants</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-3 sm:p-4">
            <ParticipantsList users={allUsers} currentUserId="local"  />
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceRoom;