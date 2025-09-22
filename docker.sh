#!/bin/bash

# CrewAI Studio Docker Helper Script

set -e

show_help() {
    echo "CrewAI Studio Docker Helper"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  start         Start all services (production)"
    echo "  dev           Start all services with development hot-reload"
    echo "  stop          Stop all services"
    echo "  restart       Restart all services"
    echo "  build         Build all Docker images"
    echo "  logs          Show logs from all services"
    echo "  logs-api      Show FastAPI backend logs"
    echo "  logs-web      Show Streamlit logs"
    echo "  logs-frontend Show React frontend logs"
    echo "  logs-db       Show database logs"
    echo "  clean         Remove all containers and volumes"
    echo "  status        Show running containers"
    echo "  help          Show this help message"
    echo ""
}

case "${1:-help}" in
    start)
        echo "Starting CrewAI Studio (production mode)..."
        docker-compose up -d
        echo "Services started!"
        echo "  Streamlit: http://localhost:8501"
        echo "  React UI:  http://localhost:3001"
        echo "  API Docs:  http://localhost:8000/docs"
        ;;
    dev)
        echo "Starting CrewAI Studio (development mode with hot-reload)..."
        docker-compose -f docker-compose.yaml -f docker-compose.dev.yaml up
        ;;
    stop)
        echo "Stopping CrewAI Studio..."
        docker-compose down
        ;;
    restart)
        echo "Restarting CrewAI Studio..."
        docker-compose restart
        ;;
    build)
        echo "Building all Docker images..."
        docker-compose build
        ;;
    logs)
        docker-compose logs -f
        ;;
    logs-api)
        docker-compose logs -f api
        ;;
    logs-web)
        docker-compose logs -f web
        ;;
    logs-frontend)
        docker-compose logs -f frontend
        ;;
    logs-db)
        docker-compose logs -f db
        ;;
    clean)
        echo "Removing all containers and volumes..."
        docker-compose down -v
        docker system prune -f
        ;;
    status)
        docker-compose ps
        ;;
    help)
        show_help
        ;;
    *)
        echo "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
