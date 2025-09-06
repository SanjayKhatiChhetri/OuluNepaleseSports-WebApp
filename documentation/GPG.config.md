Here’s a clean and comprehensive `GPG.config.md` file that documents your full GPG setup workflow across Windows and WSL, including your backup strategy with 1Password:

---

```markdown
# 🔐 GPG Configuration Workflow (Windows + WSL)

This document outlines the complete setup and configuration of GPG for commit and tag signing across both Windows and WSL environments. It includes key generation, GitHub integration, and secure backup using 1Password.

---

## 🧭 Overview

- Initial attempt using `gpg.txt` failed due to missing secret key
- Generated a new GPG key with ECC (Curve25519)
- Configured Git and GPG in both Windows and WSL
- Backed up all critical GPG artifacts in 1Password

---

## 🛠️ Key Generation (Windows)

```bash
gpg --full-generate-key
```

- Key Type: ECC (sign and encrypt)
- Curve: Curve25519
- Validity: No expiration (`0`)
- User ID:
  ```
  Name: Sanjay Khati Chhetri
  Email: sanjaykhati579@gmail.com
  Comment: GitHub Signing Key
  ```

---

## 🔑 Key Details

- **Key ID**: `8F5F900BC830ACB3B1668F3882CE8A3A3CA3F14E`
- **Fingerprint**: Automatically generated
- **Revocation Certificate**: Created and stored

---

## 📦 Backup in 1Password

Stored securely in a tagged vault:

- `secret-key.asc` (935 bytes)
- `public-key.asc` (707 bytes)
- `revoke.asc` (362 bytes)
- GPG passphrase

Vault: `kkppr family`  
Tags: `GPG`, `GitHub`, `security`

---

## ⚙️ Git Configuration

### Windows

```bash
git config --global user.signingkey 8F5F900BC830ACB3B1668F3882CE8A3A3CA3F14E
git config --global commit.gpgsign true
git config --global gpg.program "C:\\Program Files\\Gpg4win\\bin\\gpg.exe"
```

### WSL (Ubuntu)

```bash
git config --global user.signingkey 8F5F900BC830ACB3B1668F3882CE8A3A3CA3F14E
git config --global commit.gpgsign true
git config --global gpg.program /usr/bin/gpg
```

Imported secret key from Windows via:

```bash
gpg --import /mnt/c/Users/sanja/secret-key.asc
```

---

## 🧪 Signing Commits and Tags

### Commit

```bash
git commit -S -m "Your commit message"
```

### Tag

```bash
git tag -s v1.0 -m "Release version 1.0"
```

Enable auto-signing:

```bash
git config --global tag.gpgSign true
```

---

## 🛡️ GitHub Integration

- Public key added via [GitHub GPG Settings](https://github.com/settings/keys)
- Verified badge appears on signed commits and tags

---

## ✅ Final Notes

- All environments (Windows, WSL, VS Code) now support GPG signing
- Backup strategy ensures recoverability and revocation
- Setup is future-proof for CI/CD, GitHub Actions, and multi-device workflows

```

---

Let me know if you want to add this to your repo or convert it into a secure onboarding doc for collaborators.