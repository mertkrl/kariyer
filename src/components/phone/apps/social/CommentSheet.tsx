import type { Post } from './socialTypes';
import styles from '../SocialApp.module.css';
import own from './CommentSheet.module.css';

const COMMENT_CHOICES = ['Çok haklısın 👏', 'Geçmiş olsun 🙏', 'Hahaha 😂', 'Pes etme 💪', 'Harika kare 😍'];

interface CommentSheetProps {
  post: Post;
  onComment: (text: string) => void;
  onClose: () => void;
}

/** Bir gönderinin yorumlarını ve seçilecek hızlı cevapları gösteren alt sayfa. */
export function CommentSheet({ post, onComment, onClose }: CommentSheetProps) {
  return (
    <div className={own.sheetScrim} onClick={onClose}>
      <div className={own.sheet} onClick={(e) => e.stopPropagation()}>
        <span className={own.grabber} />
        <strong className={own.sheetTitle}>Yorumlar</strong>
        <div className={own.sheetList}>
          {post.comments.length === 0 && <div className={styles.empty}>İlk yorumu sen yap.</div>}
          {post.comments.map((c, i) => (
            <div key={i} className={`${own.commentRow} ${c.mine ? own.commentMine : ''}`}>
              <b>{c.author}</b> {c.text}
            </div>
          ))}
        </div>
        <div className={own.sheetChips}>
          {COMMENT_CHOICES.map((c) => (
            <button key={c} onClick={() => onComment(c)}>
              {c}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
