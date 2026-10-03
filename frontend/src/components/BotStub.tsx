import React from 'react';
import { Bot, Sparkles } from 'lucide-react';
import Modal from './Modal';

interface BotStubProps {
  open: boolean;
  onClose: () => void;
}

/** Временная заглушка бота: функционал в разработке. */
const BotStub: React.FC<BotStubProps> = ({ open, onClose }) => (
  <Modal open={open} onClose={onClose} title="Помощник">
    <div className="bot-stub">
      <div className="bot-stub-icon"><Bot size={40} /></div>
      <h3 className="bot-stub-title">Помощник ещё собирает мысли</h3>
      <p className="bot-stub-text">
        Мы учим его понимать задачи, находить нужное в базе знаний и подсказывать,
        что делать дальше. Пока он медитирует над кодом — загляните чуть позже.
      </p>
      <p className="bot-stub-note"><Sparkles size={14} /> Скоро здесь будет умный ассистент</p>
    </div>
  </Modal>
);

export default BotStub;
