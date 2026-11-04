import { useState } from 'react';
import type { ExamQuestion, ExamWidget } from '../data/questions';
import { audioEngine } from '../../../shared/audio/audioEngine';
import styles from './AppWidgets.module.css';
import { Bookshelf, CompanyLogo, LivingRoom } from './Backdrops';

/*
 * Ofis uygulamalarından sahneler: görüntülü görüşmede arka plan seçmek (yalnızca arka plan, kişi yok), cumartesi davetini
 * reddetmeye çalışmak, yöneticinin duyurusuna emoji bırakmak. Hepsi sonunda bir şık sırası verir;
 * `selected` daha önce verilen cevaptır, soruya geri dönülünce o hâliyle açılır.
 */

interface Props<T> {
  q: ExamQuestion;
  w: T;
  onAnswer: (option: number) => void;
  selected: number | null;
}

const click = () => audioEngine.playUi('click');

/* ── görüntülü görüşme arka planı ── */

const BG_SHORT = ['Salon', 'Kitaplık', 'Bulanık', 'Şirket logosu'];

function Backdrop({ i }: { i: number }) {
  return (
    <span className={`${styles.backdrop} ${i === 2 ? styles.bgBlur : ''}`} aria-hidden="true">
      {i === 1 ? <Bookshelf /> : i === 3 ? <CompanyLogo /> : <LivingRoom />}
    </span>
  );
}

export function BackgroundWidget({ q, onAnswer, selected }: Props<Extract<ExamWidget, { type: 'background' }>>) {
  const [bg, setBg] = useState(selected ?? 0);
  return (
    <div className={styles.call}>
      <div className={styles.preview}>
        <Backdrop i={bg} />
        <span className={styles.nameTag}>🎙 Siz</span>
        <span className={styles.callTime}>Toplantı 00:58 sonra başlıyor</span>
      </div>
      <div className={styles.bgPick} role="radiogroup" aria-label="Arka plan">
        {q.options.map((o, i) => (
          <button
            key={o}
            role="radio"
            aria-checked={bg === i}
            aria-label={o}
            className={`${styles.thumb} ${bg === i ? styles.thumbOn : ''}`}
            onClick={() => {
              click();
              setBg(i);
            }}
          >
            <span className={styles.thumbArt}>
              <Backdrop i={i} />
            </span>
            <span>{BG_SHORT[i]}</span>
          </button>
        ))}
      </div>
      <div className={styles.callBar}>
        <span>{selected === bg ? `✓ Toplantıdasınız · ${q.options[bg]}` : q.options[bg]}</span>
        <button
          className={styles.join}
          onClick={() => {
            click();
            onAnswer(bg);
          }}
        >
          Toplantıya katıl
        </button>
      </div>
    </div>
  );
}

/* ── takvim daveti ── */

const FILLER =
  'Değerli Genel Müdürlüğümüz, stratejik vizyonumuza duyduğum derin bağlılıkla ve ekip sinerjimizi en üst düzeyde tutma arzusuyla bu değerli kahvaltıya katılmayı gerçekten çok isterdim. Ne var ki önceden planlanmış kişisel sorumluluklarım nedeniyle bu kez katılım sağlayamayacağımı üzülerek bildirir, toplantı notlarını büyük bir heyecanla takip edeceğimi ve tüm kazanımları ekibime aktaracağımı saygılarımla arz ederim.';

const INVITE_STATUS = [
  'Takviminize eklendi. Cumartesiniz artık şirkete ait.',
  '"Belki" yanıtınız sistemde "Evet" olarak kaydedildi.',
  'Reddedildi. Gerekçeniz İK ile paylaşıldı ve dosyanıza eklendi.',
  'Davet takviminizde kaldı. Cumartesi görüşmek üzere!',
];

export function InviteWidget({ w, onAnswer, selected }: Props<Extract<ExamWidget, { type: 'invite' }>>) {
  const [declining, setDeclining] = useState(false);
  const [text, setText] = useState('');
  const answer = (i: number) => {
    click();
    setDeclining(false);
    onAnswer(i);
  };
  return (
    <div className={styles.mail}>
      <div className={styles.mailHead}>
        <span className={styles.sender} aria-hidden="true">
          GM
        </span>
        <div>
          <b>{w.from}</b>
          <small>Kime: Tüm Çalışanlar · 17:58</small>
        </div>
      </div>
      <div className={styles.invite}>
        <span className={styles.dateTile} aria-hidden="true">
          <small>CMT</small>
          <b>09:00</b>
        </span>
        <div>
          <b className={styles.inviteTitle}>{w.title}</b>
          <span>{w.when}</span>
          <small>412 davetli · 411 kabul etti · 1 yanıt bekleniyor (siz)</small>
        </div>
      </div>

      {declining ? (
        <div className={styles.decline}>
          <label htmlFor="decline-why">Reddetme nedeninizi açıklayın (en az {w.minChars} karakter)</label>
          <textarea id="decline-why" rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="Örn. Cumartesi çalışmıyorum." />
          <div className={styles.declineBar}>
            <span className={`mono ${text.length >= w.minChars ? styles.countOk : styles.count}`}>
              {text.length}/{w.minChars}
            </span>
            <button
              className={styles.ghost}
              onClick={() => {
                click();
                setText(FILLER);
              }}
            >
              ✨ Kurumsal gerekçe üret
            </button>
            <button className={styles.ghost} onClick={() => answer(3)}>
              Vazgeç
            </button>
            <button className={styles.danger} disabled={text.length < w.minChars} onClick={() => answer(2)}>
              Gönder
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.rsvp}>
          <button className={`${styles.rsvpBtn} ${selected === 0 ? styles.rsvpOn : ''}`} onClick={() => answer(0)}>
            ✓ Kabul et
          </button>
          <button className={`${styles.rsvpBtn} ${selected === 1 ? styles.rsvpOn : ''}`} onClick={() => answer(1)}>
            ? Belki
          </button>
          <button
            className={`${styles.rsvpBtn} ${selected === 2 || selected === 3 ? styles.rsvpOn : ''}`}
            onClick={() => {
              click();
              setDeclining(true);
            }}
          >
            ✕ Reddet
          </button>
        </div>
      )}
      {selected !== null && !declining && (
        <p className={styles.status} role="status">
          {INVITE_STATUS[selected]}
        </p>
      )}
    </div>
  );
}

/* ── emoji tepkisi ── */

export function ReactionWidget({ q, w, onAnswer, selected }: Props<Extract<ExamWidget, { type: 'reaction' }>>) {
  const none = q.options.length - 1;
  const [picker, setPicker] = useState(false);
  const mine = selected !== null && selected < none ? selected : null;
  const happy = mine !== null && mine < 3;
  const react = (i: number) => {
    click();
    setPicker(false);
    onAnswer(i);
  };
  return (
    <div className={styles.chat}>
      <div className={styles.msg}>
        <span className={styles.avatar} aria-hidden="true">
          BM
        </span>
        <div className={styles.msgBody}>
          <p className={styles.msgHead}>
            <b>{w.from}</b> <small>{w.at}</small> <span className={styles.pin}>📌 Sabitlendi</span>
          </p>
          <p className={styles.msgText}>{w.message}</p>
          <div className={styles.reactions}>
            {q.options.slice(0, none).map((e, i) => {
              const count = w.counts[i] + (mine === i ? 1 : 0);
              if (!count && mine !== i) return null;
              return (
                <button key={e} className={`${styles.react} ${mine === i ? styles.reactOn : ''}`} aria-pressed={mine === i} aria-label={`${e} tepkisi, ${count}`} onClick={() => react(i)}>
                  {e} <span className="mono">{count}</span>
                </button>
              );
            })}
            <button className={styles.addReact} aria-label="Tepki ekle" aria-expanded={picker} onClick={() => setPicker((p) => !p)}>
              ☺+
            </button>
            {picker && (
              <div className={styles.picker} role="menu">
                {q.options.slice(0, none).map((e, i) => (
                  <button key={e} role="menuitem" onClick={() => react(i)}>
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className={styles.chatBar}>
        <button className={`${styles.ghost} ${selected === none ? styles.ghostOn : ''}`} onClick={() => react(none)}>
          {q.options[none]}
        </button>
        {mine !== null && (
          <span className={happy ? styles.toastOk : styles.toastBad} role="status">
            {happy ? '✓ Tepkiniz bağlılık panosuna işlendi: +3 puan' : '👀 Tepkiniz Bölge Müdürü\'ne iletildi. Sizi "kısa bir görüşmeye" davet etti.'}
          </span>
        )}
        {selected === none && <span className={styles.toastBad}>Okundu bilgisi gönderildi. Tepki vermediğiniz not edildi.</span>}
      </div>
    </div>
  );
}
