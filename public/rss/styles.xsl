<?xml version="1.0" encoding="UTF-8"?>
<!--
  Browsers stopped rendering RSS years ago, so a feed URL looks broken to a person even
  when it is perfectly valid. This stylesheet gives the feed a readable page in a browser
  while leaving the XML untouched for actual feed readers.
-->
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>

  <xsl:template match="/">
    <html lang="en">
      <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title><xsl:value-of select="/rss/channel/title"/></title>
        <style>
          :root {
            --bg: #fafafa; --card: #ffffff; --text: #09090b;
            --muted: #71717a; --accent: #7c3aed; --line: rgba(0,0,0,.1);
          }
          @media (prefers-color-scheme: dark) {
            :root {
              --bg: #09090b; --card: #121215; --text: #f4f4f5;
              --muted: #a1a1aa; --accent: #a78bfa; --line: rgba(255,255,255,.08);
            }
          }
          * { box-sizing: border-box; }
          body {
            margin: 0; padding: 3rem 1rem 5rem;
            background: var(--bg); color: var(--text);
            font-family: Inter, system-ui, -apple-system, sans-serif;
            line-height: 1.6;
          }
          .wrap { max-width: 42rem; margin: 0 auto; }
          .kicker {
            font-family: ui-monospace, "JetBrains Mono", monospace;
            font-size: .6875rem; letter-spacing: .2em; text-transform: uppercase;
            color: var(--muted); margin: 0 0 .75rem;
          }
          h1 {
            font-family: Newsreader, Georgia, serif;
            font-size: clamp(2rem, 4vw, 3rem); line-height: 1.15;
            letter-spacing: -.02em; margin: 0 0 .75rem; font-weight: 600;
          }
          .lede { color: var(--muted); margin: 0 0 1.5rem; }
          .note {
            background: var(--card); border: 1px solid var(--line);
            border-radius: .75rem; padding: 1rem 1.25rem; margin: 0 0 2.5rem;
            font-size: .875rem; color: var(--muted);
          }
          .note code {
            font-family: ui-monospace, "JetBrains Mono", monospace;
            font-size: .8125rem; color: var(--text);
            background: var(--bg); padding: .1rem .35rem; border-radius: .25rem;
            border: 1px solid var(--line); word-break: break-all;
          }
          a { color: var(--accent); text-decoration: none; }
          a:hover { text-decoration: underline; }
          a:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: .2rem; }
          article { padding: 1.5rem 0; border-top: 1px solid var(--line); }
          article h2 {
            font-family: Newsreader, Georgia, serif;
            font-size: 1.375rem; line-height: 1.25; margin: 0 0 .4rem; font-weight: 600;
          }
          .meta {
            font-family: ui-monospace, "JetBrains Mono", monospace;
            font-size: .6875rem; letter-spacing: .1em; text-transform: uppercase;
            color: var(--muted); margin: 0 0 .5rem;
          }
          article p.desc { margin: 0; color: var(--muted); }
          footer { margin-top: 3rem; font-size: .875rem; color: var(--muted); }
        </style>
      </head>
      <body>
        <div class="wrap">
          <p class="kicker">RSS Feed</p>
          <h1><xsl:value-of select="/rss/channel/title"/></h1>
          <p class="lede"><xsl:value-of select="/rss/channel/description"/></p>

          <div class="note">
            This is a web feed. Paste the address below into a feed reader to get new
            entries automatically.
            <br/><br/>
            <code><xsl:value-of select="/rss/channel/link"/>journal/rss.xml</code>
            <br/><br/>
            <a href="{/rss/channel/link}journal/">← Back to the journal</a>
          </div>

          <xsl:for-each select="/rss/channel/item">
            <article>
              <p class="meta"><xsl:value-of select="pubDate"/></p>
              <h2><a href="{link}"><xsl:value-of select="title"/></a></h2>
              <p class="desc"><xsl:value-of select="description"/></p>
            </article>
          </xsl:for-each>

          <footer>
            <a href="{/rss/channel/link}">vasuambasana.com</a>
          </footer>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
