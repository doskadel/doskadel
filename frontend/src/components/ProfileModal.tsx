import React, { useState, useEffect, useCallback } from 'react';
import Modal from './Modal';
import api from '../utils/api';
import { clearAuth, getRefreshToken } from '../utils/token';
import {
  isPushSupported,
  isSubscribed,
  subscribeUser,
  unsubscribeUser,
  sendTestPush,
  getNotificationPermission,
} from '../utils/push';

type View = 'profile' | 'settings' | 'notifications';

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
}

interface NotificationSettings {
  enabled: boolean;
  beforeDue: boolean;
  atDue: boolean;
  overdueReminder: boolean;
  dailyDigest: boolean;
  dailyDigestTime: string;
  quietHours: {
    enabled: boolean;
    from: string;
    to: string;
  };
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  beforeDue: true,
  atDue: true,
  overdueReminder: false,
  dailyDigest: true,
  dailyDigestTime: '09:00',
  quietHours: {
    enabled: true,
    from: '22:00',
    to: '08:00',
  },
};

const ProfileModal: React.FC<ProfileModalProps> = ({ open, onClose }) => {
  const [view, setView] = useState<View>('profile');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Notification settings
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [settingsSavedAt, setSettingsSavedAt] = useState<number | null>(null);

  // Push (local device)
  const [pushSupported, setPushSupported] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushMessage, setPushMessage] = useState('');
  const [testBusy, setTestBusy] = useState(false);

  const fetchUser = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/users/me');
      setUser(res.data.user);
      if (res.data.user?.notificationSettings) {
        setSettings({
          ...DEFAULT_SETTINGS,
          ...res.data.user.notificationSettings,
          quietHours: {
            ...DEFAULT_SETTINGS.quietHours,
            ...(res.data.user.notificationSettings.quietHours || {}),
          },
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не удалось загрузить профиль');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPushState = useCallback(async () => {
    const supported = isPushSupported();
    setPushSupported(supported);
    if (supported) {
      const subscribed = await isSubscribed();
      setPushSubscribed(subscribed);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setView('profile');
    setError('');
    setSettingsError('');
    setPushMessage('');
    fetchUser();
    fetchPushState();
  }, [open, fetchUser, fetchPushState]);

  const handleLogout = async () => {
    try {
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        await api.post('/api/auth/logout', { refreshToken });
      }
    } catch {
      // даже если сервер недоступен — выходим локально
    }
    clearAuth();
    window.location.href = '/login';
  };

  // --- Настройки: сохранение ---
  const updateSetting = <K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const updateQuietHours = <K extends keyof NotificationSettings['quietHours']>(
    key: K,
    value: NotificationSettings['quietHours'][K]
  ) => {
    setSettings((prev) => ({
      ...prev,
      quietHours: { ...prev.quietHours, [key]: value },
    }));
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    setSettingsError('');
    try {
      const res = await api.put('/api/users/notification-settings', settings);
      if (res.data.user?.notificationSettings) {
        setSettings({
          ...DEFAULT_SETTINGS,
          ...res.data.user.notificationSettings,
          quietHours: {
            ...DEFAULT_SETTINGS.quietHours,
            ...(res.data.user.notificationSettings.quietHours || {}),
          },
        });
      }
      setSettingsSavedAt(Date.now());
    } catch (err: any) {
      setSettingsError(err.response?.data?.message || 'Ошибка сохранения');
    } finally {
      setSavingSettings(false);
    }
  };

  // --- Push на этом устройстве ---
  const handleSubscribe = async () => {
    setPushBusy(true);
    setPushMessage('');
    const res = await subscribeUser();
    if (res.ok) {
      setPushSubscribed(true);
      setPushMessage('Уведомления включены на этом устройстве');
    } else {
      setPushMessage(res.message || 'Не удалось включить уведомления');
    }
    setPushBusy(false);
  };

  const handleUnsubscribe = async () => {
    setPushBusy(true);
    setPushMessage('');
    const res = await unsubscribeUser();
    if (res.ok) {
      setPushSubscribed(false);
      setPushMessage('Уведомления отключены на этом устройстве');
    } else {
      setPushMessage(res.message || 'Не удалось отключить уведомления');
    }
    setPushBusy(false);
  };

  const handleTestPush = async () => {
    setTestBusy(true);
    setPushMessage('');
    const res = await sendTestPush();
    if (res.ok) {
      setPushMessage('Тестовое уведомление отправлено');
    } else {
      setPushMessage(res.message || 'Не удалось отправить');
    }
    setTestBusy(false);
  };

  const initials = (user?.username || '?').trim().charAt(0).toUpperCase();
  const permission = getNotificationPermission();

  const title =
    view === 'settings' ? 'Настройки' :
    view === 'notifications' ? 'Уведомления' :
    'Профиль';

  return (
    <Modal open={open} onClose={onClose} title={title}>
      {loading && <p>Загрузка...</p>}
      {error && <p style={{ color: 'var(--color-danger)' }}>{error}</p>}

      {/* ============ PROFILE ============ */}
      {!loading && user && view === 'profile' && (
        <div className="profile-view">
          <div className="profile-header">
            {user.avatar ? (
              <img src={user.avatar} alt={user.username} className="profile-avatar" />
            ) : (
              <div className="profile-avatar profile-avatar--initials">{initials}</div>
            )}
            <p className="profile-username">{user.username}</p>
            <p className="profile-email">{user.email}</p>
          </div>

          <div className="profile-menu">
            <button
              type="button"
              className="profile-menu-item"
              onClick={() => setView('settings')}
            >
              <span className="profile-menu-icon">⚙</span>
              <span className="profile-menu-label">Настройки</span>
              <span className="profile-menu-arrow">›</span>
            </button>
            <button
              type="button"
              className="profile-menu-item profile-menu-item--danger"
              onClick={handleLogout}
            >
              <span className="profile-menu-icon">🚪</span>
              <span className="profile-menu-label">Выйти</span>
            </button>
          </div>
        </div>
      )}

      {/* ============ SETTINGS ============ */}
      {!loading && user && view === 'settings' && (
        <div className="settings-view">
          <button
            type="button"
            className="settings-back"
            onClick={() => setView('profile')}
          >
            ← Назад
          </button>
          <div className="profile-menu">
            <button
              type="button"
              className="profile-menu-item"
              onClick={() => setView('notifications')}
            >
              <span className="profile-menu-icon">🔔</span>
              <span className="profile-menu-label">Уведомления</span>
              <span className="profile-menu-arrow">›</span>
            </button>
          </div>
        </div>
      )}

      {/* ============ NOTIFICATIONS ============ */}
      {!loading && user && view === 'notifications' && (
        <div className="settings-view">
          <button
            type="button"
            className="settings-back"
            onClick={() => setView('settings')}
          >
            ← Назад
          </button>

          {/* --- Устройство --- */}
          <div className="settings-section">
            <h4 className="settings-section-title">Это устройство</h4>

            {!pushSupported && (
              <p className="settings-warning">
                Push-уведомления не поддерживаются в этом браузере
              </p>
            )}

            {pushSupported && permission === 'denied' && (
              <p className="settings-warning">
                Уведомления запрещены в настройках браузера. Разрешите их для localhost:3000.
              </p>
            )}

            {pushSupported && (
              <div className="settings-actions">
                {pushSubscribed ? (
                  <button
                    type="button"
                    className="button button--outline"
                    onClick={handleUnsubscribe}
                    disabled={pushBusy}
                  >
                    {pushBusy ? '...' : 'Отключить на этом устройстве'}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="button"
                    onClick={handleSubscribe}
                    disabled={pushBusy || permission === 'denied'}
                  >
                    {pushBusy ? '...' : 'Включить на этом устройстве'}
                  </button>
                )}

                {pushSubscribed && (
                  <button
                    type="button"
                    className="button button--outline"
                    onClick={handleTestPush}
                    disabled={testBusy}
                  >
                    {testBusy ? '...' : 'Тестовое уведомление'}
                  </button>
                )}
              </div>
            )}

            {pushMessage && (
              <p className="settings-message">{pushMessage}</p>
            )}
          </div>

          {/* --- Глобальные настройки --- */}
          <div className="settings-section">
            <h4 className="settings-section-title">Уведомления</h4>

            <ToggleRow
              label="Все уведомления"
              description="Мастер-выключатель. Если выключен — ничего не приходит."
              checked={settings.enabled}
              onChange={(v) => updateSetting('enabled', v)}
            />

            {settings.enabled && (
              <>
                <ToggleRow
                  label="За 5 минут до срока"
                  checked={settings.beforeDue}
                  onChange={(v) => updateSetting('beforeDue', v)}
                />

                <ToggleRow
                  label="В момент срока"
                  description="Пуш с кнопкой «Подтвердить» (на Android/Desktop)."
                  checked={settings.atDue}
                  onChange={(v) => updateSetting('atDue', v)}
                />

                <ToggleRow
                  label="Напомнить о просроченном"
                  description="Пуш, если задача просрочена и не подтверждена."
                  checked={settings.overdueReminder}
                  onChange={(v) => updateSetting('overdueReminder', v)}
                />

                <ToggleRow
                  label="Дайджест раз в день"
                  checked={settings.dailyDigest}
                  onChange={(v) => updateSetting('dailyDigest', v)}
                />

                {settings.dailyDigest && (
                  <div className="settings-row">
                    <span className="settings-row-label">Время дайджеста</span>
                    <input
                      type="time"
                      className="settings-time-input"
                      value={settings.dailyDigestTime}
                      onChange={(e) => updateSetting('dailyDigestTime', e.target.value)}
                    />
                  </div>
                )}

                <ToggleRow
                  label="Тихие часы"
                  description="В это время пуши не отправляются."
                  checked={settings.quietHours.enabled}
                  onChange={(v) => updateQuietHours('enabled', v)}
                />

                {settings.quietHours.enabled && (
                  <div className="settings-row settings-row--two">
                    <div className="settings-row-col">
                      <span className="settings-row-label">С</span>
                      <input
                        type="time"
                        className="settings-time-input"
                        value={settings.quietHours.from}
                        onChange={(e) => updateQuietHours('from', e.target.value)}
                      />
                    </div>
                    <div className="settings-row-col">
                      <span className="settings-row-label">По</span>
                      <input
                        type="time"
                        className="settings-time-input"
                        value={settings.quietHours.to}
                        onChange={(e) => updateQuietHours('to', e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {settingsError && (
            <p style={{ color: 'var(--color-danger)', fontSize: '13px' }}>{settingsError}</p>
          )}

          <div className="settings-footer">
            <button
              type="button"
              className="button"
              onClick={handleSaveSettings}
              disabled={savingSettings}
            >
              {savingSettings ? 'Сохранение...' : 'Сохранить настройки'}
            </button>
            {settingsSavedAt && (
              <span className="settings-saved">Сохранено</span>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};

// ============================================================
// ToggleRow — строка с тумблером
// ============================================================
interface ToggleRowProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

const ToggleRow: React.FC<ToggleRowProps> = ({ label, description, checked, onChange }) => {
  return (
    <label className="settings-row settings-row--toggle">
      <span className="settings-row-text">
        <span className="settings-row-label">{label}</span>
        {description && (
          <span className="settings-row-description">{description}</span>
        )}
      </span>
      <span className={`toggle ${checked ? 'toggle--on' : ''}`}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="toggle-slider" />
      </span>
    </label>
  );
};

export default ProfileModal;