# Family sync

All five apps (Homework Hero, Star Steps, Build-a-Plate, Clean Sheet and Utopia) can share their data between phones through a free Firebase project (`family-apps-c8217`). The code is in [`family-sync.js`](family-sync.js).

## How it works

- Each app still saves on the phone first, so it works offline exactly as before.
- After someone signs in, every change is also sent to the family database. The other phone picks it up within a second or two and shows "Updated from …'s phone".
- **Edits made on both phones combine.** Each phone keeps its own changes. Lists of items (postings, menu items, kids) combine item by item. Only when both phones changed the very same thing does one version win.
- **The first time a phone syncs an app** that already has a shared copy, it asks which copy to keep: *Use the shared copy* (pick this on a new phone) or *Use this phone's copy*.
- **"Erase everything" in an app now erases it on both phones.** The backup files still work as before.
- **Not synced:** the voice recordings in Star Steps and Build-a-Plate. They stay on the phone they were recorded on.
- **Sign-in and status** are in each app's settings / grown-ups screen, under **Family sync**.
- **Sign in once per app on each phone.** On iPhone, each app added to the Home Screen has its own separate storage, so each one asks once.

## One-time Firebase setup (in console.firebase.google.com)

1. **Authentication → Sign-in method:** turn on **Email/Password**.
2. **Authentication → Users → Add user:** add one user for each of you.
3. **Authentication → Settings → User actions:** untick **Enable create (sign-up)** so nobody else can make an account.
4. **Firestore Database → Create database** (production mode).
5. **Firestore Database → Rules:** replace everything with the rules below, put in your two email addresses (in lowercase), and click **Publish**.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /family/{document=**} {
      allow read, write: if request.auth != null
        && request.auth.token.email in ['you@example.com', 'husband@example.com'];
    }
  }
}
```

These rules are what keep the data private: only those two signed-in accounts can read or write anything. The settings in `family-sync.js` only tell the apps which Firebase project to use; they aren't secret.

## Where the data lives

Firestore: `family/shared/apps/<app storage key>`. Each app's data is saved as one document, plus `chunks/0…n` holding the data itself, split so large photo menus fit under Firestore's 1 MB-per-document limit.
