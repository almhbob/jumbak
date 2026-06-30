const { withAppBuildGradle, withGradleProperties } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

const KEYSTORE_SRC = path.resolve(__dirname, '../release.keystore');
const KEYSTORE_DST_REL = 'release.keystore';

const STORE_PASS = process.env.KEYSTORE_PASSWORD || 'Jnbk@2026!Secure';
const KEY_ALIAS = process.env.KEYSTORE_ALIAS || 'jnbk-release';
const KEY_PASS = process.env.KEY_PASSWORD || 'Jnbk@2026!Secure';

function withReleaseSigning(config) {
  config = withGradleProperties(config, (c) => {
    const props = c.modResults;
    const set = (k, v) => { const i = props.findIndex((p) => p.key === k); if (i >= 0) props[i] = { type: 'property', key: k, value: v }; else props.push({ type: 'property', key: k, value: v }); };
    set('JNBK_STORE_FILE', KEYSTORE_DST_REL);
    set('JNBK_STORE_PASSWORD', STORE_PASS);
    set('JNBK_KEY_ALIAS', KEY_ALIAS);
    set('JNBK_KEY_PASSWORD', KEY_PASS);
    return c;
  });

  config = withAppBuildGradle(config, (c) => {
    const src = path.join(c.modRequest.projectRoot, 'android', 'app');
    const dst = path.join(src, KEYSTORE_DST_REL);
    if (fs.existsSync(KEYSTORE_SRC) && !fs.existsSync(dst)) {
      fs.copyFileSync(KEYSTORE_SRC, dst);
    }

    let gradle = c.modResults.contents;
    if (gradle.includes('JNBK_STORE_FILE')) return c;

    // Append a release signingConfig block after the existing debug one
    gradle = gradle.replace(
      /(signingConfigs\s*\{[\s\S]*?storePassword\s+'android'\s*\n\s*keyAlias\s+'androiddebugkey'\s*\n\s*keyPassword\s+'android'\s*\n\s*\})/,
      `$1
        release {
            storeFile file(JNBK_STORE_FILE)
            storePassword JNBK_STORE_PASSWORD
            keyAlias JNBK_KEY_ALIAS
            keyPassword JNBK_KEY_PASSWORD
        }`
    );

    // Switch release buildType to use release signingConfig (not debug)
    gradle = gradle.replace(
      // Match the release buildType block and its signingConfig line
      /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig\s+signingConfigs\.debug/,
      '$1signingConfig signingConfigs.release'
    );

    c.modResults.contents = gradle;
    return c;
  });

  return config;
}

module.exports = withReleaseSigning;
