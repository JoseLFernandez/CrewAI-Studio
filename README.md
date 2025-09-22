# CrewAI Studio

Welcome to CrewAI Studio! This application provides a user-friendly interface written in Streamlit for interacting with CrewAI, suitable even for those who don't want to write any code. Follow the steps below to install and run the application using Docker/docker-compose or Conda/venv.

## Features

- **Multi-platform support**: Works on Windows, Linux and MacOS.
- **No coding required**: User-friendly interface for interacting with CrewAI.
- **Conda and virtual environment support**: Choose between Conda and a Python virtual environment for installation.
- **Results history**: You can view previous results.
- **Knowledge sources**: You can add knowledge sources for your crews
- **CrewAI tools** You can use crewai tools to interact with real world. ~~Crewai studio uses a forked version of crewai-tools with some bugfixes and enhancements (https://github.com/strnad/crewAI-tools)~~ (bugfixes already merged to crewai-tools)
- **Custom Tools** Custom tools for calling APIs, writing files, enhanced code interpreter, enhanced web scraper... More will be added soon
- **LLM providers supported**: Currently OpenAI, Groq, Anthropic, ollama, Grok and LM Studio backends are supported. OpenAI key is probably still needed for embeddings in many tools. Don't forget to load an embedding model when using LM Studio.
- **Single Page app export**: Feature to export crew as simple single page streamlit app.
- **Threaded crew run**: Crews can run in background and can be stopped.

## Support CrewAI Studio

Your support helps fund the development and growth of our project. Every contribution is greatly appreciated!

### Donate with Bitcoin
[![Donate with Bitcoin](https://www.blockonomics.co/img/pay_with_bitcoin_medium.png)](https://pay-link.s3.us-west-2.amazonaws.com/index.html?uid=b14b42846ecd40fe)

### Sponsor via GitHub
[![Sponsor on GitHub](https://img.shields.io/badge/Sponsor-GitHub-ff69b4?style=for-the-badge&logo=github)](https://github.com/sponsors/strnad)


## Screenshots

<img src="https://raw.githubusercontent.com/strnad/CrewAI-Studio/main/img/ss1.png" alt="crews definition" style="width:50%;"/><img src="https://raw.githubusercontent.com/strnad/CrewAI-Studio/main/img/ss2.png" alt="kickoff" style="width:50%;"/>
<img src="https://raw.githubusercontent.com/strnad/CrewAI-Studio/main/img/ss3.png" alt="kickoff" style="width:50%;"/><img src="https://raw.githubusercontent.com/strnad/CrewAI-Studio/main/img/ss4.png" alt="kickoff" style="width:50%;"/>
<img src="https://raw.githubusercontent.com/strnad/CrewAI-Studio/main/img/ss5.png" alt="kickoff" style="width:50%;"/><img src="https://raw.githubusercontent.com/strnad/CrewAI-Studio/main/img/ss6.png" alt="kickoff" style="width:50%;"/>

## Installation

### Using Virtual Environment

**For Virtual Environment**: Ensure you have Python installed. If you dont have python instaled, you can simply use the conda installer.

#### On Linux or MacOS

1. **Clone the repository (or use downloaded ZIP file)**:

   ```bash
   git clone https://github.com/strnad/CrewAI-Studio.git
   cd CrewAI-Studio
   ```

2. **Run the installation script**:

   ```bash
   ./install_venv.sh
   ```

3. **Run the application**:
   ```bash
   ./run_venv.sh
   ```

#### On Windows

1. **Clone the repository (or use downloaded ZIP file)**:

   ```powershell
   git clone https://github.com/strnad/CrewAI-Studio.git
   cd CrewAI-Studio
   ```

2. **Run the Conda installation script**:

   ```powershell
   ./install_venv.bat
   ```

3. **Run the application**:
   ```powershell
   ./run_venv.bat
   ```

### Using Conda

Conda will be installed locally in the project folder. No need for a pre-existing Conda installation.

#### On Linux

1. **Clone the repository (or use downloaded ZIP file)**:

   ```bash
   git clone https://github.com/strnad/CrewAI-Studio.git
   cd CrewAI-Studio
   ```

2. **Run the Conda installation script**:

   ```bash
   ./install_conda.sh
   ```

3. **Run the application**:
   ```bash
   ./run_conda.sh
   ```

#### On Windows

1. **Clone the repository (or use downloaded ZIP file)**:

   ```powershell
   git clone https://github.com/strnad/CrewAI-Studio.git
   cd CrewAI-Studio
   ```

2. **Run the Conda installation script**:

   ```powershell
   ./install_conda.bat
   ```

3. **Run the application**:
   ```powershell
   ./run_conda.bat
   ```

### One-Click Deployment

[![Deploy to RepoCloud](https://d16t0pc4846x52.cloudfront.net/deploylobe.svg)](https://repocloud.io/details/?app_id=318)

## Running with Docker Compose

CrewAI Studio now includes a complete multi-service architecture with:
- **Streamlit App** (Traditional interface) - Port 8501
- **FastAPI Backend** (REST APIs for agents/tasks/crews) - Port 8000  
- **React Frontend** (Modern interface) - Port 3000
- **PostgreSQL Database** - Port 5432

To quickly set up and run CrewAI-Studio using Docker Compose, follow these steps:

### Prerequisites

- Ensure [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) are installed on your system.

### Steps

1. Clone the repository:
```
git clone https://github.com/strnad/CrewAI-Studio.git
cd CrewAI-Studio
```

2. Create a .env file for configuration.  Edit for your own configuration:
```
cp .env_example .env
```

3. Start the application with Docker Compose:
```
docker-compose up --build
```

4. Access the applications:
   - **Streamlit Interface**: http://localhost:8501 (Traditional interface)
   - **React Interface**: http://localhost:3001 (Modern interface with agents/tasks management)
   - **FastAPI Backend**: http://localhost:8000 (REST API endpoints)
   - **API Documentation**: http://localhost:8000/docs (Swagger UI)

### Service Architecture

The Docker setup includes these services:

- **`web`**: Streamlit application (existing interface)
- **`api`**: FastAPI backend with REST endpoints for:
  - `/crews` - Crew management  
  - `/agents` - Agent management
  - `/tasks` - Task management
  - `/flows` - Flow management
- **`frontend`**: React/Next.js application with modern UI
- **`db`**: PostgreSQL database (shared by all services)

### Environment Variables

You can customize ports and other settings using environment variables:

```bash
# Port configuration
WEB_PORT=8501          # Streamlit app port
API_PORT=8000          # FastAPI backend port  
FRONTEND_PORT=3001     # React frontend port

# API configuration
NEXT_PUBLIC_API_URL=http://localhost:8000  # Backend URL for frontend
```

### Quick Start with Docker Helper Script

A convenient helper script is provided to manage the Docker services:

```bash
# Make the script executable (first time only)
chmod +x docker.sh

# Start all services in production mode
./docker.sh start

# Start with development hot-reload
./docker.sh dev

# View logs from all services  
./docker.sh logs

# Stop all services
./docker.sh stop

# See all available commands
./docker.sh help
```

### Development Mode

For development with hot-reload capabilities:

```bash
# Start with development configuration
docker-compose -f docker-compose.yaml -f docker-compose.dev.yaml up

# Or use the helper script
./docker.sh dev
```

This enables:
- FastAPI auto-reload on code changes
- React hot module replacement  
- Streamlit auto-refresh on file changes

### Individual Service Management

You can also run individual services:

```bash
# Start only the database and API
docker-compose up db api

# Start only Streamlit and database  
docker-compose up db web

# View logs for specific service
docker-compose logs -f api
```

## Configuration

Before running the application, ensure you update the `.env` file with your API keys and other necessary configurations. An example `.env` file is provided for reference.

Set `NEXT_PUBLIC_API_URL` to the base URL of your backend (for example, `http://localhost:8000` during development) so the frontend can communicate with the FastAPI service.

## Adding Custom Nodes

The backend exposes a registry of available nodes in `backend/nodes.py`. Each node entry defines a label, a JSON schema describing its configuration, and an icon. To add your own component:

1. Open `backend/nodes.py`.
2. Use the `register_node` helper to register a new node type:

   ```python
   from backend.nodes import register_node

   register_node(
       "my_node",
       label="My Node",
       schema={"type": "object", "properties": {}},
       icon="✨",
   )
   ```

3. Restart the backend. The frontend fetches `/nodes` and will automatically display the new node in the palette.

This allows developers to extend the editor without modifying the frontend.

## Troubleshooting
In case of problems:
- Delete the `venv/miniconda` folder and reinstall `crewai-studio`.
- Rename `crewai.db` (it contains your crews but sometimes new versions can break compatibility).
- Raise an issue and I will help you.

## Video tutorial
Video tutorial on CrewAI Studio made by Josh Poco

[![FREE CrewAI Studio GUI EASY AI Agent Creation!🤖 Open Source AI Agent Orchestration Self Hosted](https://img.youtube.com/vi/3Uxdggt88pY/hqdefault.jpg)](https://www.youtube.com/watch?v=3Uxdggt88pY)

## Star History

<a href="https://star-history.com/#strnad/CrewAI-Studio&Date">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=strnad/CrewAI-Studio&type=Date&theme=dark" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=strnad/CrewAI-Studio&type=Date" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=strnad/CrewAI-Studio&type=Date" />
 </picture>   
</a>
