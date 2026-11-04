import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

const responsiveGlobalStyles = `
html, body, #root {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  display: flex;
  flex: 1;
  flex-direction: column;
  background-color: #070A12;
  overflow: hidden;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Custom sleek scrollbar for web */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: #070A12;
}
::-webkit-scrollbar-thumb {
  background: #1E293B;
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: #00F0FF;
}
`;

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, viewport-fit=cover"
        />
        <title>Sky — Agentic AI & Schedule Assistant</title>
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: responsiveGlobalStyles }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

