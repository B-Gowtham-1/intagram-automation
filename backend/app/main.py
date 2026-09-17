import logging
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from backend.app.config.settings import get_settings
from backend.app.api.health import router as health_router
from backend.app.api.images import router as images_router
from backend.app.api.jobs import router as jobs_router
from backend.app.api.accounts import router as accounts_router
from backend.app.api.auth import router as auth_router
from backend.app.database.database import engine, Base, run_migrations
import backend.app.database.models  # Ensure models are loaded

settings = get_settings()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("hermes")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting Instagram Carousel Automation Agent [{settings.APP_ENV}]")
    # Initialize SQLite tables and apply incremental column migrations
    Base.metadata.create_all(bind=engine)
    run_migrations(engine)
    logger.info("Database tables and migrations initialized successfully.")
    yield
    logger.info("Shutting down Instagram Carousel Automation Agent")


app = FastAPI(
    title="Instagram Carousel Automation Agent",
    description="Hermes orchestration API for Instagram Business Carousel publishing",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(health_router)
app.include_router(images_router)
app.include_router(jobs_router)
app.include_router(accounts_router)
app.include_router(auth_router)


# Mount built frontend if dist exists (enables all-in-one deployment on Render)
dist_dir = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if dist_dir.exists():
    app.mount("/", StaticFiles(directory=str(dist_dir), html=True), name="frontend")
else:
    @app.get("/")
    def root():
        return {
            "app": "Instagram Carousel Automation Agent",
            "docs": "/docs",
            "health": "/api/health"
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.app.main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=not settings.is_production
    )
