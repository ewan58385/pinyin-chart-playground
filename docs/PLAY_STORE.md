# Google Play checklist

Everything needed to sell Pinyin Chart on Google Play, in order. Google changes these requirements often: **for every item, verify the current requirement at the linked official page before acting.** Links and the notes beside them were read on 2026-11-13.

## Decide first: paid, and the app id

- [ ] **Paid from the first release. A free app can never become paid.** Play Console Help, "Set up your app's prices": *"You can change your app from paid to free. Once your app has been offered for free, the app can't be changed to paid. If you want to charge for the app, you need to create a new app with a new package name and set a price."* So do not publish a free version, test build to production or "free launch" under the id you intend to sell. (Testing tracks before the first production release are fine; set the price before any public release.) Verify: <https://support.google.com/googleplay/android-developer/answer/6334373>
- [ ] **Final app id.** `app.config.json` still has the placeholder `com.example.pinyinchart`, which Play does not accept and which can never change after the first upload. See [ANDROID.md → Changing the app id](ANDROID.md#changing-the-app-id). Verify: <https://support.google.com/googleplay/android-developer/answer/9859152>

## Account

- [ ] **Developer account**: personal or organisation; *"There is a US$25 one-time registration fee"*; you may be asked for a government ID and a card in your legal name; personal accounts must also verify access to an Android device with the Play Console mobile app. Verify: <https://support.google.com/googleplay/android-developer/answer/6112435>
- [ ] **Identity / developer verification.** Google is rolling out Android developer verification from 30 September 2026; Play registers most apps automatically, but check the account's status in Play Console. Verify: <https://developer.android.com/developer-verification>
- [ ] **Payments profile** (needed to set a price and be paid): Play Console → Settings → Payments profile; add a bank account and tax information. Verify: <https://support.google.com/googleplay/android-developer/answer/7161426>
- [ ] **Contact details** for the store listing: a support e-mail (required; shown publicly), optional website and phone.
- [ ] **New personal accounts: closed test first.** *"Developers with personal accounts created after November 13, 2023, must run a closed test for their app with a minimum of 12 testers who have been opted in continuously for at least 14 days"* before applying for production access. Plan for at least two weeks. Testers of a paid app can be added as licence testers (Settings → License testing) so they are not charged. Verify: <https://support.google.com/googleplay/android-developer/answer/14151465> and <https://support.google.com/googleplay/android-developer/answer/6062777>

## Create the app

- [ ] Play Console → Create app: name "Pinyin Chart" (or the final name), default language English (United Kingdom), **App**, **Paid**. Verify: <https://support.google.com/googleplay/android-developer/answer/9859152>
- [ ] **Price** per country (Monetise → App pricing). Pricing templates were retired on 27 Oct 2025; prices are set per product. Verify: <https://support.google.com/googleplay/android-developer/answer/6334373>

## App content (Policy → App content)

- [ ] **Privacy policy URL.** Required, including for apps that collect no data, and Play's User Data policy says to have it *"in both the app's store listing and within the app itself"*. Host [PRIVACY.md](PRIVACY.md) (filled in) at a public URL, enter it here, and set `PRIVACY_POLICY_URL` in `src/config.ts` so About links to it. Verify: <https://support.google.com/googleplay/android-developer/answer/10144311>
- [ ] **Data safety form.** Required for every app, *"Even developers with apps that do not collect any user data must complete this form."* For this app as built: no data collected or shared (recordings, notes and settings stay on the device, and data *"only processed locally on the user's device and not sent off device does not need to be disclosed"*); no account; no network access at all (no INTERNET permission). User-initiated export to another app via the share sheet is the user's choice. Recheck if anything changes. Verify: <https://support.google.com/googleplay/android-developer/answer/10787469>
- [ ] **Permissions declaration**: RECORD_AUDIO (your own recordings) is a runtime permission, not a restricted one; no special form expected. Verify the current list of restricted permissions in the Play Console during upload.
- [ ] **Content rating** questionnaire (IARC): reference/education app, no user-generated content shared, no ads. Verify: <https://support.google.com/googleplay/android-developer/answer/9898843>
- [ ] **Target audience and content**: choose age groups. Picking under-13 groups brings in the Families policy; an adult or general learner audience avoids it. Verify: <https://support.google.com/googleplay/android-developer/answer/9867159>
- [ ] **Ads**: "No, my app does not contain ads".
- [ ] **News app / government app / financial features / health**: No.

## Store listing

- [ ] Short description (≤ 80 characters) and full description (≤ 4,000).
- [ ] **App icon** 512 × 512 PNG (≤ 1 MB). Make it from the same seal: e.g. extend `scripts/build-icons.py` with `draw(512, 0.0, 0.62, background=VERMILION)`; Play applies its own mask.
- [ ] **Feature graphic** 1024 × 500 (required).
- [ ] **Phone screenshots**: at least 2, up to 8 per device type, 9:16 portrait. The emulator flow in [DEVICE_QA.md](DEVICE_QA.md) produces them (`adb exec-out screencap -p > shot.png`).
- [ ] Category: Education. Tags.

Verify sizes: <https://support.google.com/googleplay/android-developer/answer/9866151>

## Licences and credits (already handled in the app)

- [ ] The in-app Credits and licences page and `THIRD_PARTY_NOTICES.md` cover the recordings and dictionary data (CC BY-SA), fonts (OFL), and every library in the web bundle and the Android app (MIT, ISC, Apache-2.0). `open-data/` is published (`OPEN_DATA_URL`). Re-run `npm run data:notices` when dependencies change.
- [ ] Whether CC BY-SA ShareAlike obligations reach the app as a whole is a question for a lawyer (see CLAUDE.md open questions); settle it before charging.

## Release

- [ ] Signed AAB: [RELEASING.md](RELEASING.md). Play App Signing on (default for new apps). Upload certificate registered.
- [ ] Target API: new apps and updates must target API 36 from 31 Aug 2026 (the project does). Verify: <https://developer.android.com/google/play/requirements/target-sdk>
- [ ] Internal testing → closed testing (12 testers × 14 days for new personal accounts) → apply for production → production release.
- [ ] Pre-launch report (Play runs the app on real devices for testing-track builds): read it before production.
- [ ] After launch: reply to reviews from the support address; keep the privacy policy URL live.
