import React, { useState } from 'react';
import { Check, Copy, Mail } from 'lucide-react';
import Modal from './Modal';
import { SUPPORT_EMAIL, APP_VERSION, APP_TAGLINE, buildMailto } from '../utils/support';

interface AboutModalProps {
  open: boolean;
  onClose: () => void;
}

const AboutModal: React.FC<AboutModalProps> = ({ open, onClose }) => {
  const [copied, setCopied] = useState(false);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(SUPPORT_EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard недоступен */
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="О приложении">
      <div className="about">
        <h3 className="about-name">DoskaDel</h3>
        <p className="about-tagline">{APP_TAGLINE}</p>
        <p className="about-version">Версия {APP_VERSION}</p>

        <div className="about-mail">
          <Mail size={16} />
          <a href={buildMailto('DoskaDel: обратная связь')} className="about-mail-link">{SUPPORT_EMAIL}</a>
          <button type="button" className="about-copy" onClick={copyEmail} title="Скопировать адрес" aria-label="Скопировать адрес">
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </div>

        <a
          href={buildMailto(`DoskaDel: баг [v${APP_VERSION}]`, ['Что случилось / что ожидал(а):', '', ''])}
          className="about-report"
        >
          Сообщить о проблеме
        </a>
      </div>
    </Modal>
  );
};

export default AboutModal;
