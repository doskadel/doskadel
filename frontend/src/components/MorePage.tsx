import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { buildMoreItems } from '../utils/moreItems';
import AboutModal from './AboutModal';

/**
 * «Ещё» (мобилка) — рендерится из единого реестра.
 * Пункты добавляются одной записью в utils/moreItems.
 */
const MorePage: React.FC = () => {
  const [aboutOpen, setAboutOpen] = useState(false);
  const items = buildMoreItems({ openAbout: () => setAboutOpen(true) }).filter((i) => i.mobile !== false);

  return (
    <div className="more-page">
      <h2 className="page-title">Ещё</h2>
      {items.length > 0 && (
        <div className="more-page-list">
          {items.map((item) => {
            if (item.kind === 'route' && item.to) {
              return (
                <Link key={item.id} to={item.to} className="more-page-item">
                  <span className="more-page-icon">{item.icon}</span>
                  <span className="more-page-label">{item.label}</span>
                </Link>
              );
            }
            if (item.kind === 'external' && item.href) {
              return (
                <a key={item.id} href={item.href} target="_blank" rel="noopener noreferrer" className="more-page-item">
                  <span className="more-page-icon">{item.icon || <ExternalLink size={20} />}</span>
                  <span className="more-page-label">{item.label}</span>
                  {item.externalLink !== false && <ExternalLink size={16} className="more-page-ext" />}
                </a>
              );
            }
            return (
              <button key={item.id} type="button" className="more-page-item" onClick={() => item.action?.()}>
                <span className="more-page-icon">{item.icon}</span>
                <span className="more-page-label">{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
};

export default MorePage;
