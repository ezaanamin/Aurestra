# Aurestra - Smart Financial Manager 💰

Aurestra is a next-generation personal finance application built with React Native. It automatically tracks your expenses by parsing transactional SMS from major Pakistani banks and wallets, providing real-time insights into your financial health without manual data entry.

## 🌟 Key Features

### 📨 Smart SMS Sync (The "Magic" Feature)
- **Automated Tracking**: Automatically reads transactional SMS from **Bank Al Habib**, **Easypaisa**, and **JazzCash**.
- **Intelligent Checkpoints**: 
  - To ensure lightning-fast performance, the app uses a **Checkpoint System**.
  - **First Run**: Defaults to scanning from **Jan 24, 2026** (to skip years of old history).
  - **Subsequent Runs**: Remembers exactly when the last sync occurred (e.g., "Jan 25, 11:30 PM") and **only** scans messages received after that second.
  - **Zero-Lag**: Even if no new messages arrive, the checkpoint updates to "Now", ensuring the next sync is always instant.

### 📊 Financial Dashboard
- **Glassmorphic UI**: Beautiful, modern interface with dark mode support.
- **Real-time Balance**: Aggregated total balance from all linked accounts.
- **Income vs Expense**: Visual progress bars and monthly summaries.
- **Recent Transactions**: Quick view of your latest spending.

### 🛠️ Tools & Utilities
- **Currency Converter**: Real-time exchange rates (PKR, USD, EUR, etc.) with offline caching.
- **Category Management**: Create custom categories with custom icons (Entertainment, Food, etc.).
- **Budget Alerts**: Set monthly limits and get warned when nearing them.
- **Safe & Secure**: Google Login integration and local encryption.

---

## 🚀 Getting Started

### Prerequisites
- Node.js & npm/yarn
- Android Studio & SDK
- React Native CLI

### Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/your-username/aurestra.git
   cd Aurestra/Aurestra
   ```

2. **Install Dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Setup Environment**
   - Ensure `android/local.properties` has your SDK path.
   - Configure Firebase `google-services.json` in `android/app/`.

4. **Run the App**
   ```bash
   npx react-native run-android
   ```

---

## 📱 Permissions Logic (Android 13+)

The app requests two critical permissions to function:
1. **READ_SMS**: To parse bank transactions.
2. **POST_NOTIFICATIONS**: To alert you when new transactions are added in the background.

*Note: The app never uploads your raw SMS content. It processes them locally on-device and only sends structured transaction data (Amount, Merchant, Date) to the secured backend.*

---

## ⚙️ efficient-sync-explained.md

> **Why is the sync so fast?**

The sync logic in `smsHelper.js` is optimized for performance:
1. **Checkpointing**: It stores `last_sms_scan_timestamp` in `AsyncStorage`.
2. **Gap Filling**: If you don't open the app for 5 days, it pulls *only* those 5 days of messages.
3. **Empty States**: If you sync and find nothing, it still updates the timestamp to "Now", preventing redundant re-scanning of empty periods.

---

## 📦 Build & Deployment

To build a release APK:

1. **Generate Keystore**: Ensure your release keystore is in `android/app/`.
2. **Build Command**:
   ```bash
   cd android
   ./gradlew assembleRelease
   ```
3. **Artifact**: The APK will be generated in `android/app/build/outputs/apk/release/`.

> **Note**: `*.apk` files are git-ignored to keep the repo clean.

---

**Version**: 1.1.0  
**Built with**: React Native, Redux Toolkit, NativeBase
