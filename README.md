# SimCity Solana: Three.js Clone with Ephemeral Rollups

A fully functional 3D city-building simulation game that runs on the Solana blockchain, utilizing **MagicBlock Ephemeral Rollups** for high-speed, gas-free gameplay with eventual settlement on the mainnet.

## 🏗 Architecture

The project follows a hybrid architecture where the game state is managed on a high-performance Ephemeral Rollup (ER) for real-time interaction, while the assets and final state are secured on Solana.

```mermaid
graph TD
    User[User] -->|Plays Game| Frontend[React + Three.js Frontend]
    
    subgraph "Client Side"
        Frontend -->|Simulates| GameLoop[Local Game Loop]
        GameLoop -->|Renders| ThreeJS[Three.js Renderer]
    end
    
    subgraph "Blockchain Layer"
        Frontend -->|Actions (Delegate/Commit)| MagicBlock[MagicBlock Ephemeral Rollup]
        MagicBlock -->|High Speed Tx| GameState[Game State (ER)]
        GameState -->|Settle State| SolanaMainnet[Solana Mainnet]
    end
    
    subgraph "Smart Contracts (Anchor)"
        SolanaMainnet -->|Persists| CityAccount[City Account (On-Chain)]
        CityAccount -->|Stores| TileMap[16x16 Tile Grid]
    end
```

### Components
1.  **Frontend (Web)**: Built with **React** and **Three.js**, responsible for the 3D visualization and local simulation interpolation.
2.  **Simulation Engine**: A deterministic JavaScript-based engine that runs both on the client (for prediction) and strictly on the chain/rollup (for validation).
3.  **Ephemeral Rollup (MagicBlock)**: Handles the intensive game loop transactions (`stepSimulation`, `placeBuilding`) at zero cost and millisecond latency.
4.  **Solana Mainnet**: Stores the permanent city assets and allows for "DePIN" style ownership of city states.

---

## 🎮 Game Mechanics

 The simulation runs on a **16x16 grid** where every tile represents a specific structure or zone.

### 1. The Simulation Loop
The city evolves through time steps. In each `terminate` or `stepSimulation` call:
-   **Services Update**: Power and other utilities calculate their distribution.
-   **Buildings Update**: Each zone (Residential, Commercial, Industrial) executes its logic to grow or shrink based on local conditions.

### 2. Zoning & Buildings
| Zone Type | Function | Key Mechanic |
| :--- | :--- | :--- |
| **Residential** | Houses citizens | Grows population. Requires Power and Jobs. |
| **Commercial** | Provides services/jobs | Generates economic activity. Requires Power and Residents. |
| **Industrial** | Provides jobs | Industrial production. Requires Power. |
| **Road** | Connectivity | Enables vehicles to move between zones (Vehicle Graph). |
| **Power Plant** | Generates Energy | Source of the power grid BFS traversal. |
| **Power Line** | Transmits Energy | Extends the range of power plants. |

### 3. Power Distribution Logic
Power is simulated using a **Breadth-First Search (BFS)** algorithm:
1.  The simulation identifies all **Power Plants**.
2.  It creates a "wavefront" of power starting from these plants.
3.  Power flows through **Roads**, **Power Lines**, and adjacent buildings.
4.  Each building has a `power.required` and `power.supplied`. If `supplied < required`, the building may become abandoned or stop functioning.

### 4. Vehicle System
The game maintains a `VehicleGraph` that maps connected road tiles. This allows for:
-   Visualizing traffic flow.
-   calculating effective distance between residence and jobs (commute time impact).

---

## 🛠 Tech Stack

-   **Frontend**: React 19, Vite, Three.js, TailwindCSS
-   **Blockchain Framework**: Anchor (Solana)
-   **Rollup SDK**: MagicBlock Ephemeral Rollups SDK
-   **Language**: TypeScript (Frontend), Rust (Smart Contracts)

## 🚀 Getting Started

### Prerequisites
-   Node.js (v18+)
-   Rust & Cargo
-   Solana CLI

### Installation

1.  **Clone the repository**:
    ```bash
    git clone <repo-url>
    cd sim-mage
    ```

2.  **Install Frontend Dependencies**:
    ```bash
    cd web
    npm install
    ```

3.  **Build Smart Contracts**:
    ```bash
    cd ..
    anchor build
    ```

4.  **Run Development Server**:
    ```bash
    cd web
    npm run dev
    ```

### Playing the Game
1.  Connect your Solana Wallet (Phantom, Backpack, etc.).
2.  **Delegate** your session to the Ephemeral Rollup (this creates a session key for gas-free signing).
3.  **Build** your city using the toolbar.
4.  **Simulate** to watch your city grow!
