import type { Post } from './socialTypes';
import styles from '../SocialApp.module.css';

const COMMENT_CHOICES = ['Çok haklısın 👏', 'Geçmiş olsun 🙏', 'Hahaha 😂', 'Pes etme 💪', 'Harika kare 😍'];

interface CommentSheetProps {
  post: Post;
  onComment: (text: string) => void;
  onClose: () => void;
}

/** Bottom sheet with a post's comments and quick replies to pick from. */
export function CommentSheet({ post, onComment, onClose }: CommentSheetProps) {
  return (
    <div className={styles.sheetScrim} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <span className={styles.grabber} />
        <strong className={styles.sheetTitle}>Yorumlar</strong>
        <div className={styles.sheetList}>
          {post.comments.length === 0 && <div className={styles.empty}>İlk yorumu sen yap.</div>}
          {post.comments.map((c, i) => (
            <div key={i} className={`${styles.commentRow} ${c.mine ? styles.commentMine : ''}`}>
              <b>{c.author}</b> {c.text}
            </div>
          ))}
        </div>
        <div className={styles.sheetChips}>
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
