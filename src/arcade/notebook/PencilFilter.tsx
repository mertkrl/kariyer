/*
 * Kalem çizimi süzgeci: kartların düz renkli çizimlerini kâğıda kurşun kalemle çizilmiş resme
 * çevirir. Şekillerin kenarı ve içlerindeki açık-koyu farkları bulunur (Laplace), grafit renginde
 * ve kâğıdın dokusuyla hafif titreyerek çizilir. Açık şekillerin içi kâğıt beyazı kalır, koyu
 * şekiller (yol, gövde) kalemle gölgelenir. Zemindeki renkli kalem taraması CSS'tedir
 * (SalonParts.module.css). Sayfaya bir kez konur.
 */

const LAPLACE = '-1 -1 -1 -1 8 -1 -1 -1 -1';

export function PencilFilter() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <filter id="kalem-cizim" x="-4%" y="-4%" width="108%" height="108%" colorInterpolationFilters="sRGB">
        {/* açıklık: beyaz şekiller dolu, zemin ve koyu şekiller boş */}
        <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.33 0.33 0.33 0 0" result="lum" />
        {/* koyuluk: şeklin olduğu ama açık olmadığı yer */}
        <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -0.33 -0.33 -0.33 1 0" result="dark" />
        {/* kenarlar: şeklin dış çizgisi ve içindeki açık-koyu sınırları */}
        <feConvolveMatrix in="SourceAlpha" order="3" kernelMatrix={LAPLACE} edgeMode="none" preserveAlpha="false" result="outline" />
        <feConvolveMatrix in="lum" order="3" kernelMatrix={LAPLACE} edgeMode="none" preserveAlpha="false" result="inner" />
        <feMerge result="edges">
          <feMergeNode in="outline" />
          <feMergeNode in="inner" />
        </feMerge>
        <feComponentTransfer in="edges" result="edgeStrong">
          <feFuncA type="linear" slope="2.2" />
        </feComponentTransfer>
        {/* kâğıt dokusu: çizgi titrer, kalem yer yer silikleşir */}
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" result="grain" />
        <feDisplacementMap in="edgeStrong" in2="grain" scale="2.4" xChannelSelector="R" yChannelSelector="G" result="wobble" />
        <feComposite in="wobble" in2="grain" operator="arithmetic" k1="0" k2="1" k3="-0.3" k4="0.05" result="grainy" />
        <feFlood floodColor="#2b2620" />
        <feComposite in2="grainy" operator="in" result="ink" />
        {/* koyu şekiller: grenli kalem gölgesi */}
        <feComposite in="dark" in2="grain" operator="arithmetic" k1="0" k2="0.5" k3="-0.2" k4="0" result="shadeA" />
        <feFlood floodColor="#3b3a36" />
        <feComposite in2="shadeA" operator="in" result="shade" />
        {/* açık şekillerin içi: kâğıt beyazı */}
        <feFlood floodColor="#fbf8ef" floodOpacity="0.92" />
        <feComposite in2="lum" operator="in" result="paper" />
        <feMerge>
          <feMergeNode in="paper" />
          <feMergeNode in="shade" />
          <feMergeNode in="ink" />
        </feMerge>
      </filter>
    </svg>
  );
}
