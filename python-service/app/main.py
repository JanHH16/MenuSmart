from fastapi import FastAPI

from app.routers import health, ingredients

app = FastAPI(title="MenuSmart Python Service", version="0.1.0")

app.include_router(health.router)
app.include_router(ingredients.router)
