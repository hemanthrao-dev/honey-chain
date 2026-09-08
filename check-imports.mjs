import fs from 'fs';
import path from 'path';

const files = [
  'frontend/src/App.jsx',
  'frontend/src/components/admin/AdminDashboard.jsx',
  'frontend/src/components/consumer/ConsumerVerification.jsx',
  'frontend/src/components/beekeeper/BeekeeperDashboard.jsx',
  'frontend/src/main.jsx'
];

for (const f of files) {
  const content = fs.readFileSync(f, 'utf8');
  const imports = content.match(/import .+ from ['"]([^'"]+)['"]/g) || [];
  for (const imp of imports) {
    const match = imp.match(/from ['"]([^'"]+)['"]/);
    if (match && match[1].startsWith('.')) {
      const resolved = path.resolve(path.dirname(f), match[1]);
      const candidates = [resolved, resolved + '.js', resolved + '.jsx', resolved + '/index.js', resolved + '/index.jsx'];
      if (!candidates.some(c => fs.existsSync(c))) {
        console.log(`MISSING: ${f} -> ${match[1]}`);
      }
    }
  }
}
console.log('Import check complete');
