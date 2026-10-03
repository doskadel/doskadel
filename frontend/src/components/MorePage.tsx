import React, { useState } from 'react';
import { User, Settings, Bell } from 'lucide-react';
import ProfileModal from './ProfileModal';

const MorePage: React.FC = () => {
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <div className="more-page">
      <h2 className="page-title">Ещё</h2>

      <div className="more-page-list">
        <button type="button" className="more-page-item" onClick={() => setProfileOpen(true)}>
          <span className="more-page-icon"><User size={20} /></span>
          <span className="more-page-label">Профиль и настройки</span>
        </button>
      </div>

      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
};

export default MorePage;
