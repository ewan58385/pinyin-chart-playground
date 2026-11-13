import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { androidVersion, MAX_VERSION_CODE } from '../scripts/lib/android-version';
import pkg from '../package.json';

const ROOT = join(import.meta.dirname, '..');

describe('Android version from package.json', () => {
  it('uses the package version as versionName and MAJOR*10000 + MINOR*100 + PATCH as versionCode', () => {
    expect(androidVersion('1.0.0')).toEqual({ versionName: '1.0.0', versionCode: 10000 });
    expect(androidVersion('1.2.3')).toEqual({ versionName: '1.2.3', versionCode: 10203 });
    expect(androidVersion('0.0.1').versionCode).toBe(1);
    expect(androidVersion('12.99.99').versionCode).toBe(129999);
  });
  it('always grows when the version does', () => {
    const order = ['0.9.9', '1.0.0', '1.0.1', '1.0.99', '1.1.0', '1.99.99', '2.0.0', '10.0.0'];
    const codes = order.map((v) => androidVersion(v).versionCode);
    expect([...codes].sort((a, b) => a - b)).toEqual(codes);
    expect(new Set(codes).size).toBe(codes.length);
  });
  it('rejects versions the rule cannot order', () => {
    expect(() => androidVersion('1.0')).toThrow(/MAJOR\.MINOR\.PATCH/);
    expect(() => androidVersion('1.0.0-beta.1')).toThrow(/MAJOR\.MINOR\.PATCH/);
    expect(() => androidVersion('1.100.0')).toThrow(/0-99/);
    expect(() => androidVersion('1.0.100')).toThrow(/0-99/);
    expect(() => androidVersion('0.0.0')).toThrow(/outside/);
  });
  it('lets CI override the code, within Play’s limit', () => {
    expect(androidVersion('1.0.0', '10001').versionCode).toBe(10001);
    expect(androidVersion('1.0.0', ' 42 ').versionCode).toBe(42);
    expect(androidVersion('1.0.0', '').versionCode).toBe(10000);
    expect(() => androidVersion('1.0.0', String(MAX_VERSION_CODE + 1))).toThrow(/outside/);
    expect(() => androidVersion('1.0.0', 'abc')).toThrow(/outside/);
  });
  it('accepts the current package.json version', () => {
    expect(androidVersion(pkg.version).versionName).toBe(pkg.version);
  });
  it('matches the rule in android/app/build.gradle', () => {
    const gradle = readFileSync(join(ROOT, 'android/app/build.gradle'), 'utf8');
    expect(gradle).toContain("new JsonSlurper().parse(rootProject.file('../package.json'))");
    expect(gradle).toContain('major * 10000 + minor * 100 + patch');
    expect(gradle).toContain('minor > 99 || patch > 99');
    expect(gradle).toContain("System.getenv('ANDROID_VERSION_CODE')");
    expect(gradle).toContain('appVersionCode > 2100000000');
    expect(gradle).toMatch(/versionCode appVersionCode\s+versionName appVersion/);
  });
});
