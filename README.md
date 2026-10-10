# 🍽️ Recipe App (Catppuccin Theme)

A minimalist Progressive Web App (PWA) to store your personal recipes and easily calculate macros (calories, protein, fats, carbs) for your exact portion size. Built with a focus on speed, kitchen usability, and zero visual clutter.

## ✨ Features
- **Strict Minimalism**: No news feeds, no ads, no clutter. Just your personal recipes.
- **Smart Macro Calculator**: Add ingredients in grams or pieces. When cooking, just enter the weight of your actual portion, and the app instantly calculates the exact macros for your plate.
- **Yazio / FatSecret Integration**: Generates a 1-click copyable text string to quickly log your macros into any fitness tracker.
- **PWA (Progressive Web App)**: Installable natively on Android and iOS (runs fast in a standalone window, without browser UI).
- **Dark Theme**: Designed using the popular and eye-friendly **Catppuccin** color palette.

## 🛠️ Tech Stack
- **Frontend**: React + Vite + Tailwind CSS + Lucide Icons + VitePWA
- **Backend**: Python + FastAPI
- **Database**: SQLite (local `database.sqlite` file — no complex DBMS required)
- **Deployment**: Docker + Docker Compose

## 🚀 How to Run (Docker)

To run this on your own server, you only need `docker` and `docker-compose`.

```bash
git clone https://github.com/PetroProg/Recipe-App.git
cd Recipe-App
docker compose up -d --build
```
The app will run in the background and will be accessible on port `9090` (configurable in `docker-compose.yml`).

## 📜 License
This project is licensed under the [MIT License](LICENSE). You are free to use, modify, and distribute this code.
