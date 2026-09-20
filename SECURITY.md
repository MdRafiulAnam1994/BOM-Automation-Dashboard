# Security Policy & Credential Best Practices

## 🛡️ Protecting Sensitive Oracle EBS Credentials

The **Walton BOM Automation & Intelligence System** interfaces directly with Oracle E-Business Suite (EBS) endpoints to verify and synchronize active Bill of Materials (BOM) configurations.

To safeguard corporate credentials and user accounts, please adhere to the following rules:

### 1. Never Commit `ebs_config.json`
- `ebs_config.json` contains your personal Oracle EBS User ID and passwords.
- This file is strictly excluded by `.gitignore` and **must never be committed** to any public or shared Git repository.
- A template file named `ebs_config.example.json` is provided with dummy placeholders.

### 2. Dual-Account Architecture
- The system supports a primary User ID and a secondary fallback User ID.
- In the event that monthly rotating credentials expire on the primary account, the system automatically falls back to the secondary credential to maintain sync continuity.
- Both accounts should be kept strictly confidential.

### 3. Session Cookies & Scratch Directory
- The `scratch/` directory is used temporarily to hold HTTP cookies (`cookie.txt`) generated during EBS session authentication.
- Any generated `.txt` or `.log` files in `scratch/` are excluded by `.gitignore`.

### 4. Reporting Vulnerabilities
If you discover any security concerns, misconfigurations, or potential credential leaks within this repository, please report them directly to the Walton Air Conditioner Quality Assurance & Systems Engineering department.
