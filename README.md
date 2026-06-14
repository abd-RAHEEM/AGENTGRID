<div align="center">
  
# ⚡ AGENTGRID ⚡
**Intelligent Multi-Agent Energy Grid Digital Twin**

[![Deploy Link](https://img.shields.io/badge/Live%20Demo-Vercel-success?style=for-the-badge&logo=vercel)](https://hackprixs3.vercel.app)
[![Hackathon](https://img.shields.io/badge/Hackprix-Season_3_Hyderabad-blue?style=for-the-badge)](https://hackprixs3.vercel.app)

</div>

<br/>

## 🏆 Hackathon Details
- **Hackathon:** Hackprix Season 3 Hyderabad
- **Team Name:** Lazy ppl
- **Team Members:** 
  - Abdul Raheem
  - Mohammed Abdul Rafe Sajid
  - Shaikh Abdullah
  - Akber Hussain

## 🚀 Overview
**AGENTGRID** is a cutting-edge digital twin platform that simulates and optimizes a smart energy community. Powered by a multi-agent system, it orchestrates energy flow between houses, solar farms, batteries, electric vehicles (EVs), and the main power grid. 

Watch as autonomous AI agents negotiate, predict, and optimize energy distribution in real-time under various dynamic scenarios!

## ✨ Key Features
- **🤖 Multi-Agent LLM Orchestration:** Specialized AI agents representing House, Battery, EV, Solar, and Grid constantly negotiate energy trading and distribution.
- **🌍 Real-Time Digital Twin:** An interactive visualization of the energy community.
- **⚡ Scenario Simulation:** Trigger real-world events like 'Heatwave', 'Storm', or 'Peak Hours' and watch the agents autonomously adapt.
- **💬 Conversational Interface:** Talk directly to the simulation via chat! Interrogate the system, ask for metrics, or manually trigger events.
- **📈 Live Analytics:** Real-time metrics on energy consumption, battery status, and grid dependency.

## 🛠️ Tech Stack
- **Frontend:** Next.js, React, TailwindCSS, WebSockets
- **Backend:** Python, FastAPI
- **AI/LLMs:** Groq / Sarwam Client Agents
- **Deployment:** Vercel

## 🔗 Live Demo
Experience the digital twin live: **[https://hackprixs3.vercel.app](https://hackprixs3.vercel.app)**

## 💻 Local Development Setup

### 1. Clone the repository
```bash
git clone https://github.com/abd-RAHEEM/AGENTGRID.git
cd AGENTGRID
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
# Add your .env file with appropriate API keys
uvicorn main:app --reload
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:3000` to view the application.

---
<div align="center">
  Made with ❤️ by <b>Lazy ppl</b> at Hackprix Season 3
</div>
