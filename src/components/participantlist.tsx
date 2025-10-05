// components/ParticipantsList.tsx
import { Volume2, VolumeX } from 'lucide-react';
import type { User } from '../App';

interface ParticipantsListProps {
  users: User[];
  currentUserId: string;
}

interface ParticipantCardProps {
  user: User;
  isCurrentUser: boolean;
  isSpeaking: boolean;
}

const ParticipantCard = ({ user, isCurrentUser, isSpeaking }: ParticipantCardProps) => {
  return (
    <div
      className={`bg-white rounded-lg p-3 sm:p-4 shadow-sm border-2 ${
        isSpeaking ? 'border-green-500' : 'border-gray-200'
      } transition-all hover:shadow-md`}
    >
      <div className="flex items-center gap-2 sm:gap-3">
        <div
          className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white font-semibold text-base sm:text-lg flex-shrink-0 ${
            isSpeaking ? 'bg-green-500 animate-pulse' : 'bg-blue-500'
          }`}
        >
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-800 text-sm sm:text-base truncate">
            {user.name}
            {isCurrentUser && <span className="text-gray-500 text-xs sm:text-sm ml-1 sm:ml-2">(You)</span>}
          </h3>
          <p className="text-xs sm:text-sm text-gray-500">
            {isSpeaking ? 'Speaking...' : 'Connected'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isSpeaking ? (
            <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
          ) : (
            <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
          )}
        </div>
      </div>
    </div>
  );
};

const ParticipantsList = ({ users, currentUserId }: ParticipantsListProps) => {
  return (
    <div className="space-y-2 sm:space-y-3">
      {users.length === 0 ? (
        <div className="text-center text-gray-400 py-6 sm:py-8">
          <p className="text-sm sm:text-base">No participants yet</p>
        </div>
      ) : (
        users.map((user) => (
          <ParticipantCard
            key={user.id}
            user={user}
            isCurrentUser={user.id === currentUserId}
            isSpeaking={false}
          />
        ))
      )}
    </div>
  );
};

export default ParticipantsList;