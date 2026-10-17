import React from 'react';

interface Props {
  head: React.ReactNode;
  body: React.ReactNode;
  extras?: React.ReactNode;
  aside: React.ReactNode;
  asideTitle?: string;
}

/**
 * Единая раскладка модалки статьи/задачи (просмотр, редактирование, создание).
 * Десктоп: head/body/extras слева, aside справа (300px, sticky).
 * Мобила: head, aside (свёрнутый «Свойства»), body, extras.
 */
const EntityLayout: React.FC<Props> = ({ head, body, extras, aside, asideTitle = 'Свойства' }) => {
  const [asideOpen, setAsideOpen] = React.useState(false);
  return (
    <div className="entity-layout">
      <div className="entity-head">{head}</div>
      <div className="entity-body">{body}</div>
      <div className="entity-extras">{extras}</div>
      <aside className="entity-aside">
        <button type="button" className="entity-aside-toggle" onClick={() => setAsideOpen((v) => !v)} aria-expanded={asideOpen}>
          {asideTitle} <span className="entity-aside-caret">{asideOpen ? '▴' : '▾'}</span>
        </button>
        <div className={'entity-aside-inner' + (asideOpen ? ' entity-aside-inner--open' : '')}>
          {aside}
        </div>
      </aside>
    </div>
  );
};

export default EntityLayout;
