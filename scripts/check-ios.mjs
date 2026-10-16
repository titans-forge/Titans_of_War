import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
const config = JSON.parse(fs.readFileSync('capacitor.config.json'))
assert.equal(config.appId, 'com.titansforge.civilwar')
assert.equal(config.webDir, 'dist')
assert.ok(!config.server?.url, 'The app must bundle the game rather than require a remote host')
let count = 0
function check(dir, rel = '') {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const name = path.join(rel, entry.name)
    if (entry.isDirectory()) check(path.join(dir, entry.name), name)
    else { assert.deepEqual(fs.readFileSync(path.join(dir, entry.name)), fs.readFileSync(path.join('ios/App/App/public', name)), `Native asset differs: ${name}`); count++ }
  }
}
check('dist')
const privacy = fs.readFileSync('ios/App/App/PrivacyInfo.xcprivacy', 'utf8')
assert.ok(privacy.includes('C617.1'))
assert.ok(privacy.includes('NSPrivacyTracking'))
const project = fs.readFileSync('ios/App/App.xcodeproj/project.pbxproj', 'utf8')
assert.ok(project.includes('PrivacyInfo.xcprivacy'))
assert.ok(project.includes('TARGETED_DEVICE_FAMILY = 1'))
console.log(`Verified ${count} bundled assets, offline configuration, iPhone target and privacy manifest.`)
