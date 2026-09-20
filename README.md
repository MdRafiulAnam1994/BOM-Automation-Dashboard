# Walton BOM Automation & Intelligence System

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Windows%20PowerShell-0078D4.svg)](https://learn.microsoft.com/powershell/)
[![Frontend](https://img.shields.io/badge/Frontend-Vanilla%20JS%20%7C%20HTML5%20%7C%20CSS3-F7DF1E.svg)](index.html)
[![Zero External Dependencies](https://img.shields.io/badge/Dependencies-Zero%20(No%20Node%20%2F%20Python)-brightgreen.svg)](#zero-dependency-architecture)

An enterprise-grade Bill of Materials (BOM) quality assurance, modification tracking, and cross-verification system built for **Walton RAC (Residential Air Conditioner)** & **CAC (Commercial Air Conditioner)** manufacturing divisions.

---

## 🌟 Key Capabilities & Dashboard Tabs

The system operates as a unified Single-Page Executive Dashboard featuring three core analytical workflows:

### 📊 Tab 1: BOM Observation Report
- **Quality Assurance & Defect Audits**: Real-time monitoring of raw material deviations, missing parts, and component discrepancies across production batches.
- **Dynamic Monthly Filtering**: Interactive monthly slicers with multi-select support to inspect historical observation records.
- **Visual Analytics**: Embedded offline Chart.js visualizations for discrepancy trends, model impact frequencies, and RM categories.
- **Google Sheets & CSV Sync**: Instant cloud sync and local export capabilities for executive reporting.

### 🔄 Tab 2: BOM Modification Report
- **Before vs After Quantity Revisions**: Side-by-side component revision tracking displaying previous BOM quantities against updated quantities.
- **Deviation & Impact Detection**: Automatically flags quantity revisions, reductions, removals, and newly introduced components.
- **Oracle EBS Live Delta Comparison**: Compares production BOM lines with active Oracle E-Business Suite records in real time.
- **Search & Filter Suite**: Filter by Finished Goods (FG) item code, raw material (RM) code, description, or change date.

### 🔍 Tab 3: Active BOM Cross-Verification & RM Where-Used
- **Reverse Component Lookup ("Where-Used")**: Instantly search any Raw Material (RM) code or description to find every Finished Good model that consumes it across 2,246+ active models.
- **Zero-Latency Indexed Performance**: Pre-compiled static indexing engine (`active_bom_catalog.js`, `rm_where_used_data.js`) enables millisecond-level lookups without demanding database roundtrips.
- **Specification Cross-Checking**: Verifies physical bills of materials against standard catalog definitions to identify mismatches prior to production release.

---

## 🔐 Dual-Account Oracle EBS Integration

The application features a built-in authentication and sync engine designed to interface with Oracle E-Business Suite (`webs.waltonbd.com`):

- **Dual-Credential Failover**: Configure a Primary User ID and a Secondary Fallback User ID. If primary monthly rotating credentials fail, the system smoothly falls back to the secondary credential.
- **Daily Session Caching**: Authenticates once per day to minimize redundant requests, storing active session tokens securely in local memory.
- **Offline & Manual Loader**: If EBS connectivity is unavailable, users can load any exported `BOM_DETAILS.xls` spreadsheet directly into the dashboard for offline analysis.
- **In-App Credential Management**: Update passwords and test authentication states directly through the dashboard UI.

---

## ⚡ Zero-Dependency Architecture

Designed specifically for enterprise corporate environments with restricted installation permissions:
- **No Node.js or npm required.**
- **No Python or external compilers required.**
- **Native Windows PowerShell HTTP.SYS backend**: Runs on port `8080` using standard built-in Windows APIs.
- **Vanilla ES6+ Frontend**: Responsive standard CSS3 and native JavaScript with offline-bundled libraries (Chart.js, SheetJS, PapaParse).

---

## 🚀 Quick Start Guide

### Prerequisites
- Windows 10, Windows 11, or Windows Server
- PowerShell 5.1+ (installed by default on modern Windows)
- Any modern web browser (Edge, Chrome, Firefox)

### 1. Configuration Setup
1. Copy the example configuration template:
   ```powershell
   Copy-Item ebs_config.example.json ebs_config.json
   ```
2. Open `ebs_config.json` and enter your Oracle EBS credentials:
   ```json
   {
     "primary": {
       "userId": "YOUR_PRIMARY_ID",
       "password": "YOUR_PRIMARY_PASSWORD"
     },
     "secondary": {
       "userId": "YOUR_FALLBACK_ID",
       "password": "YOUR_FALLBACK_PASSWORD"
     },
     "activeUser": "",
     "lastLoginDate": "",
     "lastAuthStatus": "logged_out"
   }
   ```
   > **Note**: `ebs_config.json` is protected by `.gitignore` and will never be committed to Git.

### 2. Launch the Application
Double-click **`start_server.bat`** or run via PowerShell:
```powershell
.\serve.ps1
```
The server will start on `http://localhost:8080/` and automatically open your default web browser.

---

## 📁 Repository Structure

```
├── boms/                       # 5,000+ cached model-specific BOM JSON specifications
├── lib/                        # Offline bundles: SheetJS (xlsx.full.min.js), Chart.js
├── scratch/                    # Local temporary session cache (.gitkeep)
├── index.html                  # Master Single-Page Dashboard layout & tabs
├── styles.css                  # Modern responsive design & dark/light component styling
├── app.js                      # Controller for Tab 1 (Observation) & Tab 2 (Modification)
├── bom_verifier.js             # Controller for Tab 3 (Cross-Verification & RM Where-Used)
├── serve.ps1                   # Native PowerShell HTTP.sys REST server (port 8080)
├── server.ps1                  # Backup HTTP listener
├── start_server.bat            # 1-click launcher script
├── test_ebs_auth.ps1           # Oracle EBS dual-account authentication routine
├── sync_daily_bom.ps1          # Daily BOM extractor & deviation detection parser
├── fetch_bom.ps1               # On-demand component fetcher from Oracle EBS
├── ebs_config.example.json     # Sanitized configuration template
├── active_bom_catalog.js       # Pre-indexed active finished goods catalog
├── rm_where_used_data.js       # Indexed reverse lookup dataset
├── README.md                   # Project documentation
├── SECURITY.md                 # Security guidelines & credential policies
├── LICENSE                     # MIT License
└── .gitignore                  # Git exclusions for credentials and temporary cache
```

---

## 🛡️ Security & Privacy Notice
This public repository does **not** contain corporate passwords, internal session cookies, or employee personal data. All runtime secrets are managed locally via `ebs_config.json` and are strictly untracked.

---

## 📄 License
This project is open-source under the [MIT License](LICENSE).
