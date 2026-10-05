import React, { useState, useEffect, useCallback } from 'react';
import { Moon, Sun, Settings, LogOut, Bell, Shield, ChevronRight, ArrowLeft } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import Modal from './Modal';
import api from '../utils/api';
import PasswordInput from './PasswordInput';
import { clearToken } from '../utils/token';
import { useConfirm } from './ConfirmProvider';
import { useToast } from './Toast';
import {
  isPushSupported,
  isSubscribed,
  subscribeUser,
  unsubscribeUser,
  sendTestPush,
  getNotificationPermission,
} from '../utils/push';

type View = 'profile' | 'settings' | 'notifications' | 'security';

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
  const { theme, toggle: toggleTheme } = useTheme();
  const confirm = useConfirm();
  const { toast } = useToast();
  const [view, setView] = useState<View>('profile');
  const [user, setUser] = useState<any>(null);
  // P1: безопасность
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [pwErr, setPwErr] = useState('');
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Notification settings
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [settingsSavedAt, setSettingsSavedAt] = useState<number | null>(null);
  const [settingsSnap, setSettingsSnap] = useState('');
  const settingsSig = JSON.stringify(settings);
  const notificationsDirty = view === 'notifications' && settingsSnap !== '' && settingsSig !== settingsSnap;

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
        const merged = {
          ...DEFAULT_SETTINGS,
          ...res.data.user.notificationSettings,
          quietHours: {
            ...DEFAULT_SETTINGS.quietHours,
            ...(res.data.user.notificationSettings.quietHours || {}),
          },
        };
        setSettings(merged);
        setSettingsSnap(JSON.stringify(merged));
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
    const ok = await confirm({
      title: 'Выйти из аккаунта?',
      message: 'Вам нужно будет снова войти по логину и паролю.',
      confirmLabel: 'Выйти',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.post('/api/auth/logout', {});
    } catch {
      // даже если сервер недоступен — выходим локально
    }
    clearToken();
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
        const merged = {
          ...DEFAULT_SETTINGS,
          ...res.data.user.notificationSettings,
          quietHours: {
            ...DEFAULT_SETTINGS.quietHours,
            ...(res.data.user.notificationSettings.quietHours || {}),
          },
        };
        setSettings(merged);
        setSettingsSnap(JSON.stringify(merged));
      }
      setSettingsSavedAt(Date.now());
      toast('Настройки уведомлений сохранены', 'success');
    } catch (err: any) {
      const m = err.response?.data?.message || 'Не удалось сохранить настройки';
      setSettingsError(m);
      toast(m, 'error');
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

  const handleClose = async () => {
    if (notificationsDirty) {
      const ok = await confirm({
        title: 'Есть несохранённые данные',
        message: 'Изменения будут потеряны. Закрыть форму?',
        confirmLabel: 'Закрыть',
        danger: true,
      });
      if (!ok) return;
      // откат к снимку
      try { setSettings(JSON.parse(settingsSnap)); } catch {}
    }
    setView('profile');
    onClose();
  };

  const handleBack = async () => {
    if (notificationsDirty) {
      const ok = await confirm({
        title: 'Есть несохранённые данные',
        message: 'Изменения будут потеряны. Закрыть форму?',
        confirmLabel: 'Закрыть',
        danger: true,
      });
      if (!ok) return;
      try { setSettings(JSON.parse(settingsSnap)); } catch {}
    }
    setView('settings');
  };

  const initials = (user?.username || '?').trim().charAt(0).toUpperCase();
  const permission = getNotificationPermission();

  const title =
    view === 'settings' ? 'Настройки' :
    view === 'notifications' ? 'Уведомления' :
    view === 'security' ? 'Безопасность' :
    'Профиль';

  return (
    <Modal open={open} onClose={handleClose} title={title} className="modal-content--profile">
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
              <span className="profile-menu-icon"><Settings size={18} /></span>
              <span className="profile-menu-label">Настройки</span>
              <span className="profile-menu-arrow"><ChevronRight size={18} /></span>
            </button>
            <button
              type="button"
              className="profile-menu-item profile-menu-item--danger"
              onClick={handleLogout}
            >
              <span className="profile-menu-icon"><LogOut size={18} /></span>
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
            <ArrowLeft size={16} /> Назад
          </button>
          <div className="profile-menu">
            <button
              type="button"
              className="profile-menu-item"
              onClick={() => setView('notifications')}
            >
              <span className="profile-menu-icon"><Bell size={18} /></span>
              <span className="profile-menu-label">Уведомления</span>
              <span className="profile-menu-arrow"><ChevronRight size={18} /></span>
            </button>
            <button
              type="button"
              className="profile-menu-item"
              onClick={() => setView('security')}
            >
              <span className="profile-menu-icon"><Shield size={18} /></span>
              <span className="profile-menu-label">Безопасность</span>
              <span className="profile-menu-arrow"><ChevronRight size={18} /></span>
            </button>
          </div>

          <div className="settings-section-title">Внешний вид</div>
          <div className="theme-toggle-row">
            <span className="theme-toggle-label">
              {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />} Тёмная тема
            </span>
            <button
              type="button"
              className={'ve-toggle' + (theme === 'dark' ? ' ve-toggle--on' : '')}
              onClick={toggleTheme}
              role="switch"
              aria-checked={theme === 'dark'}
              aria-label="Тёмная тема"
            >
              <span className="ve-toggle-knob" />
            </button>
          </div>

          <div className="settings-section-title">Часовой пояс</div>
          <div className="settings-section">
            <label className="input-label" htmlFor="tz-select">Зона (IANA)</label>
            <select
              id="tz-select"
              className="input"
              value={user?.timezone || ''}
              onChange={async (e) => {
                const tz = e.target.value || null;
                try {
                  const r = await api.put('/api/users/timezone', { timezone: tz });
                  setUser(r.data.user);
                  toast('Часовой пояс сохранён', 'success');
                } catch (err: any) {
                  const m = err?.response?.data?.message || 'Не удалось сохранить часовой пояс';
                  setError(m);
                  toast(m, 'error');
                }
              }}
            >
              <option value="">Авто (по устройству)</option>
              {['Europe/Moscow','Europe/Kaliningrad','Europe/Samara','Asia/Yekaterinburg','Asia/Omsk','Asia/Krasnoyarsk','Asia/Irkutsk','Asia/Yakutsk','Asia/Vladivostok','Asia/Magadan','Asia/Kamchatka','UTC','Europe/London','Europe/Berlin','Europe/Paris','Asia/Almaty','Asia/Tbilisi','Asia/Dubai','Asia/Tokyo','America/New_York','America/Los_Angeles'].map((z) => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* ============ SECURITY (P1) ============ */}
      {!loading && user && view === 'security' && (
        <div className="settings-view">
          <button type="button" className="settings-back" onClick={() => setView('settings')}><ArrowLeft size={16} /> Назад</button>

          <div className="settings-section">
            <h4 className="settings-section-title">Смена пароля</h4>
            <PasswordInput value={oldPw} onChange={setOldPw} placeholder="Текущий пароль" autoComplete="current-password" />
            <div style={{ height: 8 }} />
            <PasswordInput value={newPw} onChange={setNewPw} placeholder="Новый пароль (мин. 10)" autoComplete="new-password" />
            {pwErr && <p style={{ color: 'var(--color-danger)', fontSize: 14 }}>{pwErr}</p>}
            {pwMsg && <p style={{ color: 'var(--color-success)', fontSize: 14 }}>{pwMsg}</p>}
            <button
              type="button"
              className="button button--sm"
              style={{ marginTop: 8 }}
              disabled={!oldPw || newPw.length < 10}
              onClick={async () => {
                setPwErr(''); setPwMsg('');
                try {
                  await api.post('/api/auth/change-password', { oldPassword: oldPw, newPassword: newPw });
                  setOldPw(''); setNewPw(''); setPwMsg('Пароль изменён');
                  toast('Пароль изменён', 'success');
                } catch (e: any) {
                  const m = e?.response?.data?.message || 'Не удалось изменить пароль';
                  setPwErr(m);
                  toast(m, 'error');
                }
              }}
            >Сохранить пароль</button>
          </div>

          <div className="settings-section">
            <h4 className="settings-section-title">Активные сессии</h4>
            <button type="button" className="button button--sm" style={{ marginBottom: 8 }} onClick={async () => {
              const r = await api.get('/api/auth/sessions');
              setSessions(r.data?.sessions || []);
            }}>Показать сессии</button>
            {sessions.map((s) => (
              <div key={s.id} className="session-row">
                <span>{new Date(s.createdAt).toLocaleString('ru-RU')}</span>
                {s.current && <span className="session-current">текущая</span>}
              </div>
            ))}
            <button
              type="button"
              className="button button--danger-outline button--sm"
              style={{ marginTop: 8 }}
              onClick={async () => {
                const ok = await confirm({ title: 'Выйти на всех устройствах?', message: 'Все сессии, кроме текущей, будут завершены.', confirmLabel: 'Выйти везде', danger: true });
                if (!ok) return;
                await api.post('/api/auth/logout-all');
                clearToken();
                window.location.href = '/login';
              }}
            >Выйти везде</button>
          </div>
        </div>
      )}

      {/* ============ NOTIFICATIONS ============ */}
      {!loading && user && view === 'notifications' && (
        <div className="settings-view">
          <button
            type="button"
            className="settings-back"
            onClick={handleBack}
          >
            <ArrowLeft size={16} /> Назад
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