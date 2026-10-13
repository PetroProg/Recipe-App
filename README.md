# 🍽️ Recipe App (Catppuccin Theme)

A minimalist, high-performance Progressive Web App (PWA) to store personal recipes and dynamically calculate exact macros (Calories, Protein, Fats, Carbs) for custom portion sizes. Built with a focus on speed, kitchen usability, and zero visual clutter.

---

## ✨ Features

- **Strict Minimalism**: No ads, no social feeds, no clutter. Only your personal recipes.
- **Dynamic Portion Macro Calculator**: Enter the exact weight of your serving, and the app instantly recalculates the nutritional breakdown for your plate.
- **1-Click Tracker Export**: Generates copy-paste text formatted for quick logging in Yazio, MyFitnessPal, or FatSecret.
- **🍳 Kitchen Mode (Screen Wake Lock)**: Keep your phone display awake hands-free while cooking.
- **✅ Interactive Step Tracking**: Tap steps to cross them off as you cook so you never lose your place.
- **🔍 Fast Search**: Search recipes instantly by title or ingredient names.
- **🧠 Personal Ingredient Autocomplete**: Remembers previously entered ingredients and auto-fills macro profiles.
- **✨ Smart Step Paste**: Paste recipes directly from notes or Telegram; steps are automatically parsed and formatted.
- **🛡️ Data Safety & Auto-Save**: Auto-saves drafts to local storage, guards against accidental exit, and features React Error Boundary protection.
- **💾 Full Backup & Restore**: One-click JSON backup export and import for complete data ownership.
- **📱 Installable PWA**: Runs as a standalone app on iOS and Android with background silent updates.
- **🎨 Catppuccin Theme**: Eye-friendly dark theme designed with the Catppuccin palette.

---

## 🛠️ Tech Stack

- **Frontend**: React, Vite, Tailwind CSS, Lucide Icons, VitePWA
- **Backend**: Python 3.11, FastAPI, SQLAlchemy, Pydantic v2
- **Database**: SQLite (embedded, zero-configuration)
- **Deployment**: Multi-stage Docker + Docker Compose

---

## 🚀 Quick Start (Docker)

To run the application on your server:

```bash
git clone https://github.com/PetroProg/Recipe-App.git
cd Recipe-App
docker compose up -d --build
```

The app will run in the background and be accessible at port `9090` (configured in `docker-compose.yml`).

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).
