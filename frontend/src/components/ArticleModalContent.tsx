import React from 'react';
import { Article } from '../hooks/useArticleDetail';
import RichTextEditor from './editor/RichTextEditor';
import RichTextRenderer from './editor/RichTextRenderer';
import { removeAttachmentFromJson, toggleChecklistItem } from './editor/normalize';
import api from '../utils/api';
import TagSelector from './tags/TagSelector';
import LinkedEntities from './links/LinkedEntities';
import CommentSection from './comments/CommentSection';
import AttachmentBlock from './attachments/AttachmentBlock';
import { uploadAttachment, notifyAttachmentsChanged } from '../utils/attachments';
import EntityLayout from './entity/EntityLayout';

interface ArticleModalContentProps {
  article: Article | null;
  loading: boolean;
  error: string;
  isEditing: boolean;
  editTitle: string;
  editContent: string;
  editContentJson: any;
  editTagIds: string[];
  saving: boolean;
  setEditTitle: (v: string) => void;
  setEditContent: (v: string) => void;
  setEditContentJson: (v: any) => void;
  setEditTagIds: (v: string[]) => void;
  onSave: () => void;
  onCancel: () => void;
  onChecklistSaved?: () => void;
}

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="entity-aside-field">
    <span className="entity-aside-label">{label}</span>
    {children}
  </div>
);

const ArticleModalContent: React.FC<ArticleModalContentProps> = ({
  article, loading, error, isEditing, editTitle, editContent, editContentJson, editTagIds, saving,
  setEditTitle, setEditContent, setEditContentJson, setEditTagIds, onSave, onCancel, onChecklistSaved,
}) => {
  const checklistBase = React.useRef<any>(null);
  React.useEffect(() => { checklistBase.current = null; }, [article?.contentJson]);

  if (loading) return <p>Загрузка...</p>;
  if (error) return <p style={{ color: 'var(--color-danger)' }}>{error}</p>;
  if (!article) return null;

  const head = isEditing ? (
    <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="input" placeholder="Заголовок" required />
  ) : null;

  const body = isEditing ? (
    <RichTextEditor
      value={editContentJson}
      initialMarkdown={editContent}
      onChange={(json, md) => { setEditContentJson(json); setEditContent(md); }}
      placeholder="Введите текст статьи..."
      onUploadFile={async (file) => {
        try {
          const att = await uploadAttachment(file, { ownerType: 'article', ownerId: article._id });
          notifyAttachmentsChanged();
          return { id: att._id, filename: att.filename, mime: att.mime };
        } catch { return null; }
      }}
    />
  ) : (
    <RichTextRenderer
      contentJson={article.contentJson}
      markdown={article.content}
      onToggleCheck={(idx, checked) => {
        if (!article.contentJson) return;
        const base = checklistBase.current || article.contentJson;
        const next = toggleChecklistItem(base, idx, checked);
        checklistBase.current = next;
        api.put(`/api/articles/${article._id}`, { contentJson: next })
          .then(() => onChecklistSaved?.())
          .catch(() => {});
      }}
    />
  );

  const extras = (
    <>
      <AttachmentBlock
        ownerType="article"
        ownerId={article._id}
        readOnly={!isEditing}
        onDeleted={isEditing ? (att) => setEditContentJson((prev: any) => removeAttachmentFromJson(prev, att._id)) : undefined}
      />
      <LinkedEntities ownerType="article" ownerId={article._id} onOpen={(t, id) => window.open(t === 'task' ? `/tasks?task=${id}` : `/knowledge?article=${id}`, '_blank')} />
      {!isEditing && <CommentSection ownerType="article" ownerId={article._id} />}
    </>
  );

  const aside = isEditing ? (
    <>
      <Field label="Теги"><TagSelector value={editTagIds} onChange={setEditTagIds} /></Field>
    </>
  ) : (
    <>
      <Field label="Теги"><TagSelector value={Array.isArray(article.tagIds) ? article.tagIds : []} onChange={() => {}} readOnly /></Field>
      <Field label="Создано"><span className="entity-aside-value">{new Date(article.createdAt).toLocaleString('ru-RU')}</span></Field>
      <Field label="Обновлено"><span className="entity-aside-value">{new Date(article.updatedAt).toLocaleString('ru-RU')}</span></Field>
    </>
  );

  const footer = isEditing ? (
    <>
      <button type="button" className="button" onClick={onCancel} disabled={saving} style={{ backgroundColor: 'var(--color-text-muted)' }}>Отмена</button>
      <button type="button" className="button" onClick={onSave} disabled={saving || !editTitle.trim()}>{saving ? 'Сохранение…' : 'Сохранить'}</button>
    </>
  ) : null;

  return <EntityLayout head={head} body={body} extras={extras} aside={aside} asideTitle="Информация о статье" footer={footer} />;
};

export default ArticleModalContent;
