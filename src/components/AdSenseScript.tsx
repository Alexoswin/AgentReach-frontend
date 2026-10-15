export const ADSENSE_CLIENT = 'ca-pub-4959410237537132';

/**
 * Google AdSense (Auto ads) for the public pages only; the signed-in app has
 * no ads. React hoists this async script into <head> and loads it once, which
 * is where AdSense looks for it when it checks the site.
 */
export default function AdSenseScript() {
  return (
    <script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
      crossOrigin="anonymous"
    />
  );
}
