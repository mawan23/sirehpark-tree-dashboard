# 🌳 Taman Bunga — Tree CSR Dashboard
### Deployment Guide for InfinityFree

---
GROUP MEMBERS
1. SHAHRUL IZZAT BIN AHEMAD
2. MARWAN BIN MUHAMMAD SUFIAN

OBJECTIVES
- To develop an interactive web-based Geographic Information System (GIS) dashboard for monitoring tree donations in Sireh Park.
- To collate and display tree planting information received from a number of CSR donors.
- To provide real-time KPIs such as total trees, survival rate and species diversity.
- Enable spatial exploration of tree locations with symbology to indicate survival status and maintenance priority.
- To allow filtering by tree status and data categories.
- To aid park management in identifying trees in need of maintenance, facilitating data-driven decision-making.


## File Structure
```
park-dashboard/
├── index.html              ← Main dashboard (open this)
├── config.php              ← Database credentials (edit this first)
├── setup.sql               ← Run once in phpMyAdmin to create table + seed data
├── api/
│   ├── trees.php           ← GET: list, stats, species
│   └── tree_write.php      ← POST/PUT/DELETE: create, update, delete
└── assets/
    ├── css/dashboard.css
    └── js/dashboard.js
```

---

## Step 1 — Create your InfinityFree database

1. Log in to your InfinityFree control panel
2. Go to **MySQL Databases**
3. Create a new database — note the **host**, **database name**, **username**, **password**
4. Open **phpMyAdmin**
5. Select your database → click **SQL** tab
6. Paste the entire contents of `setup.sql` and click **Go**

---

## Step 2 — Edit config.php

Open `config.php` and replace the placeholders:

```php
define('DB_HOST', 'sql200.infinityfree.com'); // from your control panel
define('DB_NAME', 'if0_XXXXXXX_park_csr');    // your database name
define('DB_USER', 'if0_XXXXXXX');              // your username
define('DB_PASS', 'your_password_here');        // your password
```

---

## Step 3 — Upload to InfinityFree

1. Go to **File Manager** in your InfinityFree control panel
2. Navigate to `htdocs/` (your web root)
3. Create a folder e.g. `park-dashboard/`
4. Upload ALL files maintaining the exact folder structure above

OR use FTP:
- Host: `ftpupload.net`
- Username & Password: same as your InfinityFree account
- Upload everything into `htdocs/park-dashboard/`

---

## Step 4 — Visit your dashboard

```
https://yourdomain.infinityfreeapp.com/park-dashboard/
```

The dashboard auto-falls back to demo data if the API is unreachable, so you can test the UI locally by just opening `index.html` in a browser.

---

## API Endpoints

| Method | URL | Action |
|--------|-----|--------|
| GET | `api/trees.php?action=list` | Get all trees |
| GET | `api/trees.php?action=list&status=At+Risk` | Filter by status |
| GET | `api/trees.php?action=stats` | KPIs + DBH distribution |
| GET | `api/trees.php?action=species` | Species breakdown |
| POST | `api/tree_write.php` | Add new tree (JSON body) |
| PUT | `api/tree_write.php` | Update tree (JSON body, needs tree_id) |
| DELETE | `api/tree_write.php` | Delete tree (JSON body, needs tree_id) |

---

## Notes

- The dashboard is optimised for **1920×1080** desktop screens
- It gracefully falls back to embedded demo data if the database isn't connected yet
- Circle size on the map scales with **DBH** (larger DBH = bigger dot)
- Click any tree circle on the map to see its tooltip details
- The **Add Tree** form lets you click the mini-map to set coordinates visually
