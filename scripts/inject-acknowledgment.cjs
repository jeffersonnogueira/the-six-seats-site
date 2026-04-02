const fs = require('fs');
const path = require('path');

const root = process.cwd();

const htmlFiles = [
  'index.html',
  'quem-somos.html',
  'o-que-oferecemos.html',
  'subscriptions.html',
  'aaron-app.html',
  'aaron-login.html',
  'aaron-settings.html',
];

const cssFile = path.join(root, 'assets', 'css', 'style.css');

const footerBlock = `
<p class="footer-disclaimer">
  Educational and informational content only. It does not constitute financial, legal, or tax advice.
  <a href="acknowledgment.html">Read full acknowledgment</a>.
</p>
`;

const subscriptionBlock = `
<p class="subscription-note">
  By subscribing, you acknowledge that this content is educational only and not individualized financial advice.
  <a href="acknowledgment.html">Read full acknowledgment</a>.
</p>
`;

const cssBlock = `

/* === Acknowledgment === */
.footer-disclaimer {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: #64748b;
}

.footer-disclaimer a {
  color: #1d4ed8;
  font-weight: 600;
  text-decoration: none;
}

.footer-disclaimer a:hover {
  text-decoration: underline;
}

.subscription-note {
  margin-top: 10px;
  font-size: 12px;
  line-height: 1.5;
  color: #64748b;
}

.subscription-note a {
  color: #1d4ed8;
  font-weight: 600;
  text-decoration: none;
}

.subscription-note a:hover {
  text-decoration: underline;
}
`;

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function write(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf8');
}

function injectBeforeClosingTag(content, closingTag, block) {
  const lower = content.toLowerCase();
  const tagIndex = lower.lastIndexOf(closingTag.toLowerCase());
  if (tagIndex === -1) return null;
  return content.slice(0, tagIndex) + block + '\n' + content.slice(tagIndex);
}

function addFooterDisclaimer(htmlPath) {
  if (!fileExists(htmlPath)) {
    console.log(`SKIP footer: ${path.basename(htmlPath)} not found`);
    return;
  }

  let html = read(htmlPath);

  if (html.includes('footer-disclaimer') || html.includes('acknowledgment.html')) {
    console.log(`OK footer already present: ${path.basename(htmlPath)}`);
    return;
  }

  let updated = injectBeforeClosingTag(html, '</footer>', '\n  ' + footerBlock.trim() + '\n');
  if (!updated) {
    updated = injectBeforeClosingTag(html, '</body>', '\n' + footerBlock.trim() + '\n');
  }

  if (!updated) {
    console.log(`WARN could not inject footer block: ${path.basename(htmlPath)}`);
    return;
  }

  write(htmlPath, updated);
  console.log(`DONE footer added: ${path.basename(htmlPath)}`);
}

function addSubscriptionNote(htmlPath) {
  if (!fileExists(htmlPath)) {
    console.log(`SKIP subscription note: ${path.basename(htmlPath)} not found`);
    return;
  }

  let html = read(htmlPath);

  if (html.includes('subscription-note')) {
    console.log(`OK subscription note already present: ${path.basename(htmlPath)}`);
    return;
  }

  const patterns = [
    /(<\/form>)/i,
    /(<\/section>)/i,
    /(<\/main>)/i,
  ];

  let updated = null;

  for (const pattern of patterns) {
    if (pattern.test(html)) {
      updated = html.replace(pattern, `${subscriptionBlock}\n$1`);
      break;
    }
  }

  if (!updated) {
    console.log(`WARN could not inject subscription note safely: ${path.basename(htmlPath)}`);
    return;
  }

  write(htmlPath, updated);
  console.log(`DONE subscription note added: ${path.basename(htmlPath)}`);
}

function addCss(cssPath) {
  if (!fileExists(cssPath)) {
    console.log(`WARN CSS file not found: ${cssPath}`);
    return;
  }

  let css = read(cssPath);

  if (css.includes('/* === Acknowledgment === */')) {
    console.log('OK CSS already present');
    return;
  }

  css += cssBlock;
  write(cssPath, css);
  console.log('DONE CSS added');
}

addCss(cssFile);

for (const file of htmlFiles) {
  addFooterDisclaimer(path.join(root, file));
}

addSubscriptionNote(path.join(root, 'subscriptions.html'));

console.log('\nFinished.');