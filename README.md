<div align="center">
  <img src="logo.jpg" alt="AgentGrid Logo" width="500" style="border-radius: 20px; box-shadow: 0 10px 20px rgba(0,0,0,0.2); margin-bottom: 20px;" />

# ⚡ AGENTGRID ⚡

**An Autonomous Multi-Agent Energy Operating System that transforms residential communities into self-optimizing sustainable ecosystems.**

>🏆 **Winner: Consolation Prize (Best Use of Sarvam AI Track) @ HackPrix Season 3 Hyderabad**


![Hackathon](https://img.shields.io/badge/Hackprix-Season_3_Hyderabad-8A2BE2?style=for-the-badge)
[![Tech Stack](https://img.shields.io/badge/Tech-React_|_FastAPI_|_LLM-blue?style=for-the-badge)](#)

</div>

<br/>

## 🏆 Hackathon Details
> **Hackprix Season 3 Hyderabad**  
> **Team Lazy ppl:** [Abdul Raheem](https://github.com/abd-RAHEEM) | [Mohammed Abdul Rafe Sajid](https://github.com/Mohammed-Abdul-Rafe-Sajid) | [Sheikh Abdullah](https://github.com/sheikhabd22) | [Akber Hussain](https://github.com/AKBER-HUSSAIN)

---

## 🌍 The Vision

Traditional energy grids are reactive and central-heavy. **AGENTGRID** reimagines energy distribution as a living, breathing digital organism. By assigning specialized, LLM-powered AI agents to different nodes of a community (Houses, EVs, Solar Farms, Batteries), the system enables real-time negotiation, peer-to-peer energy trading, and autonomous crisis management.

## 🚀 Key Innovations

### 1. Multi-Agent State Graph (Powered by LangGraph)
Instead of disjointed LLM prompts, the community is modeled as a sequential, state-mutating graph where each agent acts as a specialized node optimizing for its unique constraints:
* **☀️ Solar Agent:** Predicts immediate generation curves based on real-time weather data.
* **🔋 Battery Agent:** Evaluates current State of Charge (SoC) limits and health metrics.
* **🏠 House Agent:** Ingests household load data and categorizes appliances by critical vs. non-critical priorities.
* **🚗 EV Agent:** Calculates charging flexibility windows based on departure slack times.
* **🏢 Grid Agent:** Monitors macro-demand, dynamic utility pricing, and prevents localized blackouts.

As the state passes through the graph (`SolarAgent` → `BatteryAgent` → `HouseAgent` → `EVAgent` → `GridAgent`), each node enriches a shared community state object with domain-specific constraints before passing it to downstream layers.

### 2. Mathematical Supply-Demand Optimization
Once the state graph is fully enriched, it feeds into a centralized dispatch engine that executes algorithmic load shedding and balancing during energy shortfalls:
* **Battery Priority:** Maximizes local storage discharge before drawing expensive grid power.
* **EV Flex-Window Slack:** Dynamically defers EV charging based on a **Longest Slack First (LSF)** queuing model.
* **Algorithmic Load Shedding:** Triggers automated shedding of non-critical household loads based on user-defined priority queues to guarantee microgrid stability.

## 🎙️ Indic Language Accessibility Layer (Sarvam AI) 🏆

*Proudly awarded the **Consolation Prize under the Best Use of Sarvam track** at HackPrix Hyderabad!*

Smart-grid dashboards typically assume high English literacy and tech-savviness, creating severe adoption barriers for residential communities in India. AgentGrid breaks this barrier by wrapping the entire operating system in a multilingual voice-to-action pipeline built on **Sarvam AI's speech stack**. Residents can manage their entire microgrid naturally in **Hindi, Telugu, Urdu, and Indian English**.

                    ┌──────────────────────────────┐
                    │ LangGraph & Dispatch Engine  │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                           [System Action]

  [User Voice Command] 🗣️
          │
          ▼ (STT: saaras:v3)
  [Structured Vernacular Text]
          │
          ▼ (Translation: mayura:v1)
  [English Queries]
          │
          ▼ (Translation: mayura:v1)
  [Vernacular Action/Response]
          │
          ▼ (TTS: bulbul:v3)
  [Natural Audio Feedback] 🔊

### 🎮 Immersive 3D Digital Twin UI
AgentGrid doesn't just output charts—it provides a stunning **interactive 3D environment** that acts as your window into the ecosystem.
- **Spatial Monitoring:** Pan, zoom, and rotate around the virtual community to inspect individual nodes in real-time.
- **Live Energy Flows:** Visual pulse lines represent the active transfer of energy between houses, the solar farm, and the main grid.
- **Dynamic Scenario Visualization:** Trigger a 'Storm' or 'Heatwave' and watch the UI react with visual effects while agents scramble to preserve battery life and adapt to the crisis.

### 💬 Multilingual Conversational Advisor
Talk directly to your energy grid! Using voice or text, users can interrogate the system:
* *"Why is house 3 consuming so much power?"*
* *"Simulate a heatwave for the next 4 hours and optimize the battery."*

---

## ⚙️ Architecture & Tech Stack

<div align="center">
  <img src="https://img.shields.io/badge/Next.js-black?style=for-the-badge&logo=next.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" />
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
</div>

- **Frontend:** Next.js, React, Tailwind CSS, WebSockets for live data streaming, and dynamic rendering for the 3D digital twin.
- **Backend:** Python, FastAPI, WebSockets.
- **AI/LLMs:** Groq & Sarwam API integration for hyper-fast agent reasoning and multilingual support.

---

## 💻 Get Started Locally

### 1. Clone the repository
```bash
git clone https://github.com/abd-RAHEEM/AGENTGRID.git
cd AGENTGRID
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # On Windows
pip install -r requirements.txt

# Create a .env file and add your API keys:
# GROQ_API_KEY=your_key
# SARWAM_API_KEY=your_key

uvicorn main:app --reload
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:3000` to dive into the digital twin!

---
<div align="center">
  <p>Built with immense caffeine and 💖 by <b>Lazy ppl</b></p>
</div>
