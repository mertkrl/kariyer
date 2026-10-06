import { memo, useState } from 'react';
import { audioEngine } from '../../../audio/audioEngine';
import { DISTRICTS, HALIC, HOME, MODE_ICON, OFFICE, PARKS, ROADS, SEA, STREETS, H, W, congestionColor, smooth, trafficAt } from './traffic/trafficModel';
import { useMapView } from './traffic/useMapView';
import { RouteSheet } from './traffic/RouteSheet';
import styles from './TrafficApp.module.css';

/*
 * "Trafik": navigasyon uygulaması tarzında bir İstanbul haritası. Açık renkli kara, mavi su (Boğaz,
 * Haliç, Marmara), parklar, sokak dokusu, üstünde canlı trafik katmanı olan sarı otoyollar ve
 * Ataşehir'deki ofisten Bağcılar'daki eve yol: her gün Boğaz'ı geçen bir yolculuk. Sıkıştırmasız yakınlaştırma (+/−, tekerlek) ve
 * sürükleyerek kaydırma. Yoğunluk 15:30'dan itibaren artar, hava her şeyi yavaşlatır.
 *
 * Harita verisi ve trafik modeli traffic/trafficModel.ts'de, kaydırma/yakınlaştırma useMapView'da.
 */

export function TrafficApp({ minutes, weatherPenalty }: { minutes: number; weatherPenalty: number }) {
  const [routeId, setRouteId] = useState('carTem');
  const [incident, setIncident] = useState<string | null>(null);
  const { view, svgRef, zoom, reset, handlers } = useMapView();
  const { rush, levels, eta, available, best, incidents } = trafficAt(minutes, weatherPenalty);
  const route = available.find((r) => r.id === routeId) ?? available[0];

  const k = view.k;
  const label = (size: number) => ({ fontSize: size / k });

  return (
    <div className={styles.traffic}>
      <div className={styles.search}>
        <span className={styles.searchDots}>
          <i className={styles.dotFrom} />
          <i className={styles.dotLine} />
          <i className={styles.dotTo} />
        </span>
        <span className={styles.searchFields}>
          <span>Ofis · Ataşehir</span>
          <span>Ev · Bağcılar</span>
        </span>
        <span className={styles.live}>
          <i /> CANLI
        </span>
      </div>

      <div className={styles.mapWrap}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid slice"
          className={styles.map}
          {...handlers}
        >
          <defs>
            <pattern id="trBlocksA" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(14)">
              <rect width="9" height="9" fill="#efece5" />
              <rect x="0.7" y="0.7" width="7.6" height="7.6" rx="0.6" fill="#e6e2d9" />
            </pattern>
            <pattern id="trBlocksB" width="7" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(-18)">
              <rect width="7" height="10" fill="#efece5" />
              <rect x="0.6" y="0.6" width="5.8" height="8.8" rx="0.6" fill="#e5e1d7" />
            </pattern>
            <pattern id="trBlocksC" width="10" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(32)">
              <rect width="10" height="8" fill="#efece5" />
              <rect x="0.7" y="0.7" width="8.6" height="6.6" rx="0.6" fill="#e6e2d9" />
            </pattern>
            <radialGradient id="trPulse">
              <stop offset="0" stopColor="#1a73e8" stopOpacity="0.35" />
              <stop offset="1" stopColor="#1a73e8" stopOpacity="0" />
            </radialGradient>
          </defs>

          <g transform={`translate(${view.x} ${view.y}) scale(${k})`}>
            <StaticLayers />

            {/* Yollar: kenar + taban + trafik katmanı + akış */}
            {ROADS.map((r, i) => {
              const hw = r.kind === 'highway';
              return (
                <g key={r.name}>
                  <path d={r.d} fill="none" stroke={hw ? '#e0a93b' : '#d6d0c2'} strokeWidth={hw ? 5 : 3.6} strokeLinecap="round" />
                  <path d={r.d} fill="none" stroke={hw ? '#fcd97c' : '#ffffff'} strokeWidth={hw ? 3.6 : 2.6} strokeLinecap="round" />
                  <path d={r.d} fill="none" stroke={congestionColor(levels[i])} strokeWidth={hw ? 2.2 : 1.6} strokeLinecap="round" />
                  <path
                    d={r.d}
                    fill="none"
                    stroke="#ffffff"
                    strokeOpacity={0.55}
                    strokeWidth={0.7}
                    strokeDasharray="0.8 5"
                    strokeLinecap="round"
                    className={styles.flow}
                    style={{ animationDuration: `${(1.2 + levels[i] * 6).toFixed(1)}s` }}
                  />
                </g>
              );
            })}

            {/* Raylı sistem: M4 + Marmaray (yeşil, Ataşehir → Yenikapı, Boğaz'ın altından) ve M1B (kırmızı, Yenikapı → Bağcılar) */}
            <path d={smooth([[312, 198], [292, 214], [266, 226], [248, 226], [224, 212], [200, 214], [180, 218], [156, 222]])} fill="none" stroke="#3aa655" strokeWidth={1} strokeDasharray="3 1.5" />
            <path d={smooth([[156, 222], [120, 214], [84, 192], [58, 170], [46, 152]])} fill="none" stroke="#d6453d" strokeWidth={1} strokeDasharray="3 1.5" />

            {/* Alternatif rotalar (gri), sonra seçili rota mavi */}
            {available
              .filter((r) => r.id !== route.id)
              .map((r) => (
                // aşağıdaki mod düğmelerine fare/dokunma kısayolu; klavyeyle onlar kullanılır
                <g key={r.id} className={styles.altRoute} onClick={() => setRouteId(r.id)} aria-hidden="true">
                  <path d={r.d} fill="none" stroke="#ffffff" strokeWidth={4.6} strokeLinecap="round" strokeLinejoin="round" />
                  <path d={r.d} fill="none" stroke="#a9bfdc" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={r.mode === 'car' ? undefined : '0.1 4'} />
                  <path d={r.d} fill="none" stroke="transparent" strokeWidth={12} />
                </g>
              ))}
            <path d={route.d} fill="none" stroke="#ffffff" strokeWidth={5.4} strokeLinecap="round" strokeLinejoin="round" />
            <path
              d={route.d}
              fill="none"
              stroke="#1a73e8"
              strokeWidth={route.mode === 'car' ? 3.6 : 3.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={route.mode === 'car' ? undefined : '0.1 4.4'}
              className={styles.routeDraw}
              key={route.id}
            />

            {/* Etiketler */}
            <text x="206" y="112" transform="rotate(-82 206 112)" className={styles.water} style={label(6)}>
              İstanbul Boğazı
            </text>
            <text x="92" y="270" className={styles.water} style={label(7.5)}>
              Marmara Denizi
            </text>
            <text x="148" y="200" transform="rotate(33 148 200)" className={styles.water} style={label(4.6)}>
              Haliç
            </text>
            {DISTRICTS.map((d) => (
              <text key={d.name} x={d.at[0]} y={d.at[1]} className={styles.district} style={label(5.2)}>
                {d.name}
              </text>
            ))}

            {/* Olaylar */}
            {incidents.map((inc) => (
              <g
                key={inc.label}
                transform={`translate(${inc.at[0]} ${inc.at[1]}) scale(${1 / k})`}
                className={styles.incident}
                onClick={(e) => {
                  e.stopPropagation();
                  setIncident(inc.label);
                  audioEngine.playUi('click');
                }}
              >
                <circle r="6.5" fill="#fff" stroke="#e8542f" strokeWidth="1.4" />
                <text y="2.6" className={styles.incidentIcon}>
                  {inc.icon}
                </text>
              </g>
            ))}

            {/* Süre baloncukları */}
            {available.map((r) => {
              const on = r.id === route.id;
              return (
                <g key={r.id} transform={`translate(${r.tag[0]} ${r.tag[1]}) scale(${1 / k})`} className={styles.bubble} onClick={() => setRouteId(r.id)} aria-hidden="true">
                  <rect x="-20" y="-8" width="40" height="16" rx="5" fill={on ? '#1a73e8' : '#ffffff'} stroke={on ? '#1a73e8' : '#c5ccd6'} strokeWidth="0.8" />
                  <text y="3.3" className={on ? styles.bubbleOn : styles.bubbleText}>
                    {MODE_ICON[r.mode]} {eta(r)} dk
                  </text>
                </g>
              );
            })}

            {/* Ev iğnesi + sen (ofis) */}
            <g transform={`translate(${HOME[0]} ${HOME[1]}) scale(${1 / k})`}>
              <path d="M0 0 C-2 -5 -7 -8 -7 -13 A7 7 0 1 1 7 -13 C7 -8 2 -5 0 0 Z" fill="#ea4335" stroke="#b3261e" strokeWidth="0.8" />
              <circle cy="-13" r="2.6" fill="#7a1a14" />
              <text y="-23" className={styles.pinLabel}>Ev</text>
            </g>
            <g transform={`translate(${OFFICE[0]} ${OFFICE[1]}) scale(${1 / k})`}>
              <circle r="16" fill="url(#trPulse)" className={styles.pulse} />
              <circle r="5.2" fill="#ffffff" />
              <circle r="3.8" fill="#1a73e8" />
              <text y="-9" className={styles.pinLabel}>Ofis</text>
            </g>
          </g>
        </svg>

        <div className={styles.controls}>
          <button onClick={() => zoom(1.35)} aria-label="Yakınlaştır">
            +
          </button>
          <button onClick={() => zoom(1 / 1.35)} aria-label="Uzaklaştır">
            −
          </button>
        </div>
        <button className={styles.recenter} onClick={reset} aria-label="Konumuma dön">
          <svg viewBox="0 0 20 20">
            <circle cx="10" cy="10" r="4" fill="#1a73e8" />
            <circle cx="10" cy="10" r="7" fill="none" stroke="#1a73e8" strokeWidth="1.6" />
            <path d="M10 1v3M10 16v3M1 10h3M16 10h3" stroke="#1a73e8" strokeWidth="1.6" />
          </svg>
        </button>
        <div className={styles.scale}>
          <i />
          {k > 2 ? '500 m' : '1 km'}
        </div>
        <div className={styles.legend}>
          <span>Hızlı</span>
          <i style={{ background: '#2fb266' }} />
          <i style={{ background: '#f5a623' }} />
          <i style={{ background: '#e8542f' }} />
          <i style={{ background: '#a4161a' }} />
          <span>Yavaş</span>
        </div>
        {incident && (
          <button className={styles.toast} onClick={() => setIncident(null)}>
            {incident}
          </button>
        )}
      </div>

      <RouteSheet route={route} best={best} eta={eta} rush={rush} minutes={minutes} onPick={setRouteId} />
    </div>
  );
}

/**
 * Kara, parklar, su ve sokaklar: hiç değişmezler; bu yüzden bir kez çizilirler ve harita her
 * sürükleme ya da yakınlaştırma adımında yeniden çizilirken atlanırlar.
 */
const StaticLayers = memo(function StaticLayers() {
  return (
    <>
      {/* İlçeye özgü sokak ızgaralarıyla kara */}
      <rect x="-40" y="-40" width={W + 80} height={H + 80} fill="#f1efe9" />
      <rect x="-40" y="40" width="190" height="220" fill="url(#trBlocksA)" />
      <rect x="130" y="40" width="80" height="200" fill="url(#trBlocksB)" />
      <rect x="200" y="60" width="200" height="200" fill="url(#trBlocksC)" />

      {PARKS.map((d, i) => (
        <path key={i} d={d} fill="#c9e7c1" />
      ))}

      {/* Su */}
      <path d={SEA} fill="#aad3df" />
      <path d={HALIC} fill="#aad3df" />
      <path d={SEA} fill="none" stroke="#9cc6d3" strokeWidth={0.8} />
      <circle cx="206" cy="227" r="1.1" fill="#f1efe9" stroke="#9cc6d3" strokeWidth="0.3" />
      <ellipse cx="300" cy="292" rx="7" ry="4" fill="#f1efe9" />
      <ellipse cx="318" cy="286" rx="4" ry="2.5" fill="#f1efe9" />

      {/* Sokaklar */}
      {STREETS.map((d, i) => (
        <g key={i}>
          <path d={d} fill="none" stroke="#d9d4c8" strokeWidth={2.4} strokeLinecap="round" />
          <path d={d} fill="none" stroke="#ffffff" strokeWidth={1.6} strokeLinecap="round" />
        </g>
      ))}
      {/* Galata köprüsü */}
      <path d="M178 224 L186 214" stroke="#ffffff" strokeWidth={1.6} />
    </>
  );
});
