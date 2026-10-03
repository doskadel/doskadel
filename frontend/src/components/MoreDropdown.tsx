import React, { Fragment, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, Transition } from '@headlessui/react';
import { MoreHorizontal, ChevronDown, ExternalLink } from 'lucide-react';
import { buildMoreItems } from '../utils/moreItems';
import AboutModal from './AboutModal';

/**
 * Десктопное меню «Ещё ▾» — рендерится из единого реестра.
 * A11y обеспечивает headlessui Menu.
 */
const MoreDropdown: React.FC = () => {
  const location = useLocation();
  const [aboutOpen, setAboutOpen] = useState(false);

  const items = buildMoreItems({ openAbout: () => setAboutOpen(true) }).filter((i) => i.desktop !== false);

  if (items.length === 0) return null;

  const isAnyActive = items.some((i) => i.kind === 'route' && i.to && location.pathname.startsWith(i.to));

  const groups: Array<{ key: 'main' | 'modals' | 'external'; title: string | null }> = [
    { key: 'main', title: null },
    { key: 'modals', title: 'Окна' },
    { key: 'external', title: 'Ссылки' },
  ];

  return (
    <>
      <Menu as="div" className="more-dd-wrap">
        {({ open }) => (
          <>
            <Menu.Button
              className={'layout-nav-link more-dd-btn' + (isAnyActive ? ' layout-nav-link--active' : '')}
              aria-haspopup="menu"
            >
              <MoreHorizontal size={18} />
              <span>Ещё</span>
              <ChevronDown size={14} />
            </Menu.Button>
            <Transition
              as={Fragment}
              enter="fb-tr-enter" enterFrom="fb-tr-from" enterTo="fb-tr-to"
              leave="fb-tr-enter" leaveFrom="fb-tr-to" leaveTo="fb-tr-from"
            >
              <Menu.Items className="more-dd-panel" static>
                {groups.map((g) => {
                  const list = items.filter((i) => (i.group || 'main') === g.key);
                  if (list.length === 0) return null;
                  return (
                    <div key={g.key} className="more-dd-group">
                      {g.title && <div className="more-dd-group-title">{g.title}</div>}
                      {list.map((item) => (
                        <Menu.Item key={item.id}>
                          {({ close }) => {
                            if (item.kind === 'route' && item.to) {
                              return (
                                <Link to={item.to} className="more-dd-item" onClick={close}>
                                  {item.icon}<span>{item.label}</span>
                                </Link>
                              );
                            }
                            if (item.kind === 'external' && item.href) {
                              return (
                                <a href={item.href} target="_blank" rel="noopener noreferrer" className="more-dd-item" onClick={close}>
                                  {item.icon}{item.externalLink !== false && <ExternalLink size={14} className="more-dd-ext" />}<span>{item.label}</span>
                                </a>
                              );
                            }
                            return (
                              <button type="button" className="more-dd-item" onClick={() => { item.action?.(); close(); }}>
                                {item.icon}<span>{item.label}</span>
                              </button>
                            );
                          }}
                        </Menu.Item>
                      ))}
                    </div>
                  );
                })}
              </Menu.Items>
            </Transition>
          </>
        )}
      </Menu>
      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </>
  );
};

export default MoreDropdown;
