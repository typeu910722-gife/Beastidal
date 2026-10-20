// Builds dist/ios/beastidal.mobileconfig: an iOS configuration profile holding a full-screen Web Clip of the game,
// so it installs on an iPhone or iPad as an app icon (no App Store, no developer account). The profile is unsigned
// (iOS shows it as 未簽署 / Unsigned; installing it is still allowed). dist/_headers serves it with the type Safari
// needs to offer installation. Run with `npm run ios`.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const URL_ = 'https://beastidal.yzprojecttw.com/';
const icon = readFileSync('dist/brand/apple-touch-icon.png').toString('base64');
// stable UUIDs (derived from names), so reinstalling replaces the clip instead of adding a second one
const uuid = name => {
  const h = createHash('sha1')
    .update('beastidal:' + name)
    .digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`.toUpperCase();
};
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const wrap = s => s.match(/.{1,68}/g).join('\n\t\t\t');

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>PayloadContent</key>
	<array>
		<dict>
			<key>FullScreen</key>
			<true/>
			<key>Icon</key>
			<data>
			${wrap(icon)}
			</data>
			<key>IgnoreManifestScope</key>
			<true/>
			<key>IsRemovable</key>
			<true/>
			<key>Label</key>
			<string>${esc('比斯泰德')}</string>
			<key>PayloadDescription</key>
			<string>${esc('在主畫面加入《御獸與遠航》，全螢幕開啟。')}</string>
			<key>PayloadDisplayName</key>
			<string>${esc('比斯泰德 · 遊戲圖示')}</string>
			<key>PayloadIdentifier</key>
			<string>com.yzprojecttw.beastidal.webclip</string>
			<key>PayloadType</key>
			<string>com.apple.webClip.managed</string>
			<key>PayloadUUID</key>
			<string>${uuid('webclip')}</string>
			<key>PayloadVersion</key>
			<integer>1</integer>
			<key>Precomposed</key>
			<true/>
			<key>URL</key>
			<string>${URL_}</string>
		</dict>
	</array>
	<key>PayloadDescription</key>
	<string>${esc('安裝後主畫面會出現「比斯泰德」，點開即以全螢幕遊玩《御獸與遠航》。隨時可以在「設定 › 一般 › VPN 與裝置管理」移除。')}</string>
	<key>PayloadDisplayName</key>
	<string>${esc('比斯泰德 Beastidal')}</string>
	<key>PayloadIdentifier</key>
	<string>com.yzprojecttw.beastidal</string>
	<key>PayloadOrganization</key>
	<string>YZProJect</string>
	<key>PayloadRemovalDisallowed</key>
	<false/>
	<key>PayloadType</key>
	<string>Configuration</string>
	<key>PayloadUUID</key>
	<string>${uuid('profile')}</string>
	<key>PayloadVersion</key>
	<integer>1</integer>
</dict>
</plist>
`;
mkdirSync('dist/ios', { recursive: true });
writeFileSync('dist/ios/beastidal.mobileconfig', xml);
console.log(`dist/ios/beastidal.mobileconfig: ${xml.length} bytes → ${URL_}`);
