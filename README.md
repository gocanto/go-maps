# Interactive Go Map Visualizer

![Vue.js](https://img.shields.io/badge/Vue.js-3.x-4FC08D?style=flat-square&logo=vue.js)
![Vite](https://img.shields.io/badge/Vite-Build-646CFF?style=flat-square&logo=vite)

An interactive educational tool built with **Vue.js** and **Vite** that simulates the internal mechanics of the Go (Golang) `map` data structure.

This project aims to demystify the "black box" of Go maps by visualising memory layout, bucket allocation, hashing strategies, and collision resolution in real-time.

![Project Screenshot](https://github.com/user-attachments/assets/32dc36c2-602d-4874-88d1-97a5d650b38f)

## 📖 About The Project

In Go, maps are efficient and easy to use, but their internal implementation is a sophisticated engineering feat. This application simulates the **Go Runtime** logic to demonstrate:

* **The `hmap` Header:** How metadata like `count` and `B` (log buckets) manage the structure.
* **Bucket Architecture:** Visualizing fixed-size buckets that hold 8 key/value pairs.
* **Smart Hashing:** How the hash is split into High-Order Bits (Tophash) and Low-Order Bits (Bucket Index).
* **Memory Optimization:** How keys and values are packed separately (`keys[8]`, `values[8]`) to eliminate padding.
* **Overflow Chaining:** How the map handles collisions by linking to overflow buckets.

## ✨ Features

* **Interactive Insertion:** Add random or specific keys to see how they are hashed and placed.
* **Visual Hashing:** Watch the binary split of the hash between **LOB** (Bucket selection) and **HOB** (Tophash).
* **Memory X-Ray:** Click on any bucket to inspect its internal memory layout (Tophash arrays vs Key arrays).
* **Overflow Simulation:** Force keys into specific buckets to visualize linked-list chaining.
* **Growth Trigger:** Simulate "Evacuation" by forcing the map to resize when the load factor exceeds 6.5.

## 🛠️ Tech Stack

* **Framework:** [Vue 3](https://vuejs.org/) (Composition API)
* **Build Tool:** [Vite](https://vitejs.dev/)
* **Styling:** CSS3 (Grid/Flexbox)

## 🚀 Getting Started

Follow these steps to get a local copy up and running.

### Prerequisites

* Node.js (v16.0 or higher)
* npm or yarn

### Installation

1.  **Clone the repository**
    ```bash
    git clone [https://github.com/your-username/go-map-visualizer.git](https://github.com/your-username/go-map-visualizer.git)
    cd go-map-visualizer
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Start the development server**
    ```bash
    npm run dev
    ```

4.  **Open your browser**
    Navigate to the Local URL provided in the terminal (usually `http://localhost:5173`).

## 🧠 Concepts Covered

### 1. The Bucket Structure
Unlike generic hash maps, Go uses buckets. Each bucket is a fixed-size memory block holding exactly **8 key/value pairs**.

### 2. Memory Layout
Inside a bucket, data is packed as `[8 Tophashes] + [8 Keys] + [8 Values]`. This structure eliminates padding bytes between keys and values, optimizing CPU cache locality.

### 3. Collision Resolution
Go uses **Chaining**. If a bucket fills up (8 items), it allocates a new "overflow bucket" and links to it, creating a linked list of blocks rather than individual nodes.

### 4. Growth & Evacuation
The map grows when the average **Load Factor exceeds 6.5**. It allocates a double-sized array and incrementally "evacuates" data from old buckets to new ones to prevent latency spikes.

## Contributing

Please, feel free to fork this repository to contribute to it by submitting a functionalities/bugs-fixes pull request to enhance it.


## How can I thank you?

There are many ways you can support my open source work. There is no correct answer, so the choice is yours.

Nevertheless :grinning:, I would propose the following.

- :arrow_up: Follow me on [Twitter](https://twitter.com/gocanto).
- :star: Star the repository.
- :handshake: Open a pull request to fix/improve the codebase.
- :writing_hand: Open a pull request to improve the documentation.
- :coffee: Buy me a [coffee](https://github.com/sponsors/gocanto)?

> Thank you for reading this far. :blush:
