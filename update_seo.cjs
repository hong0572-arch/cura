const fs = require('fs');
let index = fs.readFileSync('index.html', 'utf8');

// Update index.html
index = index.replace(/hreflang="en" href="https:\/\/beyondthegate\.kr\/\?lang=en"/g, 'hreflang="en" href="https://servicebycura.com/"');
index = index.replace(/hreflang="x-default" href="https:\/\/beyondthegate\.kr\/"/g, 'hreflang="x-default" href="https://servicebycura.com/"');
index = index.replace(/canonical" href="https:\/\/beyondthegate\.kr\/"/g, 'canonical" href="https://servicebycura.com/"');
index = index.replace(/og:url" content="https:\/\/beyondthegate\.kr\/"/g, 'og:url" content="https://servicebycura.com/"');
index = index.replace(/twitter:url" content="https:\/\/beyondthegate\.kr\/"/g, 'twitter:url" content="https://servicebycura.com/"');
index = index.replace(/"https:\/\/beyondthegate\.kr\/#organization"/g, '"https://servicebycura.com/#organization"');
index = index.replace(/"url": "https:\/\/beyondthegate\.kr\/"/g, '"url": "https://servicebycura.com/"');

fs.writeFileSync('index.html', index);

// Update public/sitemap.xml
let sitemap = fs.readFileSync('public/sitemap.xml', 'utf8');

// /about?lang=en -> servicebycura.com/about
sitemap = sitemap.replace(/hreflang="en" href="https:\/\/beyondthegate\.kr\/([a-zA-Z0-9-]*)\?lang=en"/g, 'hreflang="en" href="https://servicebycura.com/$1"');
// /?lang=en -> servicebycura.com/
sitemap = sitemap.replace(/hreflang="en" href="https:\/\/beyondthegate\.kr\/\?lang=en"/g, 'hreflang="en" href="https://servicebycura.com/"');
// x-default -> servicebycura.com
sitemap = sitemap.replace(/hreflang="x-default" href="https:\/\/beyondthegate\.kr\//g, 'hreflang="x-default" href="https://servicebycura.com/');

// We should also replace the main <loc> to servicebycura.com? 
// If servicebycura is the main domain now, we can replace all <loc> to servicebycura.com, and keep beyondthegate.kr for ko
sitemap = sitemap.replace(/<loc>https:\/\/beyondthegate\.kr\//g, '<loc>https://servicebycura.com/');

fs.writeFileSync('public/sitemap.xml', sitemap);
console.log('Update complete.');
