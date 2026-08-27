import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        {/* Apply saved theme before first paint (prevents dark/light flash) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('gcw_theme')||(window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');document.documentElement.classList.add(t)}catch(e){document.documentElement.classList.add('dark')}`,
          }}
        />
        {/* OneSignal push notifications: set NEXT_PUBLIC_ONESIGNAL_APP_ID to enable */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.OneSignalDeferred=window.OneSignalDeferred||[];OneSignalDeferred.push(function(OneSignal){if('${process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || ''}')OneSignal.init({appId:'${process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || ''}',safari_web_id:null,notifyButton:{enable:true}})});`,
          }}
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
