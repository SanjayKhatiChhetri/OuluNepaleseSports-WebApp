Absolutely, Sanjay — here’s a refined `SSH.config.md` that documents both workflows: using an SSH key from 1Password and generating a new one manually. It’s tailored for your dual-environment setup (Windows + WSL) and GitHub integration.

---

## 🔐 SSH.config.md

### Overview

This guide summarizes two methods for setting up SSH authentication for GitHub across Windows and WSL:

- Using an existing SSH key stored in **1Password**
- Generating a **new SSH key** manually

Both approaches ensure secure, passwordless Git operations from your development environment.

---

### 🧭 Workflow Summary

#### 🔑 Method 1: Using SSH Key from 1Password

1. **Retrieve SSH Key**
   - Copied both the **private** and **public** Ed25519 keys from 1Password.

2. **Create `.ssh` Directory in Windows**
   - Location: `C:\Users\Sanja\.ssh`
   - Saved files as:
     - `id_ed25519` (private key)
     - `id_ed25519.pub` (public key)
   - Removed inheritance and granted access:
     ```powershell
     icacls "$env:USERPROFILE\.ssh\id_ed25519" /inheritance:r
     icacls "$env:USERPROFILE\.ssh\id_ed25519" /grant:r "Sanja:F"
     ```

3. **Copy Key to WSL**
   ```bash
   mkdir -p ~/.ssh
   cp /mnt/c/Users/Sanja/.ssh/id_ed25519 ~/.ssh/
   cp /mnt/c/Users/Sanja/.ssh/id_ed25519.pub ~/.ssh/
   chmod 600 ~/.ssh/id_ed25519
   chmod 644 ~/.ssh/id_ed25519.pub
   ```

4. **Add Key to SSH Agent**
   ```bash
   eval "$(ssh-agent -s)"
   ssh-add ~/.ssh/id_ed25519
   ```

---

#### 🛠️ Method 2: Generating a New SSH Key

1. **Generate Key in WSL**
   ```bash
   ssh-keygen -t ed25519 -C "your_email@example.com"
   ```

2. **Add Key to SSH Agent**
   ```bash
   eval "$(ssh-agent -s)"
   ssh-add ~/.ssh/id_ed25519
   ```

3. **Add Public Key to GitHub**
   - Go to [GitHub SSH settings](https://github.com/settings/keys)
   - Paste contents of `~/.ssh/id_ed25519.pub`

---

### 🔄 GitHub Integration

- **Verify SSH Connection**:
  ```bash
  ssh -T git@github.com
  ```
  Expected output:
  ```
  Hi SanjayKhatiChhetri! You've successfully authenticated...
  ```

- **Switch Git Remote to SSH**:
  ```bash
  git remote set-url origin git@github.com:SanjayKhatiChhetri/OuluNepaleseSports-WebApp.git
  ```

- **Push via SSH**:
  ```bash
  git push origin main
  git push origin v1.0.1
  ```

---

### ✅ Result

Whether using a key from 1Password or generating a new one, your SSH setup is now fully functional across Windows and WSL. GitHub operations are secure, seamless, and credential-free.

